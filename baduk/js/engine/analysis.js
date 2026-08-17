/**
 * 반면 분석 — 단수/자충/눈/축(蓄)/장문(場門)/포획 수읽기.
 *
 * 이 파일이 있어야 "정답 좌표 하나를 하드코딩"하지 않고
 * "돌이 실제로 잡히는가"를 규칙 엔진으로 판정할 수 있다.
 * 문제 채점기(game/problem.js)와 AI(ai/LocalBasicAI.js)가 함께 쓴다.
 */

import { Board, BLACK, WHITE, EMPTY, opposite } from './board.js';

/** 단수(활로 1개)인 상대/자기 무리들. 대표점 기준으로 중복 없이. */
export function groupsInAtari(board, color) {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < board.length; i++) {
    if (board.cells[i] !== color || seen.has(i)) continue;
    const g = board.group(i);
    for (const s of g.stones) seen.add(s);
    if (g.liberties.length === 1) out.push(g);
  }
  return out;
}

export function allGroups(board, color) {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < board.length; i++) {
    if (board.cells[i] !== color || seen.has(i)) continue;
    const g = board.group(i);
    for (const s of g.stones) seen.add(s);
    out.push(g);
  }
  return out;
}

/** 이 수를 두면 내 돌이 스스로 단수가 되는가(자충의 대표적 형태). */
export function isSelfAtari(board, color, idx) {
  const probe = board.clone();
  const res = probe.play(color, idx);
  if (!res.ok) return false;
  if (res.captured.length > 0) return false;
  return probe.libertyCount(idx) <= 1;
}

/** 이 수로 몇 점을 따내는가. */
export function capturesBy(board, color, idx) {
  const chk = board.check(color, idx);
  return chk.ok ? chk.captures.length : 0;
}

/**
 * 완전한 눈인지 판정.
 * - 사방이 내 돌(또는 반상 밖)
 * - 대각 네 점 중 상대 돌이 (변/귀에서는 0개, 중앙에서는 1개 이하)
 * 이 조건이 무너지면 "가짜 눈"이 된다. LEVEL 52의 교육 내용과 같은 판정이다.
 */
export function isTrueEye(board, idx, color) {
  if (board.cells[idx] !== EMPTY) return false;
  for (const nb of board.neighbors(idx)) {
    if (board.cells[nb] !== color) return false;
  }
  const diags = board.diagonals(idx);
  const onEdge = diags.length < 4;
  let enemy = 0;
  for (const d of diags) {
    if (board.cells[d] === opposite(color)) enemy++;
  }
  return onEdge ? enemy === 0 : enemy <= 1;
}

/** 무리가 확보한 (완전한) 눈의 개수. 두 눈이면 살아 있다. */
export function eyeCount(board, group) {
  const eyes = new Set();
  for (const lib of group.liberties) {
    if (isTrueEye(board, lib, group.color)) eyes.add(lib);
  }
  return eyes.size;
}

/* ------------------------------------------------------------------ *
 * 축(蓄)
 * ------------------------------------------------------------------ */

/**
 * 축으로 잡히는가?
 * 활로가 2개인 돌을 몰아서 끝까지 단수로 몰아붙일 수 있는지 재귀로 읽는다.
 * 도중에 상대(축머리) 돌을 만나 활로가 3개가 되면 실패 — 즉 "축머리"가 자동으로 반영된다.
 *
 * @param {Board} board 현재 반면
 * @param {number} target 잡으려는 돌 무리의 한 점
 * @param {number} attacker 잡는 쪽 색
 * @returns {{captured:boolean, sequence:number[]}}
 */
export function readLadder(board, target, attacker, maxDepth = 160) {
  const defender = board.cells[target];
  if (defender === EMPTY || defender === attacker) return { captured: false, sequence: [] };
  const res = ladderAttack(board.clone(), target, attacker, defender, maxDepth);
  return { captured: res.ok, sequence: res.line };
}

/** 잡는 쪽 차례. line은 실제 진행 수순(잡는 수, 달아나는 수, …)을 번갈아 담는다. */
function ladderAttack(board, target, attacker, defender, depth) {
  if (board.cells[target] !== defender) return { ok: true, line: [] };
  if (depth <= 0) return { ok: false, line: [] };
  const g = board.group(target);
  if (g.liberties.length >= 3) return { ok: false, line: [] };
  if (g.liberties.length === 1) {
    const lib = g.liberties[0];
    const probe = board.clone();
    const r = probe.play(attacker, lib);
    if (r.ok && probe.cells[target] === EMPTY) return { ok: true, line: [lib] };
    return { ok: false, line: [] };
  }
  for (const lib of g.liberties) {
    const probe = board.clone();
    const r = probe.play(attacker, lib);
    if (!r.ok) continue;
    if (probe.cells[target] === EMPTY) return { ok: true, line: [lib] };
    // 단수로 몰지 못하는 수는 축이 아니다(그냥 활로를 줄인 것)
    if (probe.libertyCount(target) !== 1) continue;
    const esc = ladderEscape(probe, target, attacker, defender, depth - 1);
    if (!esc.ok) return { ok: true, line: [lib, ...esc.line] };
  }
  return { ok: false, line: [] };
}

/** 달아나는 쪽 차례. 못 달아나는 경우에도 가장 오래 버티는 수순을 line에 남긴다. */
function ladderEscape(board, target, attacker, defender, depth) {
  const g = board.group(target);
  if (!g) return { ok: false, line: [] };
  if (g.liberties.length >= 3) return { ok: true, line: [] };
  if (depth <= 0) return { ok: true, line: [] }; // 깊이 초과 — 안전하게 "달아났다"로 본다

  const candidates = new Set(g.liberties);
  // 축을 모는 상대 돌이 단수라면 그것을 따내며 탈출할 수 있다(축머리의 본질).
  for (const s of g.stones) {
    for (const nb of board.neighbors(s)) {
      if (board.cells[nb] !== attacker) continue;
      const ag = board.group(nb);
      if (ag.liberties.length === 1) candidates.add(ag.liberties[0]);
    }
  }
  let longest = [];
  for (const move of candidates) {
    const probe = board.clone();
    const r = probe.play(defender, move);
    if (!r.ok) continue;
    if (probe.cells[target] !== defender && probe.cells[move] !== defender) continue;
    const key = probe.cells[target] === defender ? target : move;
    if (probe.libertyCount(key) >= 3) return { ok: true, line: [move] };
    const att = ladderAttack(probe, key, attacker, defender, depth - 1);
    if (!att.ok) return { ok: true, line: [move, ...att.line] };
    const line = [move, ...att.line];
    if (line.length > longest.length) longest = line;
  }
  return { ok: false, line: longest };
}

/* ------------------------------------------------------------------ *
 * 일반 포획 수읽기 (장문·촉촉수·환격 등 축이 아닌 포획까지 판정)
 * ------------------------------------------------------------------ */

/**
 * attacker가 target 무리를 잡을 수 있는가를 국지 탐색으로 읽는다.
 * 후보수를 target 주변 2칸 이내로 제한하고 노드 수에 상한을 두어
 * 문제 채점/힌트에 쓸 수 있는 속도를 유지한다.
 *
 * @returns {{captured:boolean, move:number|null, nodes:number, truncated:boolean}}
 */
export function canCapture(board, target, attacker, opts = {}) {
  const maxDepth = opts.maxDepth || 8;
  const maxNodes = opts.maxNodes || 40000;
  const defender = board.cells[target];
  if (defender === EMPTY || defender === attacker) {
    return { captured: false, move: null, nodes: 0, truncated: false };
  }
  const state = { nodes: 0, maxNodes, truncated: false, memo: new Map(), radius: opts.radius || 2 };
  let best = null;
  for (const move of orderedMoves(board, target, attacker, zoneFor(board, target, state))) {
    const probe = board.clone();
    const r = probe.play(attacker, move);
    if (!r.ok) continue;
    if (probe.cells[target] === EMPTY) { best = move; break; }
    if (defenderSurvives(probe, target, attacker, defender, maxDepth - 1, state)) continue;
    best = move;
    break;
  }
  return { captured: best !== null, move: best, nodes: state.nodes, truncated: state.truncated };
}

/**
 * "지금 살아날 수 있는가" — **달아나는 쪽 차례**로 판정한다.
 *
 * canCapture는 "잡는 쪽 차례"를 가정하므로, 내가 방금 한 수를 둔 직후의 국면에
 * 그대로 쓰면 나에게 두 수를 연속으로 주는 셈이 되어 판정이 후해진다.
 * 착수 직후에 "이 돌이 잡혔는가"를 물을 때는 반드시 이 함수를 쓴다.
 */
export function defenderCanEscape(board, target, attacker, opts = {}) {
  const defender = board.cells[target];
  if (defender === EMPTY) return false;          // 이미 들려 나갔다
  if (defender === attacker) return true;
  const state = {
    nodes: 0,
    maxNodes: opts.maxNodes || 40000,
    truncated: false,
    memo: new Map(),
    radius: opts.radius || 2,
  };
  return defenderSurvives(board, target, attacker, defender, opts.maxDepth || 8, state);
}

/**
 * 탐색 구역은 **매 국면 다시 계산한다.**
 * 처음 한 번만 계산해 두면, 달아나는 돌이 그 구역을 벗어난 순간 둘 곳이 없어져
 * 실제로는 편하게 도망친 돌을 "잡혔다"고 잘못 판정한다.
 */
function zoneFor(board, target, state) {
  if (board.cells[target] === EMPTY) return [];
  return neighborhood(board, board.group(target).stones, state.radius);
}

function defenderSurvives(board, target, attacker, defender, depth, state) {
  if (board.cells[target] === EMPTY) return false;
  const g = board.group(target);
  if (depth <= 0) { state.truncated = true; return true; }
  if (g.liberties.length >= 4) return true; // 이 정도 활로면 국지 포획은 실패로 본다
  if (++state.nodes > state.maxNodes) { state.truncated = true; return true; }

  const key = `d${board.hash()}|${depth}`;
  if (state.memo.has(key)) return state.memo.get(key);

  let survives = false;
  for (const move of orderedMoves(board, target, defender, zoneFor(board, target, state))) {
    const probe = board.clone();
    const r = probe.play(defender, move);
    if (!r.ok) continue;
    if (probe.cells[target] !== defender) continue;
    if (!attackerCaptures(probe, target, attacker, defender, depth - 1, state)) { survives = true; break; }
  }
  if (!survives) {
    // 패스(다른 곳을 두는 것)로도 살 수 있는지: 상대가 못 잡으면 애초에 잡힌 게 아니다
    if (!attackerCaptures(board, target, attacker, defender, depth - 1, state, true)) survives = true;
  }
  state.memo.set(key, survives);
  return survives;
}

function attackerCaptures(board, target, attacker, defender, depth, state, defenderPassed = false) {
  if (board.cells[target] === EMPTY) return true;
  if (depth <= 0) { state.truncated = true; return false; }
  if (++state.nodes > state.maxNodes) { state.truncated = true; return false; }
  const key = `a${board.hash()}|${depth}|${defenderPassed ? 1 : 0}`;
  if (state.memo.has(key)) return state.memo.get(key);

  let captures = false;
  for (const move of orderedMoves(board, target, attacker, zoneFor(board, target, state))) {
    const probe = board.clone();
    const r = probe.play(attacker, move);
    if (!r.ok) continue;
    if (probe.cells[target] === EMPTY) { captures = true; break; }
    if (!defenderSurvives(probe, target, attacker, defender, depth - 1, state)) { captures = true; break; }
  }
  state.memo.set(key, captures);
  return captures;
}

/** 목표 무리의 활로를 먼저, 그다음 주변 빈 점을 본다(좋은 수부터 읽어 가지치기 효율을 올린다). */
function orderedMoves(board, target, color, zone) {
  const g = board.group(target);
  const first = [];
  const rest = [];
  const libs = g ? new Set(g.liberties) : new Set();
  for (const p of zone) {
    if (board.cells[p] !== EMPTY) continue;
    if (libs.has(p)) first.push(p);
    else rest.push(p);
  }
  // 자충 가능성이 큰 수는 뒤로 미룬다
  rest.sort((a, b) => countAdjacent(board, b, color) - countAdjacent(board, a, color));
  return first.concat(rest);
}

function countAdjacent(board, idx, color) {
  let n = 0;
  for (const nb of board.neighbors(idx)) if (board.cells[nb] === color) n++;
  return n;
}

/** 돌 무리에서 반경 r 안의 모든 점. */
export function neighborhood(board, stones, r = 2) {
  const out = new Set();
  for (const s of stones) {
    const sx = board.x(s);
    const sy = board.y(s);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > r + 1) continue;
        const x = sx + dx;
        const y = sy + dy;
        if (board.inBounds(x, y)) out.add(board.idx(x, y));
      }
    }
  }
  return [...out];
}

/* ------------------------------------------------------------------ *
 * 연결과 끊음
 * ------------------------------------------------------------------ */

/** 두 점이 실제로 하나의 무리인가. */
export function isConnected(board, a, b) {
  if (board.cells[a] === EMPTY || board.cells[a] !== board.cells[b]) return false;
  return board.group(a).stones.includes(b);
}

/**
 * 지금 당장은 떨어져 있지만 상대가 무슨 수를 써도 이을 수 있는가(호구·쌍립 판정).
 * 상대가 끊는 수를 두면 → 내가 한 수로 되받아 이을 수 있는지 확인한다.
 */
export function isSafelyConnected(board, a, b, color = board.cells[a]) {
  if (isConnected(board, a, b)) return true;
  if (board.cells[a] !== color || board.cells[b] !== color) return false;
  const enemy = opposite(color);
  const zone = connectionZone(board, a, b);
  // 애초에 한 수로 이을 수 없다면 안전한 연결이라고 할 수 없다
  if (!canConnectInOneMove(board, a, b, color, zone)) return false;

  for (const cut of zone) {
    if (board.cells[cut] !== EMPTY) continue;
    const probe = board.clone();
    if (!probe.play(enemy, cut).ok) continue;   // 둘 수 없는 자리는 끊는 수가 되지 못한다
    const zone2 = connectionZone(probe, a, b);
    const replies = new Set([...zone, ...zone2]);
    let repaired = false;
    for (const m of replies) {
      if (probe.cells[m] !== EMPTY) continue;
      const p2 = probe.clone();
      if (!p2.play(color, m).ok) continue;
      if (p2.cells[a] !== color || p2.cells[b] !== color) continue;
      if (isConnected(p2, a, b)) { repaired = true; break; }
      // 끊은 돌을 따냈다면, 그 뒤에도 한 수로 이을 수 있으면 안전하다(호구가 이 경우다)
      if (p2.cells[cut] === EMPTY && canConnectInOneMove(p2, a, b, color, replies)) { repaired = true; break; }
    }
    if (!repaired) return false;
  }
  return true;
}

/** 지금 한 수로 두 돌을 이을 수 있는가(끊음이 성립했는지 판정할 때 쓴다). */
export function canConnectNow(board, a, b, color = board.cells[a]) {
  if (board.cells[a] !== color || board.cells[b] !== color) return false;
  if (isConnected(board, a, b)) return true;
  return canConnectInOneMove(board, a, b, color, connectionZone(board, a, b));
}

function canConnectInOneMove(board, a, b, color, zone) {
  for (const m of zone) {
    if (board.cells[m] !== EMPTY) continue;
    const probe = board.clone();
    if (!probe.play(color, m).ok) continue;
    if (probe.cells[a] === color && probe.cells[b] === color && isConnected(probe, a, b)) return true;
  }
  return false;
}

/** 두 돌의 연결에 관여할 수 있는 주변 점들. */
function connectionZone(board, a, b) {
  const stones = [];
  for (const p of [a, b]) {
    if (board.cells[p] !== EMPTY) stones.push(...board.group(p).stones);
    else stones.push(p);
  }
  return neighborhood(board, stones, 1);
}

/** a와 b를 잇는 데 관여하는 빈 점들(둘 다에 인접하거나 사이에 낀 점). */
export function cuttingPoints(board, a, b, color = board.cells[a]) {
  const out = [];
  const ax = board.x(a); const ay = board.y(a);
  const bx = board.x(b); const by = board.y(b);
  const minX = Math.min(ax, bx); const maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by); const maxY = Math.max(ay, by);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = board.idx(x, y);
      if (board.cells[i] !== EMPTY) continue;
      const probe = board.clone();
      probe.place(color, i);
      if (isConnected(probe, a, b)) out.push(i);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 세력·영향력 (포석 설명과 형세판단에 사용)
 * ------------------------------------------------------------------ */

/**
 * 아주 단순한 영향력 확산 모델.
 * 돌에서 거리에 따라 감쇠하는 값을 뿌리고, 양쪽 값의 차로 세력권을 본다.
 * "집"이 아니라 "세력"을 시각화하기 위한 것이며 정확한 계가와는 별개다.
 */
export function influenceMap(board, decay = 0.55) {
  const n = board.length;
  const infl = new Float32Array(n);
  const stones = [];
  for (let i = 0; i < n; i++) if (board.cells[i] !== EMPTY) stones.push(i);
  for (const s of stones) {
    const sign = board.cells[s] === BLACK ? 1 : -1;
    const sx = board.x(s); const sy = board.y(s);
    for (let i = 0; i < n; i++) {
      const d = Math.abs(board.x(i) - sx) + Math.abs(board.y(i) - sy);
      if (d > 6) continue;
      infl[i] += sign * Math.pow(decay, d);
    }
  }
  return infl;
}
