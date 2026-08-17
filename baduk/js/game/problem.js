/**
 * 문제 엔진.
 *
 * 요구사항 79의 두 금지사항이 이 파일의 설계 목표다.
 *  - "모든 문제에서 정답 위치 하나만 하드코딩하기" 금지
 *      → 정답은 좌표가 아니라 목표(goal)로 기술하고, 규칙 엔진이 달성 여부를 판정한다.
 *        같은 목표를 이루는 다른 수가 있으면 그 수도 정답이다.
 *  - "사용자가 틀렸을 때 이유를 알려주지 않기" 금지
 *      → 오답은 반드시 반면에서 읽어낸 사실(활로 수, 잡히는 수순 등)로 이유를 만든다.
 *
 * 상대의 응수도 대본이 아니라 탐색 결과다. 사용자가 예상 밖의 수를 두면
 * 상대도 그에 맞춰 가장 끈질긴 저항을 찾아 응수한다.
 */

import { Board, BLACK, WHITE, EMPTY, opposite, setup, fromLabel, toLabel, COLOR_NAME } from '../engine/board.js';
import {
  canCapture, defenderCanEscape, readLadder, isSelfAtari, isTrueEye, eyeCount,
  isSafelyConnected, isConnected, canConnectNow, groupsInAtari, neighborhood,
} from '../engine/analysis.js';
import { survives } from '../engine/tsumego.js';

export const VERDICT = {
  CORRECT: 'correct',   // 목표 달성
  GOOD: 'good',         // 정답은 아니지만 나쁘지 않은 수
  WRONG: 'wrong',       // 목표를 이루지 못함
  ILLEGAL: 'illegal',   // 규칙 위반
};

/** 문제 정의로부터 시작 반면을 만든다. */
export function buildPosition(problem) {
  const size = problem.size || 19;
  return setup({ size, ...problem.setup });
}

export class ProblemSession {
  constructor(problem, opts = {}) {
    this.problem = problem;
    this.size = problem.size || 19;
    this.board = buildPosition(problem);
    this.initial = this.board.clone();
    this.toPlay = problem.toPlay || BLACK;
    this.userColor = problem.toPlay || BLACK;
    this.moves = [];          // {color, idx, verdict}
    this.wrongCount = 0;
    this.hintsUsed = 0;
    this.revealed = false;
    this.solved = false;
    this.failed = false;
    this.allowHints = opts.allowHints !== false;
    this.maxMoves = problem.maxMoves || 12;
  }

  reset() {
    this.board = this.initial.clone();
    this.moves = [];
    this.toPlay = this.problem.toPlay || BLACK;
    this.solved = false;
    this.failed = false;
  }

  idx(label) { return fromLabel(label, this.size); }
  label(idx) { return toLabel(idx, this.size); }

  /** 목표에 등장하는 대표 좌표들을 현재 반면 기준 인덱스로. */
  targetIndices(labels) {
    return (labels || []).map((l) => (typeof l === 'number' ? l : this.idx(l)));
  }

  /**
   * 사용자의 한 수를 채점한다.
   * @returns {{verdict:string, message:string, detail?:string, reply?:number, done?:boolean}}
   */
  play(idx) {
    if (this.solved || this.failed) {
      return { verdict: VERDICT.WRONG, message: '이미 끝난 문제입니다. 다시 풀기를 눌러 주세요.' };
    }
    const legal = this.board.check(this.userColor, idx);
    if (!legal.ok) {
      // 규칙 위반도 학습 기회다 — 왜 안 되는지 그대로 알려준다.
      return { verdict: VERDICT.ILLEGAL, message: legal.message };
    }

    const before = this.board.clone();
    const after = this.board.clone();
    after.play(this.userColor, idx);

    const result = evaluateMove({
      problem: this.problem,
      before,
      after,
      move: idx,
      color: this.userColor,
      size: this.size,
    });

    if (result.verdict === VERDICT.CORRECT) {
      this.board = after;
      this.moves.push({ color: this.userColor, idx, verdict: result.verdict });
      if (result.done) {
        this.solved = true;
        return { ...result, done: true };
      }
      // 아직 끝이 아니면 상대가 가장 끈질긴 수로 저항한다
      const reply = bestResistance(this.board, opposite(this.userColor), this.problem);
      if (reply != null && reply >= 0) {
        this.board.play(opposite(this.userColor), reply);
        this.moves.push({ color: opposite(this.userColor), idx: reply, verdict: 'reply' });
        // 상대가 둔 뒤에도 목표가 이미 달성되었는지 다시 본다
        const recheck = evaluateGoal(this.problem, this.initial, this.board, this.userColor, this.size);
        if (recheck.achieved) {
          this.solved = true;
          return { ...result, reply, done: true, message: result.message };
        }
      } else {
        this.solved = true;
        return { ...result, done: true };
      }
      if (this.moves.length >= this.maxMoves * 2) {
        this.failed = true;
        return { verdict: VERDICT.WRONG, message: '수순이 너무 길어졌습니다. 처음부터 다시 생각해 봅시다.' };
      }
      return { ...result, reply, done: false };
    }

    // 여러 수에 걸친 문제(축 수읽기 등)에서는 "아직 목표를 이루진 않았지만 잘 가고 있는 수"가 있다.
    // progressGoal은 상대의 응수까지 둔 뒤에 판정한다 — 그래야 내 수가 정말 성립했는지 알 수 있다.
    if (this.problem.progressGoal) {
      // moveGoal은 상대 응수 **전에** 내 수 자체를 검사한다.
      // 축 문제에서 "이 수가 단수를 만들었는가"처럼, 응수 뒤에는 확인할 수 없는 조건에 쓴다.
      if (this.problem.moveGoal) {
        const mv = evaluateGoal(
          { ...this.problem, goal: this.problem.moveGoal }, before, after, this.userColor, this.size,
        );
        if (!mv.achieved) {
          this.wrongCount += 1;
          const r = explainWrong({
            problem: { ...this.problem, goal: this.problem.moveGoal },
            before, after, move: idx, color: this.userColor, size: this.size, goalResult: mv,
          });
          return { verdict: VERDICT.WRONG, message: r.headline, detail: r.detail };
        }
      }
      const snapshot = { board: this.board.clone(), moves: this.moves.slice() };
      this.board = after;
      this.moves.push({ color: this.userColor, idx, verdict: 'progress' });
      const reply = bestResistance(this.board, opposite(this.userColor), this.problem);
      if (reply != null && reply >= 0) {
        this.board.play(opposite(this.userColor), reply);
        this.moves.push({ color: opposite(this.userColor), idx: reply, verdict: 'reply' });
      }
      const done = evaluateGoal(this.problem, this.initial, this.board, this.userColor, this.size);
      if (done.achieved) {
        this.solved = true;
        return { verdict: VERDICT.CORRECT, message: this.problem.successMessage || '정답입니다!', reply, done: true };
      }
      const onTrack = evaluateGoal(
        { ...this.problem, goal: this.problem.progressGoal }, this.initial, this.board, this.userColor, this.size,
      );
      if (onTrack.achieved) {
        return { verdict: VERDICT.CORRECT, message: '좋습니다. 계속 이어 가세요.', reply, done: false };
      }
      // 어긋났으면 되돌리고 왜 안 되는지 알려 준다
      this.board = snapshot.board;
      this.moves = snapshot.moves;
      this.wrongCount += 1;
      return {
        verdict: VERDICT.WRONG,
        message: reason0(this.problem, before, after, idx, this.userColor, this.size),
        detail: onTrack.reason === 'ladder-broken'
          ? '이쪽으로 몰면 상대가 활로를 늘려 달아납니다. 반대쪽에서 몰아 보세요.'
          : '이 수로는 끝까지 몰 수 없습니다.',
      };
    }

    this.wrongCount += 1;
    return result;
  }

  /** 되돌리기(오답 후 다시 시도). */
  undo() {
    if (this.moves.length === 0) return false;
    const keep = this.moves.slice();
    // 사용자 수 하나와 그에 대한 응수까지 되돌린다
    keep.pop();
    if (keep.length && keep[keep.length - 1].verdict === 'reply') keep.pop();
    this.board = this.initial.clone();
    for (const m of keep) this.board.play(m.color, m.idx);
    this.moves = keep;
    this.solved = false;
    this.failed = false;
    return true;
  }

  /**
   * 힌트. 단계별로 점점 구체화된다(요구사항 53의 별 기준과 연동).
   * 마지막 단계에서도 좌표를 바로 찍어 주지 않고 "어느 방향/어느 성질의 수"인지를 말한다.
   */
  hint() {
    this.hintsUsed += 1;
    const custom = this.problem.hints || [];
    if (this.hintsUsed <= custom.length) {
      return { level: this.hintsUsed, text: custom[this.hintsUsed - 1] };
    }
    const sol = this.solutions();
    if (sol.length === 0) return { level: this.hintsUsed, text: '이 국면에서는 목표를 이룰 수 없습니다. 문제를 다시 확인해 보세요.' };
    const area = describeArea(this.board, sol, this.size);
    return { level: this.hintsUsed, text: `정답은 ${area} 부근에 있습니다.` };
  }

  /** 정답 보기 — ★☆☆ 처리된다. */
  reveal() {
    this.revealed = true;
    const sol = this.solutions();
    return {
      moves: sol.map((i) => this.label(i)),
      explanation: this.problem.explanation || defaultExplanation(this.problem, this.board, sol, this.size),
    };
  }

  /**
   * 지금 국면에서 목표를 달성하는 모든 수를 찾는다.
   * 정답이 여러 개면 여러 개 그대로 돌려준다(하드코딩된 한 점이 아니다).
   */
  solutions() {
    return findSolutions(this.problem, this.board, this.userColor, this.size);
  }
}

/* ------------------------------------------------------------------ *
 * 목표 판정
 * ------------------------------------------------------------------ */

/**
 * 문제의 goal이 달성되었는지 규칙 엔진으로 판정한다.
 * @returns {{achieved:boolean, reason?:string}}
 */
export function evaluateGoal(problem, initial, board, color, size = 19) {
  const goal = problem.goal || { type: 'point', accept: [] };
  const enemy = opposite(color);
  const idxOf = (l) => (typeof l === 'number' ? l : fromLabel(l, size));
  const depth = goal.depth || 8;

  // requireSafe: 목표를 이루더라도 방금 둔 돌이 단수가 되면 정답으로 치지 않는다.
  // "잡기는 잡았는데 내 돌이 죽는" 수를 정답으로 인정하지 않기 위한 조건이다.
  if (problem.requireSafe) {
    const last = lastMoveOf(initial, board, color);
    if (last >= 0 && board.cells[last] === color && board.libertyCount(last) <= 1) {
      return { achieved: false, reason: 'self-atari' };
    }
  }

  switch (goal.type) {
    case 'capture': {
      // 목표 돌이 실제로 잡혔거나, 최선의 저항에도 잡히는 것이 확정되었는가
      const targets = (goal.targets || []).map(idxOf);
      for (const t of targets) {
        if (board.cells[t] === EMPTY) continue;           // 이미 따냈다
        if (board.cells[t] === color) continue;           // 내 돌이 되어 있다
        if (goal.immediate) return { achieved: false, reason: 'still-alive' };
        // 내 착수 직후이므로 지금은 상대 차례다. "상대가 살릴 수 있는가"로 물어야
        // 나에게 두 수를 연속으로 주는 후한 판정이 되지 않는다.
        if (defenderCanEscape(board, t, color, { maxDepth: depth, maxNodes: goal.maxNodes || 30000 })) {
          return { achieved: false, reason: 'still-alive' };
        }
      }
      return { achieved: true };
    }
    case 'atari': {
      const targets = (goal.targets || []).map(idxOf);
      for (const t of targets) {
        if (board.cells[t] === EMPTY) continue;
        const g = board.group(t);
        if (!g || g.liberties.length !== 1) return { achieved: false, reason: 'not-atari' };
      }
      // byFilling: 이미 단수인 돌 앞에서 아무 곳에나 두는 것을 막는다.
      // 축처럼 "매 수 활로를 하나씩 메워야" 하는 문제에서 반드시 필요하다.
      if (goal.byFilling) {
        const last = lastMoveOf(initial, board, color);
        if (last < 0) return { achieved: false, reason: 'no-move' };
        const filled = targets.some((t) => {
          if (initial.cells[t] === EMPTY) return false;
          return initial.group(t).liberties.includes(last);
        });
        if (!filled) return { achieved: false, reason: 'not-filling' };
      }
      return { achieved: true };
    }
    case 'double-atari': {
      // 서로 다른 두 무리를 동시에 단수로 만든다
      const ataris = groupsInAtari(board, enemy);
      const distinct = new Set(ataris.map((g) => Math.min(...g.stones)));
      return distinct.size >= (goal.count || 2)
        ? { achieved: true }
        : { achieved: false, reason: 'not-double' };
    }
    case 'escape': {
      // 내 돌이 상대의 최선 공격에도 잡히지 않는가
      const g = idxOf(goal.group);
      if (board.cells[g] !== color) return { achieved: false, reason: 'captured' };
      if (goal.minLiberties && board.libertyCount(g) < goal.minLiberties) {
        return { achieved: false, reason: 'few-liberties' };
      }
      const safe = survives(board, g, enemy, () => !canCapture(
        board, g, enemy, { maxDepth: depth, maxNodes: goal.maxNodes || 30000 },
      ).captured);
      return safe ? { achieved: true } : { achieved: false, reason: 'still-caught' };
    }
    case 'connect': {
      const a = idxOf(goal.a);
      const b = idxOf(goal.b);
      if (board.cells[a] !== color || board.cells[b] !== color) return { achieved: false, reason: 'gone' };
      return isSafelyConnected(board, a, b, color)
        ? { achieved: true }
        : { achieved: false, reason: 'cuttable' };
    }
    case 'cut': {
      // 끊었다 = 이어져 있지도 않고, 상대가 한 수로 이을 수도 없다
      const a = idxOf(goal.a);
      const b = idxOf(goal.b);
      if (board.cells[a] !== enemy || board.cells[b] !== enemy) return { achieved: true };
      if (isConnected(board, a, b)) return { achieved: false, reason: 'still-connected' };
      return canConnectNow(board, a, b, enemy)
        ? { achieved: false, reason: 'can-reconnect' }
        : { achieved: true };
    }
    case 'live': {
      const g = idxOf(goal.group);
      if (board.cells[g] !== color) return { achieved: false, reason: 'captured' };
      if (goal.twoEyes) {
        const grp = board.group(g);
        if (eyeCount(board, grp) >= 2) return { achieved: true };
      }
      // 둘러싸인 모양이면 완전탐색으로 정확히 판정하고, 아니면 국지 탐색으로 넘어간다.
      const alive = survives(board, g, enemy, () => !canCapture(
        board, g, enemy, { maxDepth: goal.depth || 10, maxNodes: goal.maxNodes || 60000 },
      ).captured);
      return alive ? { achieved: true } : { achieved: false, reason: 'killed' };
    }
    case 'kill': {
      const g = idxOf(goal.group);
      if (board.cells[g] === EMPTY) return { achieved: true };
      // 착수 직후 = 상대 차례. 상대가 살릴 수 있으면 아직 잡은 것이 아니다.
      const alive = survives(board, g, enemy, () => defenderCanEscape(
        board, g, color, { maxDepth: goal.depth || 10, maxNodes: goal.maxNodes || 60000 },
      ));
      return alive ? { achieved: false, reason: 'alive' } : { achieved: true };
    }
    case 'ko': {
      // 패를 만들었는가. 방금 한 점을 따내 되따내기가 금지된 상태가 패다.
      // "죽은 돌을 패로 버틴다"(LEVEL 48)를 판정할 때 쓴다.
      if (board.ko < 0) return { achieved: false, reason: 'no-ko' };
      if (goal.at != null && board.ko !== idxOf(goal.at)) return { achieved: false, reason: 'wrong-ko' };
      return { achieved: true };
    }
    case 'threat': {
      // 팻감 — 상대가 받지 않으면 내가 잡는다는 위협을 만들었는가.
      // 위협의 크기(잡을 돌 수)를 minStones로 정한다.
      const targets = (goal.targets || []).map(idxOf);
      for (const t of targets) {
        if (board.cells[t] !== enemy) continue;
        const g = board.group(t);
        if (goal.minStones && g.stones.length < goal.minStones) continue;
        const r = canCapture(board, t, color, {
          maxDepth: goal.depth || 6, maxNodes: goal.maxNodes || 20000,
        });
        if (r.captured) return { achieved: true };
      }
      return { achieved: false, reason: 'no-threat' };
    }
    case 'reduce': {
      // "상대 활로를 실제로 줄였는가" — 먹여치기처럼 단수까지는 못 가지만
      // 활로를 하나씩 줄여 가는 수를 채점할 때 쓴다. initial 대비로 비교한다.
      const targets = (goal.targets || []).map(idxOf);
      for (const t of targets) {
        if (board.cells[t] === EMPTY) return { achieved: true };  // 아예 잡았다
        if (initial.cells[t] === EMPTY) continue;
        const before = initial.group(t).liberties.length;
        const now = board.group(t).liberties.length;
        if (now >= before) return { achieved: false, reason: 'not-reduced' };
      }
      return { achieved: true };
    }
    case 'capturable': {
      // "내 차례에 아직 잡을 수 있는가" — 상대 응수 뒤(=내 차례)에 쓰는 진행 조건.
      // 착수 직후(=상대 차례)에 쓰는 'capture'와 차례가 반대이므로 함수도 다르다.
      const targets = (goal.targets || []).map(idxOf);
      for (const t of targets) {
        if (board.cells[t] === EMPTY || board.cells[t] === color) continue;
        const r = canCapture(board, t, color, {
          maxDepth: goal.depth || 8, maxNodes: goal.maxNodes || 30000,
        });
        if (!r.captured) return { achieved: false, reason: 'escaped' };
      }
      return { achieved: true };
    }
    case 'ladder': {
      // 축이 아직 성립하는가. 잡는 쪽 차례일 때 판정해야 의미가 맞다.
      const t = idxOf(goal.target != null ? goal.target : (goal.targets || [])[0]);
      if (t < 0) return { achieved: false, reason: 'no-target' };
      if (board.cells[t] === EMPTY || board.cells[t] === color) return { achieved: true };
      return readLadder(board, t, color).captured
        ? { achieved: true }
        : { achieved: false, reason: 'ladder-broken' };
    }
    case 'liberties': {
      // "활로가 N개가 되는 곳에 두어라" — group을 적지 않으면 방금 둔 돌을 본다
      const g = goal.group != null ? idxOf(goal.group) : lastMoveOf(initial, board, color);
      if (g < 0 || board.cells[g] === EMPTY) return { achieved: false, reason: 'gone' };
      const n = board.libertyCount(g);
      if (goal.count != null && n !== goal.count) return { achieved: false, reason: 'liberties' };
      if (goal.min != null && n < goal.min) return { achieved: false, reason: 'liberties' };
      if (goal.max != null && n > goal.max) return { achieved: false, reason: 'liberties' };
      return { achieved: true };
    }
    case 'point': {
      // 명시적으로 지정된 좋은 수들(모양 문제 등 엔진으로 판정하기 어려운 경우)
      const accept = (goal.accept || []).map(idxOf);
      const last = lastMoveOf(initial, board, color);
      return accept.includes(last) ? { achieved: true } : { achieved: false, reason: 'not-listed' };
    }
    default:
      return { achieved: false, reason: 'unknown-goal' };
  }
}

/** progressGoal이 어긋났을 때 쓸 짧은 오답 문구. */
function reason0(problem, before, after, move, color, size) {
  const r = explainWrong({ problem, before, after, move, color, size, goalResult: { achieved: false } });
  return r.headline;
}

function lastMoveOf(initial, board, color) {
  for (let i = 0; i < board.length; i++) {
    if (board.cells[i] === color && initial.cells[i] !== color) return i;
  }
  return -1;
}

/**
 * 한 수를 놓은 결과를 채점하고, 틀렸다면 그 이유를 반면에서 읽어 설명한다.
 */
export function evaluateMove(ctx) {
  const { problem, before, after, move, color, size } = ctx;
  const label = toLabel(move, size);

  // 문제가 특정 수에 대해 직접 설명을 달아 두었으면 그것을 우선 보여 준다
  const authored = problem.comments && problem.comments[label];

  const goalResult = evaluateGoal(problem, before, after, color, size);
  if (goalResult.achieved) {
    const done = !problem.continueAfterGoal;
    return {
      verdict: VERDICT.CORRECT,
      message: authored || problem.successMessage || '정답입니다!',
      detail: problem.explanation,
      done,
    };
  }

  const reason = explainWrong({ problem, before, after, move, color, size, goalResult });
  return {
    verdict: VERDICT.WRONG,
    message: authored || reason.headline,
    detail: reason.detail,
  };
}

/**
 * 오답 설명 생성기.
 * 격언이 아니라 지금 반면에서 실제로 벌어지는 일을 근거로 말한다.
 */
export function explainWrong(ctx) {
  const { problem, before, after, move, color, size, goalResult } = ctx;
  const enemy = opposite(color);
  const goal = problem.goal || {};
  const idxOf = (l) => (typeof l === 'number' ? l : fromLabel(l, size));
  const lab = (i) => toLabel(i, size);

  // 1) 내 돌이 스스로 위험해졌는가 — 어떤 문제에서든 가장 먼저 짚어야 할 사실
  if (after.cells[move] === color) {
    const g = after.group(move);
    if (g.liberties.length === 1) {
      return {
        headline: `이 수는 자충입니다. ${lab(move)}에 둔 돌이 활로 1개뿐인 단수가 됩니다.`,
        detail: `상대가 ${lab(g.liberties[0])}에 두면 ${g.stones.length}점이 그대로 잡힙니다.`,
      };
    }
  }

  switch (goal.type) {
    case 'capture': {
      const targets = (goal.targets || []).map(idxOf);
      for (const t of targets) {
        if (after.cells[t] === EMPTY || after.cells[t] === color) continue;
        const g = after.group(t);
        if (!g) continue;
        if (g.liberties.length === 1) {
          return {
            headline: `아직 잡지 못했습니다. ${COLOR_NAME[enemy]} 돌의 활로가 1개 남아 단수일 뿐입니다.`,
            detail: `상대는 ${lab(g.liberties[0])}로 달아납니다. 달아나도 소용없는 자리부터 막아야 합니다.`,
          };
        }
        const escape = canCapture(after, t, color, { maxDepth: 6, maxNodes: 20000 });
        return {
          headline: `아직 잡지 못했습니다. ${COLOR_NAME[enemy]} 돌의 활로가 ${g.liberties.length}개 남아 있습니다.`,
          detail: escape.captured
            ? '방향은 나쁘지 않지만 한 수로는 부족합니다. 더 확실하게 몰 수 있는 자리가 있습니다.'
            : `남은 활로는 ${g.liberties.slice(0, 4).map(lab).join('·')} 입니다. 이대로는 상대가 달아납니다.`,
        };
      }
      break;
    }
    case 'atari': {
      if (goalResult?.reason === 'not-filling') {
        return {
          headline: '상대 돌의 활로를 메우는 수가 아닙니다.',
          detail: '축은 매 수 상대의 활로를 하나씩 메워 단수를 유지해야 합니다. 다른 곳을 두면 상대가 달아납니다.',
        };
      }
      const targets = (goal.targets || []).map(idxOf);
      for (const t of targets) {
        if (after.cells[t] === EMPTY) continue;
        const g = after.group(t);
        return {
          headline: `단수가 되지 않았습니다. ${COLOR_NAME[enemy]} 돌의 활로가 ${g.liberties.length}개입니다.`,
          detail: '단수란 활로가 딱 1개 남은 상태입니다. 활로를 하나만 남기는 자리를 찾아보세요.',
        };
      }
      break;
    }
    case 'escape': {
      const g = idxOf(goal.group);
      if (after.cells[g] !== color) {
        return { headline: '내 돌이 잡혔습니다.', detail: '달아나는 방향을 다시 생각해 봅시다.' };
      }
      const r = canCapture(after, g, enemy, { maxDepth: 8, maxNodes: 30000 });
      if (r.captured) {
        const ladder = readLadder(after, g, enemy);
        if (ladder.captured && ladder.sequence.length > 4) {
          return {
            headline: `달아나지 못했습니다. 상대가 ${lab(r.move)}부터 몰면 축으로 잡힙니다.`,
            detail: `축은 ${Math.ceil(ladder.sequence.length / 2)}수쯤 이어지지만 결국 귀에서 잡힙니다. 축으로 잡히는 방향으로는 달아날 수 없습니다.`,
          };
        }
        return {
          headline: `아직 안전하지 않습니다. 상대가 ${lab(r.move)}에 두면 잡힙니다.`,
          detail: '한 수 더 읽어 보세요. 두고 난 뒤 상대의 응수까지 확인하는 것이 수읽기입니다.',
        };
      }
      const libs = after.libertyCount(g);
      if (goal.minLiberties && libs < goal.minLiberties) {
        return {
          headline: `활로가 ${libs}개뿐입니다. ${goal.minLiberties}개 이상 확보해야 안심할 수 있습니다.`,
          detail: '활로가 적은 돌은 언제든 다시 공격받습니다.',
        };
      }
      break;
    }
    case 'connect': {
      const a = idxOf(goal.a);
      const b = idxOf(goal.b);
      const cut = findCut(after, a, b, color);
      if (cut >= 0) {
        return {
          headline: `아직 이어지지 않았습니다. 상대가 ${lab(cut)}에 두면 끊깁니다.`,
          detail: '끊긴 돌은 따로따로 약해집니다. 끊길 자리를 먼저 막아야 합니다.',
        };
      }
      break;
    }
    case 'cut': {
      const a = idxOf(goal.a);
      const b = idxOf(goal.b);
      const detail = goalResult?.reason === 'can-reconnect'
        ? `상대가 한 수만 두면 다시 이어집니다. 이을 자리 자체를 차지해야 끊은 것입니다.`
        : '두 돌이 아직 한 덩어리입니다.';
      return { headline: '아직 끊지 못했습니다.', detail };
    }
    case 'live': {
      const g = idxOf(goal.group);
      if (after.cells[g] !== color) return { headline: '내 돌이 잡혔습니다.', detail: '' };
      const r = canCapture(after, g, enemy, { maxDepth: 10, maxNodes: 60000 });
      if (r.captured) {
        return {
          headline: `아직 살지 못했습니다. 상대가 ${lab(r.move)}에 두면 죽습니다.`,
          detail: '두 눈을 낼 수 있는 모양인지 확인해 보세요. 궁도를 넓히거나 급소를 먼저 차지해야 합니다.',
        };
      }
      break;
    }
    case 'kill': {
      const g = idxOf(goal.group);
      if (after.cells[g] === EMPTY) break;
      const grp = after.group(g);
      const eyes = eyeCount(after, grp);
      return {
        headline: eyes >= 2
          ? '상대가 두 눈을 내고 살았습니다.'
          : '이 수로는 잡히지 않습니다. 상대에게 살 여지가 남아 있습니다.',
        detail: '눈이 될 자리를 미리 없애는 급소가 있는지 찾아보세요.',
      };
    }
    case 'liberties': {
      const g = goal.group != null ? idxOf(goal.group) : move;
      const n = after.cells[g] === EMPTY ? 0 : after.libertyCount(g);
      const want = goal.count != null
        ? `${goal.count}개`
        : goal.min != null && goal.max != null
          ? `${goal.min}~${goal.max}개`
          : goal.min != null ? `${goal.min}개 이상` : `${goal.max}개 이하`;
      return {
        headline: `이 자리에 두면 활로가 ${n}개입니다. 목표는 ${want}입니다.`,
        detail: '활로는 돌에 상하좌우로 바로 붙어 있는 빈 점입니다. 대각선은 활로가 아닙니다.',
      };
    }
    default:
      break;
  }

  // 목표별 설명이 없을 때의 마지막 안전망 — 그래도 반면의 사실로 말한다
  const generic = [];
  if (after.cells[move] === color) {
    const g = after.group(move);
    generic.push(`이 돌의 활로는 ${g.liberties.length}개입니다.`);
  }
  if (isSelfAtari(before, color, move)) generic.push('스스로 활로를 줄이는 수입니다.');
  return {
    headline: '목표를 이루지 못했습니다.',
    detail: generic.join(' ') || '두고 난 뒤 상대가 어디에 둘지 한 수만 더 읽어 보세요.',
  };
}

function findCut(board, a, b, color) {
  if (isConnected(board, a, b)) return -1;
  const enemy = opposite(color);
  const zone = neighborhood(board, [a, b], 2);
  for (const p of zone) {
    if (board.cells[p] !== EMPTY) continue;
    const probe = board.clone();
    if (!probe.play(enemy, p).ok) continue;
    if (!isSafelyConnected(probe, a, b, color)) return p;
  }
  return -1;
}

/* ------------------------------------------------------------------ *
 * 정답 탐색 / 상대의 저항
 * ------------------------------------------------------------------ */

/**
 * 목표를 달성하는 모든 착점을 찾는다.
 * 탐색 범위는 문제에 관련된 돌 주변으로 제한한다(19로 전체를 다 볼 필요가 없다).
 */
export function findSolutions(problem, board, color, size = 19) {
  const goal = problem.goal || {};
  if (goal.type === 'point') {
    return (goal.accept || []).map((l) => (typeof l === 'number' ? l : fromLabel(l, size)));
  }
  const zone = solutionZone(problem, board, size);
  const enemy = opposite(color);
  const out = [];
  for (const p of zone) {
    if (board.cells[p] !== EMPTY) continue;
    const probe = board.clone();
    if (!probe.play(color, p).ok) continue;
    if (evaluateGoal(problem, board, probe, color, size).achieved) { out.push(p); continue; }

    // 축처럼 여러 수에 걸친 문제에서는 "아직 목표를 이루진 않았지만 올바른 첫 수"도 정답이다.
    // 채점기와 같은 기준(moveGoal + 응수 뒤 progressGoal)으로 판정한다.
    if (!problem.progressGoal) continue;
    if (problem.moveGoal) {
      const mv = evaluateGoal({ ...problem, goal: problem.moveGoal }, board, probe, color, size);
      if (!mv.achieved) continue;
    }
    const after = probe.clone();
    const reply = bestResistance(after, enemy, problem);
    if (reply != null && reply >= 0) after.play(enemy, reply);
    if (evaluateGoal({ ...problem, goal: problem.progressGoal }, board, after, color, size).achieved) out.push(p);
  }
  return out;
}

function solutionZone(problem, board, size) {
  const goal = problem.goal || {};
  const idxOf = (l) => (typeof l === 'number' ? l : fromLabel(l, size));
  const anchors = [];
  for (const key of ['targets', 'group', 'a', 'b']) {
    const v = goal[key];
    if (Array.isArray(v)) anchors.push(...v.map(idxOf));
    else if (v != null) anchors.push(idxOf(v));
  }
  if (anchors.length === 0) {
    // 앵커가 없으면 반면의 돌 전체 주변을 본다
    for (let i = 0; i < board.length; i++) if (board.cells[i] !== EMPTY) anchors.push(i);
    // 빈 반면이면(LEVEL 1·2처럼 "아무 데나 두어 보세요") 반면 전체가 후보다
    if (anchors.length === 0) return Array.from({ length: board.length }, (_, i) => i);
  }
  const stones = [];
  for (const a of anchors) {
    if (board.cells[a] !== EMPTY) stones.push(...board.group(a).stones);
    else stones.push(a);
  }
  return neighborhood(board, stones, problem.searchRadius || 3);
}

/**
 * 상대의 저항수. 문제의 목표를 가장 오래 막는 수를 고른다.
 * 대본이 없으므로 사용자가 어떤 순서로 두어도 국면이 어긋나지 않는다.
 */
export function bestResistance(board, color, problem) {
  const size = board.size;
  const goal = problem.goal || {};
  const idxOf = (l) => (typeof l === 'number' ? l : fromLabel(l, size));
  const user = opposite(color);

  // 잡히기 직전인 내 돌은 우선 살펴본다
  const candidates = new Set();
  const myAtari = groupsInAtari(board, color);
  for (const g of myAtari) {
    candidates.add(g.liberties[0]);
    for (const s of g.stones) {
      for (const nb of board.neighbors(s)) {
        if (board.cells[nb] === user) {
          const eg = board.group(nb);
          if (eg.liberties.length === 1) candidates.add(eg.liberties[0]);
        }
      }
    }
  }
  const anchors = [];
  for (const key of ['targets', 'group', 'a', 'b']) {
    const v = goal[key];
    if (Array.isArray(v)) anchors.push(...v.map(idxOf));
    else if (v != null) anchors.push(idxOf(v));
  }
  const stones = [];
  for (const a of anchors) {
    if (board.cells[a] !== EMPTY) stones.push(...board.group(a).stones);
    else stones.push(a);
  }
  if (stones.length) for (const p of neighborhood(board, stones, 2)) candidates.add(p);
  const anchorStones = stones;

  let best = -1;
  let bestScore = -Infinity;
  for (const p of candidates) {
    if (p == null || p < 0 || board.cells[p] !== EMPTY) continue;
    const probe = board.clone();
    const res = probe.play(color, p);
    if (!res.ok) continue;

    let s = 0;
    // 1) 잡히기 직전인 내 돌을 어떻게든 건사한다.
    //    (a) 활로로 뻗기 — 결국 잡히는 축이라도 그것이 유일한 저항이다.
    //    (b) 상대 돌을 따내어 활로를 되찾기 — 환격이 성립하는지 확인하려면 이쪽도 두어 봐야 한다.
    //    둘 중 하나라도 해당하면 큰 점수를 준다. (a)만 보면 축이 어긋나고,
    //    (b)만 보면 가장자리 축에서 뻗는 수를 놓친다.
    for (const g of myAtari) {
      const extended = g.liberties[0] === p;
      const rescued = probe.cells[g.stones[0]] === color && probe.libertyCount(g.stones[0]) >= 2;
      if (extended || rescued) s += 180 + 10 * g.stones.length + 15 * probe.libertyCount(p);
    }
    // 2) 나를 몰던 돌을 되따내는 것도 훌륭한 저항이다
    s += res.captured.length * 60;
    // 3) 사용자의 목표를 아직 막고 있는가
    if (!evaluateGoal(problem, board, probe, user, size).achieved) s += 100;
    // 4) 나머지가 같다면 국지적으로 버티는 수를 고른다.
    //    이미 죽은 돌 옆에서 엉뚱하게 먼 곳을 두면 학습자에게 수순이 어지럽게 보인다.
    for (const a of anchorStones) {
      if (board.neighbors(a).includes(p)) { s += 6; break; }
    }
    if (probe.cells[p] === color) s += probe.libertyCount(p);
    if (res.captured.length === 0 && probe.cells[p] === color && probe.libertyCount(p) <= 1) s -= 120;

    if (s > bestScore) { bestScore = s; best = p; }
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * 설명 도우미
 * ------------------------------------------------------------------ */

function describeArea(board, points, size) {
  if (points.length === 0) return '';
  const x = points.reduce((a, p) => a + (p % size), 0) / points.length;
  const y = points.reduce((a, p) => a + ((p / size) | 0), 0) / points.length;
  const third = size / 3;
  const vertical = y < third ? '위쪽' : y > size - third ? '아래쪽' : '가운데';
  const horizontal = x < third ? '왼쪽' : x > size - third ? '오른쪽' : '가운데';
  if (vertical === '가운데' && horizontal === '가운데') return '중앙';
  return `${vertical} ${horizontal}`.replace('가운데 ', '').replace(' 가운데', '');
}

function defaultExplanation(problem, board, solutions, size) {
  if (solutions.length === 0) return '이 국면에서는 목표를 이룰 수 없습니다.';
  const list = solutions.map((i) => toLabel(i, size)).join(', ');
  return solutions.length === 1
    ? `정답은 ${list} 입니다.`
    : `정답은 ${list} — 목표를 이루는 수가 여러 개 있습니다.`;
}
