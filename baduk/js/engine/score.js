/**
 * 계가 — 집 계산과 사석 판정.
 *
 * 두 가지 규칙 체계를 모두 지원한다(요구사항 67: 규칙에 따라 결과가 달라질 수 있음을 명시).
 *  - 'territory' (한국·일본식): 집 + 잡은 돌
 *  - 'area'      (중국식):      집 + 반상의 내 돌
 *
 * 죽은 돌 판정은 자동 추정 + 사용자 수정을 함께 쓴다.
 * 자동 추정의 근거는 Benson의 "무조건 사는 돌(pass-alive)" 정리다.
 */

import { BLACK, WHITE, EMPTY, opposite } from './board.js';

/**
 * Benson's algorithm — 상대가 몇 수를 두어도 절대 잡히지 않는 돌(무조건 삶)을 구한다.
 * 여기에 해당하면 확실히 살아 있고, 여기에 해당하지 않는다고 반드시 죽은 것은 아니다.
 * @returns {Set<number>} 무조건 사는 돌들의 좌표 집합
 */
export function bensonPassAlive(board, color) {
  const chains = [];
  const chainOf = new Int32Array(board.length).fill(-1);
  for (let i = 0; i < board.length; i++) {
    if (board.cells[i] !== color || chainOf[i] >= 0) continue;
    const g = board.group(i);
    const id = chains.length;
    for (const s of g.stones) chainOf[s] = id;
    chains.push({ id, stones: g.stones, liberties: new Set(g.liberties), regions: new Set(), alive: true });
  }
  if (chains.length === 0) return new Set();

  // "작은 영역": color의 돌이 아닌 점들의 연결 성분
  const regions = [];
  const regionOf = new Int32Array(board.length).fill(-1);
  for (let i = 0; i < board.length; i++) {
    if (board.cells[i] === color || regionOf[i] >= 0) continue;
    const id = regions.length;
    const points = [];
    const empties = [];
    const borders = new Set();
    const stack = [i];
    regionOf[i] = id;
    while (stack.length) {
      const cur = stack.pop();
      points.push(cur);
      if (board.cells[cur] === EMPTY) empties.push(cur);
      for (const nb of board.neighbors(cur)) {
        if (board.cells[nb] === color) { borders.add(chainOf[nb]); continue; }
        if (regionOf[nb] >= 0) continue;
        regionOf[nb] = id;
        stack.push(nb);
      }
    }
    regions.push({ id, points, empties, borders, alive: true });
  }

  // 영역 R이 사슬 X에 "필수적(vital)"이다 = R의 모든 빈 점이 X의 활로다
  const vital = new Map(); // chainId -> Set(regionId)
  for (const c of chains) vital.set(c.id, new Set());
  for (const r of regions) {
    if (r.empties.length === 0) continue;
    for (const cid of r.borders) {
      const chain = chains[cid];
      let isVital = true;
      for (const e of r.empties) {
        if (!chain.liberties.has(e)) { isVital = false; break; }
      }
      if (isVital) vital.get(cid).add(r.id);
    }
  }

  // 필수 영역이 2개 미만인 사슬을 제거하고, 제거된 사슬과 접한 영역도 제거 — 변화가 없을 때까지 반복
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of chains) {
      if (!c.alive) continue;
      let count = 0;
      for (const rid of vital.get(c.id)) if (regions[rid].alive) count++;
      if (count < 2) { c.alive = false; changed = true; }
    }
    for (const r of regions) {
      if (!r.alive) continue;
      for (const cid of r.borders) {
        if (!chains[cid].alive) { r.alive = false; changed = true; break; }
      }
    }
  }

  const out = new Set();
  for (const c of chains) if (c.alive) for (const s of c.stones) out.add(s);
  return out;
}

/**
 * 죽은 돌 자동 추정.
 * 상대의 무조건 사는 영역 안에 완전히 갇혀 있고, 자신은 무조건 살지 못하며,
 * 두 눈을 낼 공간도 없는 무리를 죽은 것으로 본다.
 * 애매한 형태는 사용자가 계가 화면에서 직접 뒤집을 수 있다(그것이 정직한 처리다).
 * @returns {Set<number>} 죽은 것으로 추정되는 돌 좌표
 */
export function estimateDeadStones(board) {
  const dead = new Set();
  const passAlive = {
    [BLACK]: bensonPassAlive(board, BLACK),
    [WHITE]: bensonPassAlive(board, WHITE),
  };
  const seen = new Set();
  for (let i = 0; i < board.length; i++) {
    const color = board.cells[i];
    if (color === EMPTY || seen.has(i)) continue;
    const g = board.group(i);
    for (const s of g.stones) seen.add(s);
    if (passAlive[color].has(i)) continue;

    // 이 무리가 상대 돌로만 둘러싸여 있는가(밖으로 나갈 길이 없는가)
    const enclosure = enclosingColor(board, g);
    if (enclosure !== opposite(color)) continue;

    // 둘러싼 상대 돌이 확실히 살아 있는지 — 그렇지 않으면 수상전이므로 판단을 보류한다
    let enclosureAlive = true;
    for (const s of g.stones) {
      for (const nb of board.neighbors(s)) {
        if (board.cells[nb] === opposite(color) && !passAlive[opposite(color)].has(nb)) enclosureAlive = false;
      }
    }
    if (!enclosureAlive) continue;

    // 갇힌 공간(자기 무리 + 인접 빈 점들)이 두 눈을 낼 만큼 넓은가
    const space = enclosedSpace(board, g);
    if (space <= 5) {
      for (const s of g.stones) dead.add(s);
    }
  }
  return dead;
}

function enclosingColor(board, group) {
  const enemy = opposite(group.color);
  const visited = new Set(group.stones);
  const stack = [...group.liberties];
  let onlyEnemy = true;
  for (const l of stack) visited.add(l);
  while (stack.length) {
    const cur = stack.pop();
    for (const nb of board.neighbors(cur)) {
      if (visited.has(nb)) continue;
      visited.add(nb);
      const v = board.cells[nb];
      if (v === EMPTY) stack.push(nb);
      else if (v === enemy) { /* 경계 */ }
      else onlyEnemy = false;
    }
  }
  return onlyEnemy ? enemy : EMPTY;
}

function enclosedSpace(board, group) {
  const visited = new Set(group.stones);
  const stack = [...group.liberties];
  let count = 0;
  for (const l of stack) visited.add(l);
  while (stack.length) {
    const cur = stack.pop();
    count++;
    for (const nb of board.neighbors(cur)) {
      if (visited.has(nb) || board.cells[nb] !== EMPTY) continue;
      visited.add(nb);
      stack.push(nb);
    }
  }
  return count + group.stones.length;
}

/**
 * 계가.
 * @param {Board} board
 * @param {object} opts { komi, rules:'territory'|'area', dead:Set<number>, prisoners:[.., b, w] }
 * @returns {{black:number, white:number, territory:Int8Array, diff:number, winner:number, text:string, dame:number}}
 */
export function score(board, opts = {}) {
  const rules = opts.rules || 'territory';
  const komi = opts.komi != null ? opts.komi : 6.5;
  const dead = opts.dead || new Set();

  // 죽은 돌을 들어낸 반면으로 집을 센다
  const work = board.clone();
  let deadBlack = 0;
  let deadWhite = 0;
  for (const s of dead) {
    if (work.cells[s] === BLACK) deadBlack++;
    else if (work.cells[s] === WHITE) deadWhite++;
    work.setStone(s, EMPTY);
  }

  const territory = new Int8Array(work.length);
  const visited = new Uint8Array(work.length);
  let blackTerritory = 0;
  let whiteTerritory = 0;
  let dame = 0;

  for (let i = 0; i < work.length; i++) {
    if (work.cells[i] !== EMPTY || visited[i]) continue;
    const region = [];
    const borders = new Set();
    const stack = [i];
    visited[i] = 1;
    while (stack.length) {
      const cur = stack.pop();
      region.push(cur);
      for (const nb of work.neighbors(cur)) {
        const v = work.cells[nb];
        if (v === EMPTY) {
          if (!visited[nb]) { visited[nb] = 1; stack.push(nb); }
        } else borders.add(v);
      }
    }
    if (borders.size === 1) {
      const owner = [...borders][0];
      for (const p of region) territory[p] = owner;
      if (owner === BLACK) blackTerritory += region.length;
      else whiteTerritory += region.length;
    } else {
      dame += region.length;
    }
  }

  let black;
  let white;
  if (rules === 'area') {
    // 중국식: 집 + 살아 있는 내 돌
    black = blackTerritory + work.stoneCount(BLACK);
    white = whiteTerritory + work.stoneCount(WHITE) + komi;
  } else {
    // 한국·일본식: 집 + 잡은 돌(대국 중 사석 + 계가 시 들어낸 사석)
    const prisoners = opts.prisoners || board.prisoners;
    black = blackTerritory + (prisoners?.[BLACK] || 0) + deadWhite;
    white = whiteTerritory + (prisoners?.[WHITE] || 0) + deadBlack + komi;
  }

  const diff = black - white;
  const winner = diff > 0 ? BLACK : diff < 0 ? WHITE : EMPTY;
  const text = diff === 0
    ? '무승부'
    : `${winner === BLACK ? '흑' : '백'} ${Math.abs(diff).toFixed(1).replace(/\.0$/, '')}집 승`;

  return {
    black, white, diff, winner, text,
    territory, dame,
    blackTerritory, whiteTerritory,
    komi, rules,
  };
}

/**
 * 대국 도중의 형세 판단용 대략 계가.
 * 확정된 집 + 세력권을 절반 가중치로 더한 추정값이다. 정확한 계가가 아님을 UI에서 명시한다.
 */
export function quickEstimate(board, opts = {}) {
  const komi = opts.komi != null ? opts.komi : 6.5;
  const settled = score(board, { ...opts, komi: 0, dead: opts.dead || estimateDeadStones(board) });
  let blackFrame = 0;
  let whiteFrame = 0;
  for (let i = 0; i < board.length; i++) {
    if (board.cells[i] !== EMPTY || settled.territory[i] !== EMPTY) continue;
    let b = 0; let w = 0;
    for (let d = 1; d <= 3; d++) {
      for (const p of ring(board, i, d)) {
        if (board.cells[p] === BLACK) b += 1 / d;
        else if (board.cells[p] === WHITE) w += 1 / d;
      }
    }
    if (b > w * 1.6) blackFrame += 0.5;
    else if (w > b * 1.6) whiteFrame += 0.5;
  }
  const black = settled.black + blackFrame;
  const white = settled.white + whiteFrame + komi;
  const diff = black - white;
  return { black, white, diff, komi, verdict: verdictOf(diff) };
}

function ring(board, idx, d) {
  const out = [];
  const cx = board.x(idx); const cy = board.y(idx);
  for (let dy = -d; dy <= d; dy++) {
    for (let dx = -d; dx <= d; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== d) continue;
      const x = cx + dx; const y = cy + dy;
      if (board.inBounds(x, y)) out.push(board.idx(x, y));
    }
  }
  return out;
}

/** LEVEL 98 형세판단의 5단계 표현. */
export function verdictOf(diff) {
  if (diff >= 15) return { key: 'black-big', text: '흑 우세' };
  if (diff >= 4) return { key: 'black-small', text: '흑 약간 우세' };
  if (diff > -4) return { key: 'even', text: '호각' };
  if (diff > -15) return { key: 'white-small', text: '백 약간 우세' };
  return { key: 'white-big', text: '백 우세' };
}
