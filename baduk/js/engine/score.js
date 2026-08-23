/**
 * 계가 — 집 계산과 사석 판정.
 *
 * 두 가지 규칙 체계를 모두 지원한다(요구사항 67: 규칙에 따라 결과가 달라질 수 있음을 명시).
 *  - 'territory' (한국·일본식): 집 + 잡은 돌. **빅 안의 빈 점은 집으로 세지 않는다.**
 *  - 'area'      (중국식):      집 + 반상의 내 돌
 *
 * 죽은 돌 판정은 자동 추정 + 사용자 수정을 함께 쓴다.
 * 자동 추정의 근거는 Benson의 "무조건 사는 돌(pass-alive)" 정리다.
 */

import { BLACK, WHITE, EMPTY, opposite } from './board.js';
import { canCapture } from './analysis.js';

/**
 * territory 배열에 쓰는 표식.
 * BLACK/WHITE는 그 색의 집, EMPTY는 공배, SEKI는 **빅이라서 집으로 세지 않은 점**이다.
 * 화면이 이 셋을 구분해 그린다 — 왜 집이 안 되는지 눈으로 보이게 하려는 것이다.
 */
export const SEKI = 3;

/**
 * 빅 판정을 시도할 무리의 최대 활로 수.
 * 빅에 걸린 무리의 활로는 "자기 눈 + 나눠 쓰는 공배"뿐이라 실전에서 몇 개를 넘지 않는다.
 * 이보다 활로가 많은 무리는 읽어 볼 것도 없이 빅이 아니다 — 대국 중 형세 판단을 위한 값싼 예선이다.
 */
const SEKI_MAX_LIBERTIES = 8;

/**
 * 이 빈 점이 **아무도 메울 수 없는 자리**인가 — 즉 빅의 공배인가.
 * 흑이 메워도 잡히고 백이 메워도 잡히면 그렇다. 둘 수조차 없는(자충) 경우도 못 메우는 것이다.
 */
function isSekiLiberty(board, p) {
  let hasBlack = false;
  let hasWhite = false;
  for (const nb of board.neighbors(p)) {
    if (board.cells[nb] === BLACK) hasBlack = true;
    else if (board.cells[nb] === WHITE) hasWhite = true;
  }
  if (!hasBlack || !hasWhite) return false;

  for (const color of [BLACK, WHITE]) {
    const probe = board.clone();
    const r = probe.play(color, p);
    if (!r.ok) continue;                       // 자충이라 둘 수조차 없다 = 메울 수 없다
    if (r.captured && r.captured.length) return false;   // 메우면서 상대를 따낸다면 빅이 아니다
    if (!canCapture(probe, p, opposite(color), { maxDepth: 6, maxNodes: 8000 }).captured) return false;
  }
  return true;
}

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

  // ── 1. 살아 있는 돌을 무리별로 번호 매긴다 ─────────────────────────
  const chainOf = new Int32Array(work.length).fill(-1);
  const chains = [];                       // { color }
  for (let i = 0; i < work.length; i++) {
    if (work.cells[i] === EMPTY || chainOf[i] >= 0) continue;
    const id = chains.length;
    for (const st of work.group(i).stones) chainOf[st] = id;
    chains.push({ color: work.cells[i] });
  }

  // ── 2. 빈 곳을 덩어리로 나누고, 누구와 맞닿아 있는지 적어 둔다 ─────
  const territory = new Int8Array(work.length);
  const visited = new Uint8Array(work.length);
  const regions = [];
  for (let i = 0; i < work.length; i++) {
    if (work.cells[i] !== EMPTY || visited[i]) continue;
    const points = [];
    const borders = new Set();             // 맞닿은 색
    const touching = new Set();            // 맞닿은 무리 번호
    const stack = [i];
    visited[i] = 1;
    while (stack.length) {
      const cur = stack.pop();
      points.push(cur);
      for (const nb of work.neighbors(cur)) {
        const v = work.cells[nb];
        if (v === EMPTY) {
          if (!visited[nb]) { visited[nb] = 1; stack.push(nb); }
        } else { borders.add(v); touching.add(chainOf[nb]); }
      }
    }
    regions.push({ points, borders, touching });
  }

  // ── 3. 빅(seki) 찾기 ───────────────────────────────────────────────
  // 빅의 본질은 무리가 아니라 **자리**에 있다. "서로 메울 수 없는 공배"가 있으면 그것이 빅이다.
  // 그래서 무리의 눈 수나 크기를 어림하지 않고, 공배 하나하나에 대해 직접 물어본다.
  //
  //   흑이 여기를 메우면 흑이 잡히는가?  백이 메우면 백이 잡히는가?
  //   **양쪽 다 그렇다면** 그 자리는 아무도 메울 수 없는 자리 — 빅의 공배다.
  //
  // 이 정의는 "빅은 서로 손댈 수 없는 모양"이라는 설명 그대로다. 눈이 몇 개인지, 무리가 큰지 작은지
  // 따질 필요가 없고, 대국 중간의 넓은 빈 곳에서도 (메워도 안 잡히므로) 저절로 걸러진다.
  // 그 공배에 맞닿은 무리가 빅에 걸린 무리이고, 그 무리가 둘러싼 빈 곳은 집으로 세지 않는다.
  const libertyCount = new Int32Array(chains.length);
  for (let i = 0; i < work.length; i++) {
    if (work.cells[i] !== EMPTY) continue;
    const seen = new Set();
    for (const nb of work.neighbors(i)) {
      if (work.cells[nb] === EMPTY || seen.has(chainOf[nb])) continue;
      seen.add(chainOf[nb]);
      libertyCount[chainOf[nb]] += 1;
    }
  }

  const sekiChains = new Set();
  for (const r of regions) {
    if (r.borders.size < 2) continue;                    // 공배가 아닌 곳은 볼 것 없다
    // 활로가 넉넉한 무리는 빅일 수 없다. 값싼 예선으로 걸러야 대국 중 형세 판단이 느려지지 않는다.
    if ([...r.touching].some((c) => libertyCount[c] > SEKI_MAX_LIBERTIES)) continue;
    for (const p of r.points) {
      if (!isSekiLiberty(work, p)) continue;
      for (const nb of work.neighbors(p)) {
        if (work.cells[nb] !== EMPTY) sekiChains.add(chainOf[nb]);
      }
    }
  }

  // ── 4. 집 세기 ─────────────────────────────────────────────────────
  let blackTerritory = 0;
  let whiteTerritory = 0;
  let dame = 0;
  let sekiPoints = 0;
  for (const r of regions) {
    if (r.borders.size !== 1) { dame += r.points.length; continue; }
    const owner = [...r.borders][0];
    // 둘러싼 무리가 **전부** 빅에 걸려 있을 때만 빅의 눈이다.
    // 한쪽이라도 멀쩡히 산 무리가 둘러싸고 있으면 그것은 그 무리의 집이다.
    const inSeki = [...r.touching].every((c) => sekiChains.has(c));

    // 한국·일본식(집 계가)에서는 **빅 안의 빈 점은 집이 아니다.**
    // 서로 손을 댈 수 없어서 남은 자리이지, 둘러싸서 얻은 집이 아니기 때문이다.
    // 중국식(점 계가)은 반대로 반면의 모든 점을 세므로 그대로 owner의 것이 된다.
    if (inSeki && rules === 'territory') {
      for (const p of r.points) territory[p] = SEKI;
      sekiPoints += r.points.length;
      continue;
    }
    for (const p of r.points) territory[p] = owner;
    if (owner === BLACK) blackTerritory += r.points.length;
    else whiteTerritory += r.points.length;
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
    // 빅으로 판정되어 집에서 빠진 점 수와, 빅에 걸린 무리 수(화면에 그대로 보여 준다)
    sekiPoints, sekiGroups: sekiChains.size,
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
