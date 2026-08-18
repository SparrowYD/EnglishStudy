/**
 * 사활 완전탐색기.
 *
 * analysis.js의 국지 포획 탐색(canCapture / defenderCanEscape)은
 * "반경 몇 칸, 깊이 몇 수"로 잘라 읽기 때문에 빠르지만,
 * 궁도 안에서 몇 번씩 되따내는 진짜 사활에는 답을 틀리게 낸다.
 * 실제로 삿갓4궁(T자 4궁)을 살아 있다고 판정했다 — 정답은 급소 치중으로 죽는 모양이다.
 *
 * 그래서 "완전히 둘러싸인 무리"에 한해 궁도 안쪽만 두는 완전탐색을 따로 한다.
 * 탐색 공간이 궁도 크기로 제한되므로 끝까지 읽을 수 있고, 결과가 정확하다.
 *
 * 판정 기준은 규칙 그대로다 — 두 번 연속 패스로 끝났을 때
 * 그 무리가 반면에 남아 있으면 산 것이다(빅도 산 것으로 센다).
 *
 * 패 처리: 이미 나왔던 국면으로 돌아가는 수는 두지 못한다.
 * 이것은 game.js가 실제 대국에서 쓰는 동형반복 금지(positional superko)와 같은 규칙이므로,
 * 이 게임 안에서는 일관된 답이 나온다. 다만 **바깥 팻감이 개입하는 실전의 패**와는
 * 결론이 달라질 수 있다. 탐색 중에 동형반복이 한 번이라도 걸리면 koInvolved로 알려 주므로,
 * 콘텐츠를 만들 때 그 모양은 "패 없이 확정"이라고 단정하지 않는다.
 */

import { EMPTY, opposite } from './board.js';

/**
 * 궁도(무리가 둘러싼 안쪽 영역)를 찾는다. 밖으로 트여 있으면 null.
 *
 * 두 번에 나눠 찾는다.
 *  1) 빈 점만 따라 퍼진다 — 밖으로 트여 있으면 여기서 바로 한도를 넘어 null이 된다.
 *  2) 궁도 **안에 갇힌** 상대 돌만 흡수한다(던져 넣은 돌). 잡히면 그 자리가 다시 비기 때문이다.
 *
 * 2)에서 "갇힌"의 기준이 중요하다. 바깥 울타리와 이어진 상대 돌은 흡수하지 않는다 —
 * 그 돌은 궁도의 **경계**이지 궁도의 일부가 아니다. 흡수해 버리면 울타리를 타고
 * 반상 전체로 새어 나가, 젖혀 좁힌 뒤의 국면을 읽지 못하게 된다.
 */
export function eyeRegion(board, target, maxPoints = 14, maxTotal = 26) {
  const defender = board.cells[target];
  if (defender === EMPTY) return null;
  const attacker = opposite(defender);
  const group = board.group(target);

  const region = new Set();
  const stack = [];
  const pushEmpty = (p) => { if (!region.has(p)) { region.add(p); stack.push(p); } };
  for (const l of group.liberties) pushEmpty(l);
  if (region.size === 0) return null;

  // 한도는 **빈 점 수**로 센다 — 탐색의 가지 수를 결정하는 것이 빈 점이기 때문이다.
  // 흡수한 상대 돌은 따내야 비로소 둘 수 있으므로 따로(더 넉넉하게) 센다.
  let empties = region.size;
  const spreadEmpty = () => {
    while (stack.length) {
      if (empties > maxPoints || region.size > maxTotal) return false;
      const cur = stack.pop();
      for (const nb of board.neighbors(cur)) {
        if (board.cells[nb] === EMPTY && !region.has(nb)) { empties += 1; pushEmpty(nb); }
      }
    }
    return empties <= maxPoints && region.size <= maxTotal;
  };
  if (!spreadEmpty()) return null;

  for (let guard = 0; guard < 8; guard++) {
    let grew = false;
    const checked = new Set();
    for (const p of [...region]) {
      for (const nb of board.neighbors(p)) {
        if (board.cells[nb] !== attacker || region.has(nb) || checked.has(nb)) continue;
        const g = board.group(nb);
        for (const s of g.stones) checked.add(s);
        if (!g.liberties.every((l) => region.has(l))) continue;   // 울타리와 이어진 돌
        for (const s of g.stones) region.add(s);
        for (const s of g.stones) {
          for (const q of board.neighbors(s)) if (board.cells[q] === EMPTY) pushEmpty(q);
        }
        grew = true;
      }
    }
    if (!grew) break;
    if (!spreadEmpty()) return null;
  }

  if (empties > maxPoints || region.size > maxTotal) return null;
  return [...region].sort((a, b) => a - b);
}

/**
 * 완전탐색 사활 판정.
 *
 * @param {Board} board
 * @param {number} target  판정할 무리의 한 점
 * @param {number} toMove  지금 둘 차례인 색
 * @returns {{resolved:boolean, alive:boolean, region:number[]|null,
 *            kills:number[], koInvolved:boolean, nodes:number}}
 *   resolved=false면 이 함수로는 답을 낼 수 없다는 뜻 — 부르는 쪽이 국지 탐색으로 넘어가야 한다.
 */
export function solveTsumego(board, target, toMove, opts = {}) {
  const defender = board.cells[target];
  const out = { resolved: false, alive: true, region: null, kills: [], koInvolved: false, nodes: 0 };
  if (defender === EMPTY) { out.resolved = true; out.alive = false; return out; }

  const attacker = opposite(defender);
  const region = eyeRegion(board, target, opts.maxPoints || 14);
  if (!region) return out;
  out.region = region;

  const maxNodes = opts.maxNodes || 400000;
  const state = { nodes: 0, over: false, ko: false };
  const memo = new Map();

  /** @returns {boolean} defender가 사는가 */
  function solve(b, turn, passes, history) {
    if (b.cells[target] !== defender) return false;       // 들려 나갔다
    if (passes >= 2) return true;                          // 더 둘 것이 없다 → 살았다(빅 포함)
    if (++state.nodes > maxNodes) { state.over = true; return true; }

    const key = `${b.hash()}|${turn}|${passes}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;

    // 두는 쪽은 자기에게 유리한 결과를 하나라도 찾으면 그것으로 확정한다.
    const wantAlive = turn === defender;

    for (const p of region) {
      if (b.cells[p] !== EMPTY) continue;
      const probe = b.clone();
      if (!probe.play(turn, p).ok) continue;
      const h = probe.hash();
      if (history.has(h)) { state.ko = true; continue; }   // 동형반복 금지
      history.add(h);
      const r = solve(probe, opposite(turn), 0, history);
      history.delete(h);
      if (r === wantAlive) { memo.set(key, r); return r; }
    }
    // 패스도 하나의 선택지다(더 둘수록 손해인 모양에서 반드시 필요하다)
    const r = solve(b, opposite(turn), passes + 1, history);
    memo.set(key, r);
    return r;
  }

  const history = new Set([board.hash()]);
  const alive = solve(board, toMove, 0, history);
  out.nodes = state.nodes;
  out.koInvolved = state.ko;
  if (state.over) return out;        // 노드 한도 초과 — 판정하지 않는다
  out.resolved = true;
  out.alive = alive;

  // 잡는 쪽 차례이고 죽는 모양이면, 어느 자리가 급소인지도 알려 준다(힌트·해설용)
  if (!alive && toMove === attacker) {
    for (const p of region) {
      if (board.cells[p] !== EMPTY) continue;
      const probe = board.clone();
      if (!probe.play(attacker, p).ok) continue;
      const h = new Set([board.hash(), probe.hash()]);
      state.nodes = 0;
      if (!solve(probe, defender, 0, h)) out.kills.push(p);
    }
  }
  return out;
}

/**
 * "이 무리가 살아남는가"를 묻는 공통 진입점.
 * 둘러싸인 모양이면 완전탐색으로, 아니면 국지 탐색으로 답한다.
 * @param {(b:Board)=>boolean} fallback 국지 탐색 결과를 돌려주는 함수
 */
export function survives(board, target, toMove, fallback, opts = {}) {
  const t = solveTsumego(board, target, toMove, opts);
  if (t.resolved) return t.alive;
  return fallback();
}
