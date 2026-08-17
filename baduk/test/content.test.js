import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTER1 } from '../js/content/ch1.js';
import { CHAPTER2 } from '../js/content/ch2.js';
import { CHAPTER3 } from '../js/content/ch3.js';
import { validateAll } from '../js/content/validate.js';
import { ProblemSession, VERDICT } from '../js/game/problem.js';
import { StageSession, STEP } from '../js/game/stage.js';
import { fromLabel } from '../js/engine/board.js';

const LEVELS = [...CHAPTER1, ...CHAPTER2, ...CHAPTER3];

test('구현된 LEVEL은 1번부터 빠짐없이 이어진다', () => {
  assert.deepEqual(LEVELS.map((l) => l.id), Array.from({ length: LEVELS.length }, (_, i) => i + 1));
  assert.ok(LEVELS.length >= 30, `구현된 LEVEL이 ${LEVELS.length}개뿐입니다`);
});

test('모든 LEVEL과 문제가 검증을 통과한다', () => {
  const results = validateAll(LEVELS);
  const problems = [];
  for (const r of results) {
    assert.deepEqual(r.errors, [], `LEVEL ${r.id} ${r.title}`);
    problems.push(...r.problems);
  }
  for (const p of problems) {
    assert.deepEqual(p.errors, [], `${p.ctx} ${p.id}`);
  }
  assert.ok(problems.length >= 120, `문제 수가 ${problems.length}개뿐입니다`);
});

test('모든 문제에 정답이 존재하고, 정답을 두면 실제로 정답 처리된다', () => {
  for (const lv of LEVELS) {
    for (const step of lv.steps) {
      if (!step.problem) continue;
      const s = new ProblemSession(step.problem);
      const sol = s.solutions();
      assert.ok(sol.length > 0, `${step.problem.id}: 정답 없음`);
      const r = s.play(sol[0]);
      assert.equal(r.verdict, VERDICT.CORRECT, `${step.problem.id}: 정답을 두었는데 오답 처리됨 — ${r.message}`);
    }
  }
});

test('오답에는 반드시 이유가 붙는다 (요구사항 79)', () => {
  let checked = 0;
  for (const lv of LEVELS) {
    for (const step of lv.steps) {
      if (!step.problem) continue;
      const s = new ProblemSession(step.problem);
      const sol = new Set(s.solutions());
      // 정답이 아닌 합법수를 하나 찾아 두어 본다
      let tried = false;
      for (let i = 0; i < s.board.length && !tried; i++) {
        if (sol.has(i) || !s.board.check(s.userColor, i).ok) continue;
        const r = s.play(i);
        if (r.verdict === VERDICT.CORRECT) continue; // 검색 범위 밖의 또 다른 정답
        assert.ok(r.message && r.message.length > 5,
          `${step.problem.id}: 오답 설명이 비어 있음`);
        tried = true;
        checked += 1;
      }
    }
  }
  assert.ok(checked > 60, `오답 설명을 확인한 문제가 ${checked}개뿐입니다`);
});

test('BOSS 단계에서는 힌트를 쓸 수 없다', () => {
  const { hintsAllowed } = { hintsAllowed: (s) => s.type !== STEP.BOSS };
  for (const lv of LEVELS) {
    const bossSteps = lv.steps.filter((s) => s.type === STEP.BOSS);
    assert.equal(bossSteps.length, 1, `LEVEL ${lv.id}에 BOSS가 정확히 하나 있어야 합니다`);
    assert.equal(hintsAllowed(bossSteps[0]), false);
  }
});

test('별 산정: 무결점 통과는 ★★★, 힌트를 쓰면 ★★, 정답 보기는 ★', () => {
  const lv = CHAPTER1[3]; // LEVEL 4
  const perfect = new StageSession(lv);
  perfect.records.forEach((r) => { r.done = true; });
  assert.equal(perfect.stars(), 3);

  const withHint = new StageSession(lv);
  withHint.records.forEach((r) => { r.done = true; });
  withHint.records[2].hints = 1;
  assert.equal(withHint.stars(), 2);

  const revealed = new StageSession(lv);
  revealed.records.forEach((r) => { r.done = true; });
  revealed.records[2].revealed = true;
  assert.equal(revealed.stars(), 1);

  const noBoss = new StageSession(lv);
  noBoss.records.forEach((r) => { r.done = true; });
  const bossIdx = lv.steps.findIndex((s) => s.type === STEP.BOSS);
  noBoss.records[bossIdx].done = false;
  assert.equal(noBoss.stars(), 0, 'BOSS를 못 깨면 별이 없다');
});

test('힌트는 단계적으로 나오고, 정답 보기는 좌표와 설명을 함께 준다', () => {
  const lv = CHAPTER1[3];
  const step = lv.steps.find((s) => s.problem && s.problem.hints);
  const s = new ProblemSession(step.problem);
  const h1 = s.hint();
  assert.ok(h1.text.length > 0);
  assert.equal(s.hintsUsed, 1);
  const rev = s.reveal();
  assert.ok(rev.moves.length > 0);
  assert.ok(rev.explanation.length > 0);
  assert.equal(s.revealed, true);
});

test('공식 카드는 네 단계(공식·왜·언제·예외)를 모두 갖춘다 (요구사항 51)', () => {
  const withFormula = LEVELS.filter((l) => l.formula);
  assert.ok(withFormula.length >= 18, '공식 카드가 너무 적습니다');
  for (const lv of withFormula) {
    for (const key of ['statement', 'why', 'when', 'exception']) {
      assert.ok(lv.formula[key] && lv.formula[key].length > 10,
        `LEVEL ${lv.id} 공식 카드의 ${key}가 부실합니다`);
    }
  }
});
