import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, PASS, RESIGN } from '../js/engine/game.js';
import { BLACK, WHITE, EMPTY, setup, fromLabel, toLabel } from '../js/engine/board.js';
import { LocalBasicAI } from '../js/ai/LocalBasicAI.js';
import { EducationalAI } from '../js/ai/EducationalAI.js';
import { KataGoAdapter } from '../js/ai/KataGoAdapter.js';
import { EngineRegistry } from '../js/ai/AIEngine.js';
import { rankConfig, KYU_LIST } from '../js/ai/ranks.js';
import { isTrueEye } from '../js/engine/analysis.js';
import { score, estimateDeadStones } from '../js/engine/score.js';

async function selfPlay(bKyu, wKyu, size = 9, seed = 1, komi = 0.5) {
  const game = new Game({ size, komi, rules: 'territory' });
  const ais = {
    [BLACK]: new LocalBasicAI({ kyu: bKyu, seed, allowResign: false }),
    [WHITE]: new LocalBasicAI({ kyu: wKyu, seed: seed + 31337, allowResign: false }),
  };
  const illegal = [];
  const eyeFills = [];
  while (!game.finished && game.moveNumber < size * size * 3) {
    const color = game.turn;
    const before = game.board.clone();
    const { move } = await ais[color].genMove(game, color);
    if (move >= 0 && isTrueEye(before, move, color)) eyeFills.push(move);
    const res = game.play(move, color);
    if (!res.ok) { illegal.push({ move, reason: res.reason }); game.play(PASS, color); }
  }
  const s = score(game.board, {
    komi, rules: 'territory', dead: estimateDeadStones(game.board), prisoners: game.board.prisoners,
  });
  return { game, s, illegal, eyeFills };
}

test('급수 설정은 18급에서 1급으로 갈수록 단조롭게 강해진다', () => {
  let prev = null;
  for (const kyu of KYU_LIST) {
    const c = rankConfig(kyu);
    if (prev) {
      assert.ok(c.readDepth >= prev.readDepth, `${kyu}급 수읽기 깊이`);
      assert.ok(c.atariAwareness >= prev.atariAwareness, `${kyu}급 단수 인식`);
      assert.ok(c.visionRadius >= prev.visionRadius, `${kyu}급 시야`);
      assert.ok(c.blunder <= prev.blunder, `${kyu}급 실수 확률`);
      assert.ok(c.blunderMargin <= prev.blunderMargin, `${kyu}급 실수 허용폭`);
    }
    prev = c;
  }
  assert.equal(rankConfig(18).kyu, 18);
  assert.equal(rankConfig(1).kyu, 1);
  assert.equal(rankConfig(99).kyu, 18, '범위 밖의 약한 값은 가장 약한 18급으로 맞춘다');
  assert.equal(rankConfig(0).kyu, 1, '범위 밖의 센 값은 가장 센 1급으로 맞춘다');
});

test('AI는 반칙수를 두지 않고, 자기 눈을 메우지 않으며, 대국이 끝난다', async () => {
  for (const [b, w] of [[18, 18], [10, 10], [1, 1], [18, 1]]) {
    const { game, illegal, eyeFills } = await selfPlay(b, w, 9, 4242);
    assert.deepEqual(illegal, [], `${b}급 vs ${w}급 반칙수`);
    assert.deepEqual(eyeFills.map((i) => toLabel(i, 9)), [], `${b}급 vs ${w}급 자기 눈 메움`);
    assert.ok(game.finished, `${b}급 vs ${w}급 대국이 끝나지 않았다 (${game.moveNumber}수)`);
  }
});

test('센 쪽이 약한 쪽을 이긴다 — 급수 표시가 헛되지 않다', async () => {
  const results = [];
  for (let i = 0; i < 5; i++) {
    const { s } = await selfPlay(18, 5, 9, 900 + i * 37);
    results.push(s.winner === WHITE);
  }
  const strongWins = results.filter(Boolean).length;
  assert.ok(strongWins >= 4, `5급이 18급에게 ${strongWins}/5판만 이겼습니다`);
});

test('AI는 마지막에 자기 집을 메우지 않고 패스한다', async () => {
  const { game, s } = await selfPlay(3, 3, 9, 77);
  assert.ok(game.finished);
  const last = game.moves.slice(-2);
  assert.ok(last.every((m) => m.idx === PASS), '마지막 두 수는 패스여야 한다');
  // 자기 집을 메우지 않았다면 양쪽 모두 집이 남아 있고, 공배는 다 메워져 있어야 한다
  assert.ok(s.blackTerritory > 0, `흑이 자기 집을 다 메웠습니다 (흑집 ${s.blackTerritory})`);
  assert.ok(s.whiteTerritory > 0, `백이 자기 집을 다 메웠습니다 (백집 ${s.whiteTerritory})`);
  assert.equal(s.dame, 0, '공배를 남겨 둔 채 끝내면 안 된다');
});

test('AI는 단수당한 자기 돌을 알아본다 (급수가 높을수록 확실히)', async () => {
  // 흑 두 점이 단수. 살리는 수는 E4 하나뿐이다.
  const board = setup({ black: ['D4', 'E4'], white: ['C4', 'D5', 'E5', 'D3', 'E3'] });
  const game = new Game({ setupBoard: board });
  game.turn = BLACK;
  const ai = new LocalBasicAI({ kyu: 1, seed: 5 });
  const { move } = await ai.genMove(game, BLACK);
  assert.equal(toLabel(move, 19), 'F4', '1급 AI는 유일한 탈출구를 찾아야 한다');
});

test('AI는 잡을 수 있는 돌을 잡는다', async () => {
  const board = setup({ white: ['D4'], black: ['C4', 'D5', 'E4'] });
  const game = new Game({ setupBoard: board });
  game.turn = BLACK;
  for (const kyu of [1, 5, 10]) {
    const ai = new LocalBasicAI({ kyu, seed: 11 });
    const { move } = await ai.genMove(game, BLACK);
    assert.equal(toLabel(move, 19), 'D3', `${kyu}급 AI가 눈앞의 한 점을 놓쳤습니다`);
  }
});

test('강한 AI는 축으로 잡히는 곳으로 달아나지 않는다', async () => {
  // 흑 D16이 단수, E16으로 뻗으면 축으로 잡힌다
  const board = setup({ black: ['D16'], white: ['C16', 'D17', 'E17', 'D15'] });
  const game = new Game({ setupBoard: board });
  game.turn = BLACK;
  const ai = new LocalBasicAI({ kyu: 1, seed: 3 });
  const ranked = await ai.topMoves(game, BLACK, 30);
  const escape = ranked.find((m) => toLabel(m.move, 19) === 'E16');
  if (escape) {
    const better = ranked[0];
    assert.notEqual(toLabel(better.move, 19), 'E16',
      '1급 AI가 축으로 잡히는 탈출을 최선으로 골랐습니다');
  }
});

test('학습 AI는 같은 국면에서 항상 같은 수를 둔다', async () => {
  const make = () => {
    const g = new Game();
    g.play(fromLabel('D4', 19));
    return g;
  };
  const a = new EducationalAI({ kyu: 5 });
  const b = new EducationalAI({ kyu: 5 });
  const m1 = await a.genMove(make(), WHITE);
  const m2 = await b.genMove(make(), WHITE);
  assert.equal(m1.move, m2.move);
  assert.ok(m1.reason && m1.reason.length > 0, '학습 AI는 이유를 설명해야 한다');
});

test('학습 AI는 허용된 착점만 둔다', async () => {
  const game = new Game();
  game.play(fromLabel('D4', 19));
  const ai = new EducationalAI({ kyu: 5 });
  ai.setAllowed(['Q16', 'Q4']);
  const { move } = await ai.genMove(game, WHITE);
  assert.ok(['Q16', 'Q4'].includes(toLabel(move, 19)));
});

test('KataGo를 쓸 수 없으면 내장 AI로 내려간다 (버튼만 있는 UI를 만들지 않는다)', async () => {
  const registry = new EngineRegistry()
    .register('katago', (o) => new KataGoAdapter({ ...o, endpoint: null }), { label: 'KataGo' })
    .register('local', (o) => new LocalBasicAI(o), { label: '내장 AI' });

  const av = await new KataGoAdapter({ endpoint: null }).available();
  assert.equal(av.ok, false);
  assert.match(av.reason, /중계 서버/);

  const { engine, key, fallback, notes } = await registry.create('katago', { kyu: 10 });
  assert.equal(key, 'local');
  assert.equal(fallback, true);
  assert.ok(notes.length > 0, '왜 내려갔는지 이유가 남아야 한다');
  const game = new Game({ size: 9 });
  const { move } = await engine.genMove(game, BLACK);
  assert.ok(move >= 0, '대체 엔진으로 실제 착수가 가능해야 한다');
});

test('후보수 목록은 힌트에 쓸 수 있도록 이유와 함께 나온다 (선생님 대국)', async () => {
  const board = setup({ white: ['D4'], black: ['C4', 'D5'] });
  const game = new Game({ setupBoard: board });
  game.turn = BLACK;
  const ai = new LocalBasicAI({ kyu: 3, seed: 9 });
  const top = await ai.topMoves(game, BLACK, 3);
  assert.equal(top.length, 3);
  for (const t of top) {
    assert.ok(Number.isFinite(t.score));
    assert.ok(t.reason && t.reason.length > 0);
    assert.equal(board.cells[t.move], EMPTY);
  }
  assert.ok(top[0].score >= top[1].score && top[1].score >= top[2].score, '점수 순으로 정렬되어야 한다');
});
