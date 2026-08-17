/**
 * 콘텐츠 검증.
 *
 * 문제를 손으로 배치하다 보면 "정답이 아예 없는 문제"나
 * "이미 목표가 달성되어 있어 아무 데나 두면 정답인 문제"가 생기기 쉽다.
 * 이 검증기는 그런 문제를 전부 잡아낸다. 테스트와 CLI가 함께 쓴다.
 */

import { BLACK, WHITE, EMPTY, fromLabel, toLabel } from '../engine/board.js';
import { buildPosition, findSolutions, evaluateGoal, ProblemSession } from '../game/problem.js';
import { STEP } from '../game/stage.js';

/** 문제 하나를 검사한다. @returns {{id, ok, errors:string[], solutions:string[]}} */
export function validateProblem(problem, ctx = '') {
  const errors = [];
  const size = problem.size || 19;
  const label = (i) => toLabel(i, size);
  let solutions = [];

  if (!problem.id) errors.push('id가 없습니다.');
  if (!problem.prompt) errors.push('prompt가 없습니다.');
  if (!problem.goal) errors.push('goal이 없습니다.');
  if (!problem.explanation) errors.push('explanation이 없습니다 — 정답 보기에서 설명할 내용이 필요합니다.');

  let board;
  try {
    board = buildPosition(problem);
  } catch (e) {
    errors.push(`반면 생성 실패: ${e.message}`);
    return { id: problem.id, ctx, ok: false, errors, solutions };
  }

  // 배치한 좌표가 실제로 반면에 올라갔는지(오타로 좌표가 사라지는 것을 잡는다)
  for (const [color, list] of [[BLACK, problem.setup?.black], [WHITE, problem.setup?.white]]) {
    for (const l of list || []) {
      const i = fromLabel(l, size);
      if (i < 0) errors.push(`좌표 표기가 잘못되었습니다: ${l}`);
      else if (board.cells[i] !== color) errors.push(`${l} 위치에 돌이 놓이지 않았습니다(중복 배치?).`);
    }
  }

  // 시작부터 활로가 0인 돌이 있으면 규칙상 있을 수 없는 반면이다
  const seen = new Set();
  for (let i = 0; i < board.length; i++) {
    if (board.cells[i] === EMPTY || seen.has(i)) continue;
    const g = board.group(i);
    for (const s of g.stones) seen.add(s);
    if (g.liberties.length === 0) errors.push(`${label(i)}의 돌이 활로 0으로 배치되어 있습니다(불가능한 반면).`);
  }

  const color = problem.toPlay || BLACK;

  // 시작 국면에서 이미 목표가 달성되어 있으면 문제가 되지 않는다
  if (problem.goal && problem.goal.type !== 'point') {
    const pre = evaluateGoal(problem, board, board, color, size);
    if (pre.achieved) errors.push('시작 국면에서 이미 목표가 달성되어 있습니다.');
  }

  solutions = findSolutions(problem, board, color, size);
  if (solutions.length === 0) errors.push('목표를 달성하는 수가 하나도 없습니다.');

  // 여러 수에 걸친 문제(축·촉촉수·환격 등)는 첫 수가 있다고 끝나는 것이 아니다.
  // 채점기와 똑같은 방식으로 끝까지 풀어 보고, 실제로 완료되는지 확인한다.
  if (problem.progressGoal && solutions.length > 0) {
    const session = new ProblemSession(problem, { allowHints: false });
    const line = [];
    let stuck = false;
    for (let guard = 0; guard < (problem.maxMoves || 12) + 2 && !session.solved; guard++) {
      const next = findSolutions(problem, session.board, session.userColor, size);
      if (next.length === 0) { stuck = true; break; }
      const res = session.play(next[0]);
      line.push(label(next[0]));
      if (res.verdict !== 'correct') { stuck = true; break; }
    }
    if (stuck || !session.solved) {
      errors.push(`끝까지 풀리지 않습니다(${line.join(' ') || '첫 수부터'} 이후 막힘).`);
    }
  }

  // 'point' 목표의 정답 좌표는 실제로 둘 수 있어야 한다
  if (problem.goal?.type === 'point') {
    for (const l of problem.goal.accept || []) {
      const i = typeof l === 'number' ? l : fromLabel(l, size);
      if (i < 0) { errors.push(`accept 좌표가 잘못되었습니다: ${l}`); continue; }
      if (!board.check(color, i).ok) errors.push(`accept 좌표 ${l}에 둘 수 없습니다.`);
    }
    if ((problem.goal.accept || []).length === 0) errors.push('accept 목록이 비어 있습니다.');
  }

  // 개별 코멘트가 달린 좌표는 실제로 존재하는 자리여야 한다
  for (const l of Object.keys(problem.comments || {})) {
    if (fromLabel(l, size) < 0) errors.push(`comments 좌표가 잘못되었습니다: ${l}`);
  }

  return {
    id: problem.id,
    ctx,
    ok: errors.length === 0,
    errors,
    solutions: solutions.map(label),
  };
}

/** LEVEL 하나를 검사한다. */
export function validateLevel(lv) {
  const results = [];
  const errors = [];
  if (!lv.title) errors.push('title이 없습니다.');
  if (!lv.steps || lv.steps.length === 0) errors.push('steps가 비어 있습니다.');

  const types = (lv.steps || []).map((s) => s.type);
  if (!types.includes(STEP.CONCEPT)) errors.push('개념 배우기 단계가 없습니다.');
  if (!types.includes(STEP.BOSS)) errors.push('BOSS 문제가 없습니다.');

  if (lv.formula) {
    for (const key of ['statement', 'why', 'when', 'exception']) {
      if (!lv.formula[key]) errors.push(`공식 카드에 ${key}가 비어 있습니다(요구사항 51: 4단계 설명 필수).`);
    }
  }

  for (const step of lv.steps || []) {
    if (step.problem) {
      results.push(validateProblem(step.problem, `LEVEL ${lv.id} · ${step.type}`));
    }
    if (step.type === STEP.QUIZ) {
      if (!Array.isArray(step.options) || step.options.length < 2) errors.push('퀴즈 보기가 부족합니다.');
      if (step.answer == null || step.answer < 0 || step.answer >= (step.options || []).length) {
        errors.push('퀴즈 정답 번호가 범위를 벗어났습니다.');
      }
      if (!step.explain) errors.push('퀴즈에 해설이 없습니다.');
    }
    if (step.type === STEP.FOLLOW) {
      if (!step.sequence || step.sequence.length === 0) errors.push('따라 두기 수순이 비어 있습니다.');
    }
  }

  return { id: lv.id, title: lv.title, errors, problems: results };
}

export function validateAll(levels) {
  return levels.map(validateLevel);
}
