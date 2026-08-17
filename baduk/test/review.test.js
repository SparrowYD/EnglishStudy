import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, PASS } from '../js/engine/game.js';
import { BLACK, WHITE, setup, fromLabel, toLabel } from '../js/engine/board.js';
import { LocalBasicAI } from '../js/ai/LocalBasicAI.js';
import { analyzeGame, keyMoments, toProblem, summarize, markFor, MARKS } from '../js/game/review.js';
import { ProblemSession, VERDICT } from '../js/game/problem.js';
import { generateLadderProblem, verifySequence, LEVELS as READ } from '../js/game/reading.js';
import { Progress } from '../js/game/progress.js';

const L = (l, s = 19) => fromLabel(l, s);

test('수 평가 기호는 손해가 클수록 나빠진다', () => {
  assert.equal(markFor(-1).key, 'brilliant');
  assert.equal(markFor(1).key, 'good');
  assert.equal(markFor(8).key, 'ok');
  assert.equal(markFor(20).key, 'slack');
  assert.equal(markFor(40).key, 'mistake');
  assert.equal(markFor(500).key, 'blunder');
  assert.equal(MARKS.length, 6, '💎 ⭐ ○ △ ⚠ ❗ 여섯 단계');
});

test('복기: 일부러 둔 나쁜 수가 실수로 잡힌다', async () => {
  // 흑 두 점이 단수인데 흑이 엉뚱한 곳을 두는 상황을 만든다
  const board = setup({ black: ['D4', 'E4'], white: ['C4', 'D5', 'E5', 'D3', 'E3'] });
  const game = new Game({ setupBoard: board });
  game.turn = BLACK;
  game.play(L('T1'), BLACK);        // 단수를 방치한 최악의 수
  game.play(L('F4'), WHITE);        // 백이 잡는다

  const engine = new LocalBasicAI({ kyu: 1, seed: 4 });
  const notes = await analyzeGame(game, engine, { onlyColor: BLACK });
  assert.equal(notes.length, 1);
  const n = notes[0];
  assert.ok(n.delta > 0, `손해가 잡혀야 한다 (delta=${n.delta})`);
  assert.ok(['slack', 'mistake', 'blunder'].includes(n.mark.key), `실수로 분류되어야 한다 (${n.mark.key})`);
  assert.ok(n.best, 'AI 추천수가 있어야 한다');
  assert.ok(n.comment.length > 0, '설명이 붙어야 한다');
});

test('복기: 중요한 장면은 서로 겹치지 않게 뽑는다', () => {
  const fake = Array.from({ length: 40 }, (_, i) => ({
    n: i + 1, delta: 40 - i, mark: markFor(40 - i), category: i % 3 === 0 ? '놓친 따냄' : null,
  }));
  const picked = keyMoments(fake, 8);
  assert.ok(picked.length <= 8);
  for (let i = 1; i < picked.length; i++) {
    assert.ok(picked[i].n - picked[i - 1].n >= 6, '너무 가까운 장면이 함께 뽑혔다');
  }
  assert.deepEqual(picked.map((p) => p.n), [...picked.map((p) => p.n)].sort((a, b) => a - b), '수순 오름차순');
});

test('실수 장면이 실제로 풀 수 있는 문제로 변환된다 (요구사항 69)', async () => {
  const board = setup({ black: ['D4', 'E4'], white: ['C4', 'D5', 'E5', 'D3', 'E3'] });
  const game = new Game({ setupBoard: board });
  game.turn = BLACK;
  game.play(L('T1'), BLACK);
  game.play(L('F4'), WHITE);

  const engine = new LocalBasicAI({ kyu: 1, seed: 4 });
  const notes = await analyzeGame(game, engine, { onlyColor: BLACK });
  const problem = toProblem(notes[0], { size: 19, gameId: 'test', playerName: '나' });

  assert.ok(problem, '문제가 만들어져야 한다');
  assert.ok(problem.prompt.includes('나'), '누구의 대국에서 나왔는지 밝힌다');
  assert.equal(problem.toPlay, BLACK);

  // 만들어진 문제가 실제로 풀리는지 확인 — 정답이 없는 문제를 저장하면 안 된다
  const session = new ProblemSession(problem);
  const sols = session.solutions();
  assert.ok(sols.length > 0, '만들어진 문제에 정답이 있어야 한다');
  assert.equal(session.play(sols[0]).verdict, VERDICT.CORRECT);
});

test('복기 요약은 기호별 개수를 센다', () => {
  const notes = [
    { mark: markFor(0), delta: 0 }, { mark: markFor(2), delta: 2 },
    { mark: markFor(30), delta: 30 }, { mark: markFor(80), delta: 80 },
  ];
  const s = summarize(notes);
  assert.ok(s.text.includes('실수'));
  assert.ok(s.averageLoss > 0);
});

/* ---------------- 수읽기 훈련 ---------------- */

test('수읽기 문제는 난이도에 맞는 길이로 생성된다', () => {
  for (const key of ['beginner', 'intermediate', 'advanced']) {
    const spec = READ[key];
    let made = 0;
    for (let s = 0; s < 5; s++) {
      const gen = generateLadderProblem(key, 5000 + s * 91);
      if (!gen) continue;
      made++;
      assert.ok(gen.sequence.length >= spec.range[0] && gen.sequence.length <= spec.range[1],
        `${key}: 수순 길이 ${gen.sequence.length}가 범위 밖`);
      assert.ok(gen.mySequence && gen.mySequence.length === gen.expectedMoves,
        `${key}: 기대 수순과 실제 정답 수순이 다르다`);
      assert.ok(gen.expectedMoves >= spec.moves[0], `${key}: 내 수 ${gen.expectedMoves}가 너무 짧다`);
    }
    assert.ok(made >= 4, `${key} 난이도 문제 생성이 ${made}/5회밖에 되지 않았다`);
  }
});

test('수읽기: 정답 수순은 통과하고 어긋난 수순은 이유와 함께 거절된다', () => {
  let checked = 0;
  for (const key of ['beginner', 'intermediate', 'advanced']) {
    for (let s = 0; s < 3; s++) {
      const gen = generateLadderProblem(key, 6000 + s * 137);
      if (!gen) continue;
      const mine = gen.mySequence;
      const ok = verifySequence(gen.problem, mine);
      assert.equal(ok.ok, true, `${key}: 정답 수순이 거절됨 — ${ok.message}`);

      const wrong = mine.slice();
      wrong[0] = gen.sequence[1];            // 반대쪽에서 몰기
      const bad = verifySequence(gen.problem, wrong);
      assert.equal(bad.ok, false, `${key}: 틀린 수순이 통과됨`);
      assert.ok(bad.message.length > 5, '거절 사유가 있어야 한다');
      checked++;
    }
  }
  assert.ok(checked >= 6, `검증한 문제가 ${checked}개뿐`);
});

/* ---------------- 저장·해금·기력 ---------------- */

test('진행 상태: 별 1개면 다음 LEVEL이 열리고, 종합시험은 ★★가 필요하다', () => {
  const p = new Progress();
  assert.equal(p.isUnlocked(1), true);
  assert.equal(p.isUnlocked(2), false);

  p.completeLevel(1, { stars: 1, seconds: 30 });
  assert.equal(p.isUnlocked(2), true);

  for (let i = 2; i <= 9; i++) p.completeLevel(i, { stars: 1, seconds: 10 });
  p.completeLevel(10, { stars: 1, seconds: 10 });
  assert.equal(p.isUnlocked(11), false, '종합시험은 ★ 하나로는 부족하다');
  p.completeLevel(10, { stars: 2, seconds: 10 });
  assert.equal(p.isUnlocked(11), true);
});

test('예상 기력은 18급에서 시작하고 승급전을 통과해야 오른다', () => {
  const p = new Progress();
  assert.equal(p.kyu, 18);
  assert.equal(p.canTakePromotion(), false);
  p.addPoints(10000);
  assert.equal(p.canTakePromotion(), true);
  assert.equal(p.promote(), 17);
  assert.equal(p.canTakePromotion(), false, '승급 직후에는 점수가 초기화된다');
});

test('최근 성적으로 난이도 조절을 제안하되 자동으로 바꾸지 않는다 (요구사항 61)', () => {
  const p = new Progress();
  p.setSetting('aiKyu', 10);
  for (let i = 0; i < 8; i++) {
    p.recordGame({ aiKyu: 10, myColor: BLACK, handicap: 0, result: { won: true }, moves: 100 });
  }
  const s = p.difficultySuggestion();
  assert.equal(s.suggest, 'up');
  assert.match(s.text, /올려/);
  assert.equal(p.settings.aiKyu, 10, '제안만 하고 설정을 바꾸지는 않는다');
});

test('내 대국 문제는 같은 국면을 중복 저장하지 않는다', () => {
  const p = new Progress();
  const problem = { title: 't', setup: { black: ['D4'], white: [] }, toPlay: BLACK, goal: { type: 'point', accept: ['D5'] } };
  assert.ok(p.addMyProblem({ ...problem }));
  assert.equal(p.addMyProblem({ ...problem }), null, '중복은 저장되지 않는다');
  assert.equal(p.state.myProblems.length, 1);
});

test('복습 간격은 맞히면 늘고 틀리면 처음으로 돌아간다', () => {
  const p = new Progress();
  const r1 = p.recordReview('x', true);
  assert.equal(r1.interval, 1);
  const r2 = p.recordReview('x', true);
  assert.ok(r2.interval > r1.interval);
  const r3 = p.recordReview('x', false);
  assert.equal(r3.interval, 1);
  assert.equal(r3.lapses, 1);
});
