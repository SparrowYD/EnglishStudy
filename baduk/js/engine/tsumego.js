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
 * ── 패를 어떻게 다루는가 ───────────────────────────────────────────
 * 예전에는 동형반복 금지(positional superko) 하나로 끝냈다. 그러면 "되따낼 수 없는 쪽이 진다"가
 * 되어 **패가 조용히 삶이나 죽음으로 뭉개진다.** 실제 바둑에서 패의 결말은 바깥 팻감이 정하는데,
 * 팻감은 이 궁도 안에 없다. 궁도만 보고 "산다/죽는다"라고 단정하면 그건 거짓말이다.
 *
 * 그래서 같은 국면을 **두 번** 읽는다.
 *   ① 잡는 쪽이 패를 이긴다고 가정 — 잡는 쪽만 동형반복을 (제한된 횟수만큼) 어길 수 있다
 *   ② 사는 쪽이 패를 이긴다고 가정 — 사는 쪽만 어길 수 있다
 * 두 답이 같으면 패와 무관하게 확정된 삶/죽음이다. 답이 갈리면 **그 모양의 운명은 패가 정한다**
 * — 이때는 'ko'를 돌려주고, 부르는 쪽이 "패입니다"라고 말하게 한다.
 * 어기는 횟수(=팻감 수)는 유한하게 제한하므로 탐색은 반드시 끝난다.
 *
 * 이것도 완전한 모형은 아니다. 팻감의 크기와 개수는 반면 전체가 정하는 것이고, 여기서는
 * "몇 번 되따낼 수 있는가"로만 근사한다. 다만 **모르는 것을 안다고 하지 않는 쪽**으로 근사한다 —
 * 갈리면 확정하지 않고 패라고 말한다.
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
 * 귀곡사인가 — 귀의 꺾인 넉 점.
 *
 * 이 모양은 **탐색이 아니라 규칙이 정한다.** 완전탐색에 물어보면 정직하게 "패"라고 답한다.
 * 실제로도 패가 맞다. 사는 쪽이 패를 이겨야만 살기 때문이다.
 * 그런데 이 패는 잡는 쪽이 **아무 때나 시작할 수 있다.** 그래서 잡는 쪽은 반면의 팻감을
 * 전부 없앤 뒤에 패를 걸 수 있고, 사는 쪽에게는 이길 방법이 없다.
 * 한국·일본 규칙은 이 사정을 규정으로 못 박았다 — **귀곡사는 죽은 것으로 한다.**
 *
 * 그래서 여기서만 규칙을 명시적으로 적용한다. 다른 패를 임의로 삶/죽음으로 뭉개지는 않는다.
 */
export function isCornerBentFour(board, region) {
  if (!region || region.length !== 4) return false;
  const n = board.size;
  const pts = region.map((p) => [board.x(p), board.y(p)]);
  const corners = [[0, 0, 1, 1], [n - 1, 0, -1, 1], [0, n - 1, 1, -1], [n - 1, n - 1, -1, -1]];
  const WANT = [
    [[0, 0], [0, 1], [0, 2], [1, 0]].map(String).sort().join('|'),
    [[0, 0], [1, 0], [2, 0], [0, 1]].map(String).sort().join('|'),
  ];
  for (const [cx, cy, sx, sy] of corners) {
    const rel = pts.map(([x, y]) => [(x - cx) * sx, (y - cy) * sy]);
    if (rel.some(([a, b]) => a < 0 || b < 0)) continue;
    const key = rel.map(String).sort().join('|');
    if (WANT.includes(key)) return true;
  }
  return false;
}

/** 판정 결과 이름. 부르는 쪽이 이 세 가지를 각각 다르게 다루게 하려고 문자열로 돌려준다. */
export const ALIVE = 'alive';
export const DEAD = 'dead';
export const KO = 'ko';

/**
 * 궁도 안만 두는 완전탐색 한 번.
 *
 * @param koWinner  동형반복 금지를 어길 수 있는 쪽(=패를 이긴다고 가정하는 쪽). null이면 아무도 못 어긴다.
 * @param koThreats koWinner가 어길 수 있는 횟수(팻감 수의 근사). 유한하므로 탐색은 끝난다.
 * @returns {{alive:boolean, nodes:number, over:boolean,
 *            blockedDefender:number, blockedAttacker:number}}
 *   blocked*는 "패를 못 써서 물러선 횟수"다. 어느 쪽이 0이면 그쪽에 팻감을 줘도 결과가 같다.
 */
function searchOnce(board, target, defender, toMove, region, koWinner, koThreats, maxNodes) {
  const state = { nodes: 0, over: false, superkos: 0, blockedDefender: 0, blockedAttacker: 0 };
  const memo = new Map();

  function solve(b, turn, passes, history, threats) {
    if (b.cells[target] !== defender) return false;       // 들려 나갔다
    if (passes >= 2) return true;                          // 더 둘 것이 없다 → 살았다(빅 포함)
    if (++state.nodes > maxNodes) { state.over = true; return true; }

    // 열쇠에 패 자리(b.ko)까지 넣는다. 반면이 같아도 "지금 되따낼 수 없는 자리"가 다르면 다른 국면이다.
    // 이것을 빼면 기억한 답을 엉뚱한 국면에서 꺼내 쓰게 된다.
    const key = `${b.hash()}|${b.ko}|${turn}|${passes}|${threats}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;

    // 이 가지 안에서 **동형반복**을 마주쳤으면 결과가 지나온 수순에 따라 달라진다.
    // 그런 결과는 기억해 두면 안 된다(다른 수순에서 꺼내 쓰면 틀린다).
    // 되따내기 금지(b.ko)는 수순이 아니라 국면에 속하므로 열쇠에 들어가 있다 — 여기서 셀 필요가 없다.
    const mark = state.superkos;
    const finish = (r) => {
      if (state.superkos === mark) memo.set(key, r);
      return r;
    };

    // 두는 쪽은 자기에게 유리한 결과를 하나라도 찾으면 그것으로 확정한다.
    const wantAlive = turn === defender;
    const canViolate = (side) => side === koWinner && threats > 0;
    // 패를 못 써서 접은 수를 쪽별로 센다. 어느 쪽이 한 번도 막히지 않았다면
    // 그쪽에 팻감을 줘 봐야 **탐색 나무가 똑같으므로** 결과도 같다 → 그 탐색을 건너뛴다.
    const note = (side) => {
      if (side === defender) state.blockedDefender += 1; else state.blockedAttacker += 1;
    };

    for (const p of region) {
      if (b.cells[p] !== EMPTY) continue;

      // 패를 두는 방법은 둘뿐이다 — 규칙이 막은 되따내기를 어기거나, 이전 국면으로 되돌아가거나.
      // 둘 다 "팻감을 하나 쓰고 왔다"고 보고, 패를 이기는 쪽에게만 허락한다.
      // 어길 수 없는 쪽은 두어 보지도 않고 여기서 접는다.
      let violation = p === b.ko;
      if (violation && !canViolate(turn)) { note(turn); continue; }

      const probe = b.clone();
      probe.ko = -1;                                 // 팻감을 쓰고 왔다고 가정하고 두어 본다
      if (!probe.play(turn, p).ok) continue;         // 자살수 등 정말 못 두는 자리

      const h = probe.hash();
      const repeat = history.has(h);
      if (repeat) {
        state.superkos += 1;
        violation = true;
        if (!canViolate(turn)) { note(turn); continue; }
      }

      const added = !repeat;
      if (added) history.add(h);
      const r = solve(probe, opposite(turn), 0, history, threats - (violation ? 1 : 0));
      if (added) history.delete(h);
      if (r === wantAlive) return finish(r);
    }
    // 패스도 하나의 선택지다(더 둘수록 손해인 모양에서 반드시 필요하다)
    return finish(solve(b, opposite(turn), passes + 1, history, threats));
  }

  const alive = solve(board, toMove, 0, new Set([board.hash()]), koThreats);
  return {
    alive, nodes: state.nodes, over: state.over,
    blockedDefender: state.blockedDefender, blockedAttacker: state.blockedAttacker,
  };
}

/**
 * 판정 결과 캐시.
 *
 * 문제 하나를 검증할 때 엔진은 **둘 수 있는 모든 자리**를 채점한다. 그 수들은 같은 궁도 안에서
 * 조금씩 다른 국면을 만들 뿐이라, 같은 국면을 여러 번 다시 읽게 된다.
 * 열쇠에 반면 해시·패 자리·판정 대상·차례·팻감 수를 모두 넣으므로 서로 다른 국면이 섞이지 않는다.
 */
const CACHE = new Map();
const CACHE_MAX = 60000;

function cacheKey(board, target, toMove, threats, rules, maxNodes) {
  return `${board.hash()}|${board.ko}|${target}|${toMove}|${threats}|${rules}|${maxNodes}`;
}

export function clearTsumegoCache() { CACHE.clear(); }

/**
 * 완전탐색 사활 판정.
 *
 * @param {Board} board
 * @param {number} target  판정할 무리의 한 점
 * @param {number} toMove  지금 둘 차례인 색
 * @returns {{resolved:boolean, status:'alive'|'dead'|'ko', alive:boolean, region:number[]|null,
 *            kills:number[], koKills:number[], koInvolved:boolean, nodes:number}}
 *   resolved=false면 이 함수로는 답을 낼 수 없다는 뜻 — 부르는 쪽이 국지 탐색으로 넘어가야 한다.
 *   alive는 **확정된 삶**만 참이다(패로 버티는 모양은 status==='ko', alive===false).
 */
export function solveTsumego(board, target, toMove, opts = {}) {
  const defender = board.cells[target];
  const out = {
    resolved: false, status: ALIVE, alive: true, region: null,
    kills: [], koKills: [], koInvolved: false, ruleApplied: null, nodes: 0,
  };
  if (defender === EMPTY) { out.resolved = true; out.status = DEAD; out.alive = false; return out; }

  const attacker = opposite(defender);
  const region = eyeRegion(board, target, opts.maxPoints || 14);
  if (!region) return out;
  out.region = region;

  const maxNodes = opts.maxNodes || 400000;
  const threats = opts.koThreats != null ? opts.koThreats : 1;

  const ck = cacheKey(board, target, toMove, threats, opts.rules || 'kr', maxNodes);
  const cached = CACHE.get(ck);
  if (cached) return { ...cached, region };

  const status = classify(board, target, defender, attacker, toMove, region, threats, maxNodes, out);
  if (status == null) return out;      // 노드 한도 초과 — 판정하지 않는다
  out.resolved = true;
  out.status = status;

  // 귀곡사는 규칙이 죽음으로 정한 모양이다(위 isCornerBentFour 설명 참고).
  // opts.rules === 'superko' 로 부르면 규칙을 적용하지 않고 탐색 결과(패)를 그대로 돌려준다.
  if (status === KO && opts.rules !== 'superko' && isCornerBentFour(board, region)) {
    out.status = DEAD;
    out.ruleApplied = '귀곡사는 죽은 것으로 한다(한국·일본 규칙)';
  }
  out.alive = out.status === ALIVE;

  // 잡는 쪽 차례이고 죽는 모양이면, 어느 자리가 급소인지도 알려 준다(힌트·해설용)
  if (out.status !== ALIVE && toMove === attacker) {
    for (const p of region) {
      if (board.cells[p] !== EMPTY) continue;
      const probe = board.clone();
      if (!probe.play(attacker, p).ok) continue;
      let after = classify(probe, target, defender, attacker, defender, region, threats, maxNodes, {});
      if (after === KO && out.ruleApplied) after = DEAD;    // 귀곡사 규칙은 급소 계산에도 똑같이 적용한다
      if (after === DEAD) out.kills.push(p);
      else if (after === KO) out.koKills.push(p);
    }
  }
  if (CACHE.size >= CACHE_MAX) CACHE.clear();
  CACHE.set(ck, { ...out, region: null });
  return out;
}

/**
 * 두 번 읽어 삶/죽음/패를 가른다.
 * 사는 쪽에 유리한 가정부터 읽는다 — 그래도 죽으면 패와 무관하게 죽는 모양이므로 한 번으로 끝난다.
 * 잡는 쪽이 한 번도 물러선 적이 없을 때도 두 번째 탐색을 건너뛴다(나무가 같기 때문이다).
 * @returns {'alive'|'dead'|'ko'|null}  null은 노드 한도 초과
 */
function classify(board, target, defender, attacker, toMove, region, threats, maxNodes, out) {
  const tally = (r) => { if (out) out.nodes = (out.nodes || 0) + r.nodes; return r; };

  // 1) 사는 쪽이 패를 이긴다고 가정하고 읽는다. 그래도 죽으면 패와 무관하게 죽는 모양이다.
  const best = tally(searchOnce(board, target, defender, toMove, region, defender, threats, maxNodes));
  if (best.over) return null;
  if (out) out.koInvolved = out.koInvolved || best.blockedAttacker > 0 || best.blockedDefender > 0;
  if (!best.alive) return DEAD;

  // 잡는 쪽이 패를 못 써서 접은 적이 한 번도 없다 → 팻감을 줘도 **탐색 나무가 같으므로** 결과도 같다.
  if (best.blockedAttacker === 0) return ALIVE;

  // 2) 잡는 쪽이 패를 이긴다고 가정하고 다시 읽는다. 답이 갈리면 그 모양의 운명은 패가 정한다.
  const worst = tally(searchOnce(board, target, defender, toMove, region, attacker, threats, maxNodes));
  if (worst.over) return null;
  return worst.alive ? ALIVE : KO;
}

/**
 * "이 무리가 어떤 상태인가"를 묻는 공통 진입점.
 * 둘러싸인 모양이면 완전탐색으로, 아니면 국지 탐색으로 답한다.
 * @param {(b:Board)=>boolean} fallback 국지 탐색이 "살아남는가"를 돌려주는 함수
 * @returns {'alive'|'dead'|'ko'}  국지 탐색으로 답한 경우 패는 구분하지 못하므로 alive/dead만 나온다
 */
export function lifeStatus(board, target, toMove, fallback, opts = {}) {
  const t = solveTsumego(board, target, toMove, opts);
  if (t.resolved) return t.status;
  return fallback() ? ALIVE : DEAD;
}

/**
 * 예전 진입점. **확정된 삶**만 참이다 — 패로 버티는 모양은 거짓이 된다.
 * 패인지 아닌지까지 알아야 하면 lifeStatus를 쓴다.
 */
export function survives(board, target, toMove, fallback, opts = {}) {
  return lifeStatus(board, target, toMove, fallback, opts) === ALIVE;
}
