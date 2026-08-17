/**
 * 대국 진행 — 착수 기록, 패/동형반복, 접바둑, 계가 종료까지.
 * Board가 "한 수의 규칙"을 담당하고, Game은 "한 판의 규칙"을 담당한다.
 */

import { Board, BLACK, WHITE, EMPTY, opposite, toLabel, fromLabel, starPoints } from './board.js';

export const PASS = -1;
export const RESIGN = -2;

/** 접바둑 배석 순서(19로 기준 관습). */
export function handicapPoints(size = 19, count = 0) {
  if (count < 2) return [];
  const stars = starPoints(size);
  if (size !== 19) return stars.slice(0, count);
  const idx = (label) => fromLabel(label, size);
  const corners = [idx('D4'), idx('Q16'), idx('Q4'), idx('D16')];
  const sides = [idx('D10'), idx('Q10'), idx('K4'), idx('K16')];
  const center = idx('K10');
  const order = {
    2: [corners[0], corners[1]],
    3: [corners[0], corners[1], corners[2]],
    4: corners.slice(),
    5: [...corners, center],
    6: [...corners, sides[0], sides[1]],
    7: [...corners, sides[0], sides[1], center],
    8: [...corners, ...sides],
    9: [...corners, ...sides, center],
  };
  return order[Math.min(9, count)] || [];
}

export class Game {
  /**
   * @param {object} opts
   *  size, komi, handicap, rules('area'|'territory'), superko(boolean), setupBoard
   */
  constructor(opts = {}) {
    this.size = opts.size || 19;
    this.rules = opts.rules || 'territory'; // 한국·일본식 집계가가 기본
    this.superko = opts.superko !== false;
    this.handicap = opts.handicap || 0;
    this.board = opts.setupBoard ? opts.setupBoard : new Board(this.size);
    this.moves = [];           // {color, idx, captured:[], label, comment?}
    this.positions = new Set(); // 동형반복 검사용 위치 해시
    this.turn = BLACK;
    this.passes = 0;
    this.finished = false;
    this.result = null;
    this.resignedBy = null;

    if (this.handicap >= 2) {
      for (const p of handicapPoints(this.size, this.handicap)) this.board.place(BLACK, p);
      this.turn = WHITE;
    }
    this.komi = opts.komi != null ? opts.komi : (this.handicap >= 2 ? 0.5 : 6.5);
    this.positions.add(this.board.hash());
  }

  get moveNumber() { return this.moves.length; }

  /** 지금 이 자리에 둘 수 있는가(패·자살수·동형반복 포함). */
  check(idx, color = this.turn) {
    if (this.finished) return { ok: false, reason: 'finished', message: '이미 끝난 대국입니다.' };
    const chk = this.board.check(color, idx);
    if (!chk.ok) return chk;
    if (this.superko) {
      const probe = this.board.clone();
      probe.play(color, idx);
      if (this.positions.has(probe.hash())) {
        return {
          ok: false,
          reason: 'superko',
          message: '동형반복 — 이전과 똑같은 반면이 됩니다(장생·삼패 등을 막는 규칙).',
        };
      }
    }
    return chk;
  }

  /** 착수. idx가 PASS면 한 수 쉼, RESIGN이면 항복. */
  play(idx, color = this.turn) {
    if (this.finished) return { ok: false, reason: 'finished', message: '이미 끝난 대국입니다.' };
    if (idx === RESIGN) {
      this.finished = true;
      this.resignedBy = color;
      this.result = { winner: opposite(color), by: 'resign', text: `${color === BLACK ? '백' : '흑'} 불계승` };
      this.moves.push({ color, idx: RESIGN, label: 'resign', captured: [] });
      return { ok: true, resign: true };
    }
    if (idx === PASS) {
      this.moves.push({ color, idx: PASS, label: 'pass', captured: [] });
      this.passes += 1;
      this.board.ko = -1;
      this.turn = opposite(color);
      if (this.passes >= 2) this.finished = true;
      return { ok: true, pass: true, bothPassed: this.passes >= 2 };
    }
    const chk = this.check(idx, color);
    if (!chk.ok) return chk;
    const res = this.board.play(color, idx);
    if (!res.ok) return res;
    this.moves.push({
      color,
      idx,
      label: toLabel(idx, this.size),
      captured: res.captured.slice(),
      prevKo: this._prevKo,
    });
    this._prevKo = res.ko;
    this.positions.add(this.board.hash());
    this.passes = 0;
    this.turn = opposite(color);
    return { ok: true, captured: res.captured };
  }

  /** 한 수 물림. 기보를 처음부터 다시 재생하는 방식이라 패·동형반복 상태까지 정확히 되돌아간다. */
  undo() {
    if (this.moves.length === 0) return false;
    const history = this.moves.slice(0, -1);
    this._reset();
    for (const m of history) this.play(m.idx, m.color);
    return true;
  }

  _reset() {
    const komi = this.komi;
    this.board = new Board(this.size);
    this.moves = [];
    this.positions = new Set();
    this.turn = BLACK;
    this.passes = 0;
    this.finished = false;
    this.result = null;
    this.resignedBy = null;
    if (this.handicap >= 2) {
      for (const p of handicapPoints(this.size, this.handicap)) this.board.place(BLACK, p);
      this.turn = WHITE;
    }
    this.komi = komi;
    this.positions.add(this.board.hash());
  }

  /** n수까지 진행된 반면을 만들어 돌려준다(복기 재생용). */
  boardAt(n) {
    const g = new Game({ size: this.size, komi: this.komi, handicap: this.handicap, rules: this.rules, superko: this.superko });
    for (let i = 0; i < Math.min(n, this.moves.length); i++) {
      const m = this.moves[i];
      if (m.idx === RESIGN) break;
      g.play(m.idx, m.color);
    }
    return g.board;
  }

  legalMoves(color = this.turn) {
    const out = [];
    for (let i = 0; i < this.board.length; i++) {
      if (this.board.cells[i] !== EMPTY) continue;
      if (this.check(i, color).ok) out.push(i);
    }
    return out;
  }

  /** 표준 SGF로 내보낸다. 다른 바둑 프로그램에서 기보를 열어볼 수 있어야 한다. */
  toSGF(info = {}) {
    const sgfCoord = (idx) => {
      const x = idx % this.size;
      const y = (idx / this.size) | 0;
      return String.fromCharCode(97 + x) + String.fromCharCode(97 + y);
    };
    let out = `(;GM[1]FF[4]CA[UTF-8]SZ[${this.size}]KM[${this.komi}]`;
    if (this.handicap >= 2) {
      out += `HA[${this.handicap}]AB${handicapPoints(this.size, this.handicap).map((p) => `[${sgfCoord(p)}]`).join('')}`;
    }
    if (info.playerBlack) out += `PB[${info.playerBlack}]`;
    if (info.playerWhite) out += `PW[${info.playerWhite}]`;
    if (this.result) out += `RE[${this.result.sgf || ''}]`;
    for (const m of this.moves) {
      if (m.idx === RESIGN) continue;
      const tag = m.color === BLACK ? 'B' : 'W';
      out += `;${tag}[${m.idx === PASS ? '' : sgfCoord(m.idx)}]`;
    }
    return out + ')';
  }
}
