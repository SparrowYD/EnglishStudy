/**
 * 바둑 규칙 엔진 — 반면(盤面) 표현과 착수 규칙.
 *
 * PRIORITY 1. 이 파일은 UI/AI와 완전히 분리되어 있으며 node --test 로 단독 검증된다.
 * 좌표는 idx = y * size + x (x: 왼→오, y: 위→아래) 하나로 통일한다.
 */

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export const COLOR_NAME = { [BLACK]: '흑', [WHITE]: '백' };

export function opposite(color) {
  return color === BLACK ? WHITE : color === WHITE ? BLACK : EMPTY;
}

/** 바둑 관습상 I 열은 쓰지 않는다. */
export const COLUMNS = 'ABCDEFGHJKLMNOPQRST';

const neighborCache = new Map();

/** size별 인접점 표를 한 번만 만들어 재사용한다(착수마다 재계산하지 않기 위함). */
export function neighborTable(size) {
  const cached = neighborCache.get(size);
  if (cached) return cached;
  const table = new Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = (i / size) | 0;
    const list = [];
    if (y > 0) list.push(i - size);
    if (x > 0) list.push(i - 1);
    if (x < size - 1) list.push(i + 1);
    if (y < size - 1) list.push(i + size);
    table[i] = list;
  }
  neighborCache.set(size, table);
  return table;
}

const diagonalCache = new Map();

export function diagonalTable(size) {
  const cached = diagonalCache.get(size);
  if (cached) return cached;
  const table = new Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = (i / size) | 0;
    const list = [];
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size) list.push(ny * size + nx);
    }
    table[i] = list;
  }
  diagonalCache.set(size, table);
  return table;
}

/** 재현 가능한 난수(고정 시드) — 조브리스트 해시가 실행마다 달라지면 기보 재생이 깨진다. */
function xorshift(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s >>> 0;
  };
}

const zobristCache = new Map();

function zobristTable(size) {
  const cached = zobristCache.get(size);
  if (cached) return cached;
  const rng = xorshift(0x9e3779b9 ^ size);
  const n = size * size;
  const table = { a: [new Uint32Array(n), new Uint32Array(n)], b: [new Uint32Array(n), new Uint32Array(n)] };
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < n; i++) {
      table.a[c][i] = rng();
      table.b[c][i] = rng();
    }
  }
  zobristCache.set(size, table);
  return table;
}

export class Board {
  constructor(size = 19) {
    this.size = size;
    this.length = size * size;
    this.cells = new Int8Array(this.length);
    /** 단수패(單手劫) 금지점. 없으면 -1. */
    this.ko = -1;
    /** prisoners[c] = c가 잡아낸 상대 돌 수 */
    this.prisoners = [0, 0, 0];
    this._nb = neighborTable(size);
    this._diag = diagonalTable(size);
    this._z = zobristTable(size);
    this._h1 = 0;
    this._h2 = 0;
    this._mark = new Int32Array(this.length);
    this._gen = 0;
    this._stack = new Int32Array(this.length);
  }

  clone() {
    const b = new Board(this.size);
    b.cells.set(this.cells);
    b.ko = this.ko;
    b.prisoners = this.prisoners.slice();
    b._h1 = this._h1;
    b._h2 = this._h2;
    return b;
  }

  idx(x, y) { return y * this.size + x; }
  x(idx) { return idx % this.size; }
  y(idx) { return (idx / this.size) | 0; }
  get(idx) { return this.cells[idx]; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
  neighbors(idx) { return this._nb[idx]; }
  diagonals(idx) { return this._diag[idx]; }

  /** 위치 해시(착수 순서와 무관, 반면만 반영) — 동형반복(수퍼코) 판정용. */
  hash() { return `${this._h1}:${this._h2}`; }

  /** 돌을 직접 놓거나 지운다. 규칙 검사를 하지 않는 저수준 연산. */
  setStone(idx, color) {
    const prev = this.cells[idx];
    if (prev === color) return;
    if (prev !== EMPTY) {
      this._h1 = (this._h1 ^ this._z.a[prev - 1][idx]) >>> 0;
      this._h2 = (this._h2 ^ this._z.b[prev - 1][idx]) >>> 0;
    }
    this.cells[idx] = color;
    if (color !== EMPTY) {
      this._h1 = (this._h1 ^ this._z.a[color - 1][idx]) >>> 0;
      this._h2 = (this._h2 ^ this._z.b[color - 1][idx]) >>> 0;
    }
  }

  /**
   * idx가 속한 연결된 돌 무리(群)와 그 활로를 모두 찾는다.
   * 바둑에서 "돌을 잡는다"는 판정은 전부 이 함수 위에 서 있다.
   */
  group(idx) {
    const color = this.cells[idx];
    if (color === EMPTY) return null;
    const stones = [];
    const liberties = [];
    const mark = this._mark;
    const gen = ++this._gen;
    const stack = this._stack;
    let top = 0;
    stack[top++] = idx;
    mark[idx] = gen;
    while (top > 0) {
      const cur = stack[--top];
      stones.push(cur);
      for (const nb of this._nb[cur]) {
        if (mark[nb] === gen) continue;
        const v = this.cells[nb];
        if (v === EMPTY) {
          mark[nb] = gen;
          liberties.push(nb);
        } else if (v === color) {
          mark[nb] = gen;
          stack[top++] = nb;
        }
      }
    }
    return { color, stones, liberties };
  }

  /** 활로 개수만 필요할 때(탐색 내부 루프에서 배열 생성을 피한다). */
  libertyCount(idx) {
    const g = this.group(idx);
    return g ? g.liberties.length : 0;
  }

  /** 해당 점이 비어 있고 사방이 color(또는 반상 밖)로 둘러싸였는지 — "눈처럼 보이는 점". */
  isSurrounded(idx, color) {
    if (this.cells[idx] !== EMPTY) return false;
    for (const nb of this._nb[idx]) {
      if (this.cells[nb] !== color) return false;
    }
    return true;
  }

  /**
   * 착수 가능 여부. 반칙 사유를 문자열로 돌려주므로 UI가 "왜 안 되는지" 설명할 수 있다.
   * @returns {{ok:boolean, reason?:string, message?:string, captures?:number[]}}
   */
  check(color, idx) {
    if (idx < 0 || idx >= this.length) {
      return { ok: false, reason: 'out', message: '반상 밖입니다.' };
    }
    if (this.cells[idx] !== EMPTY) {
      return { ok: false, reason: 'occupied', message: '이미 돌이 놓인 자리입니다.' };
    }
    if (idx === this.ko) {
      return { ok: false, reason: 'ko', message: '패 — 방금 딴 자리는 바로 되따낼 수 없습니다. 다른 곳을 먼저 두세요(팻감).' };
    }
    const enemy = opposite(color);
    // 임시로 놓아보고 판정한다(clone 대신 되돌리기로 비용을 줄인다).
    this.cells[idx] = color;
    const captures = [];
    const seen = new Set();
    for (const nb of this._nb[idx]) {
      if (this.cells[nb] !== enemy || seen.has(nb)) continue;
      const g = this.group(nb);
      for (const s of g.stones) seen.add(s);
      if (g.liberties.length === 0) captures.push(...g.stones);
    }
    let ownLiberties = 0;
    if (captures.length === 0) {
      ownLiberties = this.group(idx).liberties.length;
    }
    this.cells[idx] = EMPTY;
    if (captures.length === 0 && ownLiberties === 0) {
      return {
        ok: false,
        reason: 'suicide',
        message: '자살수 — 놓는 순간 활로가 0이 되는 자리에는 둘 수 없습니다.',
      };
    }
    return { ok: true, captures };
  }

  /**
   * 실제 착수. 규칙 위반이면 반면을 바꾸지 않고 실패를 돌려준다.
   * @returns {{ok:boolean, reason?:string, message?:string, captured?:number[], ko?:number}}
   */
  play(color, idx) {
    const chk = this.check(color, idx);
    if (!chk.ok) return chk;
    this.setStone(idx, color);
    for (const s of chk.captures) this.setStone(s, EMPTY);
    this.prisoners[color] += chk.captures.length;

    // 단수패: 딱 한 점을 따냈고, 그 결과 내 돌도 한 점이며 활로가 하나뿐일 때만 패가 성립한다.
    let ko = -1;
    if (chk.captures.length === 1) {
      const g = this.group(idx);
      if (g.stones.length === 1 && g.liberties.length === 1) ko = chk.captures[0];
    }
    this.ko = ko;
    return { ok: true, captured: chk.captures, ko };
  }

  /** 규칙 검사 없이 배치(문제 세팅/접바둑 배석용). */
  place(color, idx) { this.setStone(idx, color); }

  /** 반면을 사람이 읽을 수 있는 형태로. 테스트 실패 메시지에서 유용하다. */
  toString() {
    const rows = [];
    for (let y = 0; y < this.size; y++) {
      let row = '';
      for (let x = 0; x < this.size; x++) {
        const v = this.cells[y * this.size + x];
        row += v === BLACK ? 'X' : v === WHITE ? 'O' : '.';
      }
      rows.push(row);
    }
    return rows.join('\n');
  }

  stoneCount(color) {
    let n = 0;
    for (let i = 0; i < this.length; i++) if (this.cells[i] === color) n++;
    return n;
  }
}

/* ------------------------------------------------------------------ *
 * 좌표 변환
 * ------------------------------------------------------------------ */

/** idx → 'D4' 형태의 표기. 세로는 아래에서 위로 1..size. */
export function toLabel(idx, size = 19) {
  const x = idx % size;
  const y = (idx / size) | 0;
  return COLUMNS[x] + (size - y);
}

/** 'D4' → idx. 잘못된 표기는 -1. */
export function fromLabel(label, size = 19) {
  if (typeof label !== 'string' || label.length < 2) return -1;
  const col = COLUMNS.indexOf(label[0].toUpperCase());
  const row = parseInt(label.slice(1), 10);
  if (col < 0 || col >= size || !Number.isFinite(row) || row < 1 || row > size) return -1;
  return (size - row) * size + col;
}

export function labelsToIndices(labels, size = 19) {
  return (labels || []).map((l) => fromLabel(l, size)).filter((i) => i >= 0);
}

/**
 * 문제 세팅 도우미.
 *   setup({ size:19, black:['D4'], white:['Q16'] })
 * 또는 귀·변 사활처럼 그림으로 적는 편이 편할 때:
 *   setup({ size:19, anchor:'A19', diagram:['XXO..', '.XO..'] })
 *   ('X' 흑, 'O' 백, '.' 빈점, ' '·'-' 무시)
 */
export function setup(spec = {}) {
  const size = spec.size || 19;
  const board = new Board(size);
  for (const l of spec.black || []) {
    const i = fromLabel(l, size);
    if (i >= 0) board.place(BLACK, i);
  }
  for (const l of spec.white || []) {
    const i = fromLabel(l, size);
    if (i >= 0) board.place(WHITE, i);
  }
  if (spec.diagram) {
    const anchor = fromLabel(spec.anchor || `A${size}`, size);
    const ax = anchor % size;
    const ay = (anchor / size) | 0;
    spec.diagram.forEach((line, dy) => {
      const cleaned = line.replace(/[ \t]/g, '');
      for (let dx = 0; dx < cleaned.length; dx++) {
        const ch = cleaned[dx];
        const x = ax + dx;
        const y = ay + dy;
        if (!board.inBounds(x, y)) continue;
        if (ch === 'X' || ch === 'x') board.place(BLACK, board.idx(x, y));
        else if (ch === 'O' || ch === 'o') board.place(WHITE, board.idx(x, y));
      }
    });
  }
  return board;
}

/** 화점 좌표 (19로에서 9개). 접바둑 배석과 반면 그리기에 함께 쓴다. */
export function starPoints(size = 19) {
  if (size < 7) return [];
  const edge = size >= 13 ? 3 : 2;
  const mid = (size - 1) / 2;
  const lines = size % 2 === 1 ? [edge, mid, size - 1 - edge] : [edge, size - 1 - edge];
  const pts = [];
  for (const y of lines) for (const x of lines) pts.push(y * size + x);
  return pts;
}
