import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, BLACK, WHITE, fromLabel, toLabel } from '../js/engine/board.js';
import { solveTsumego, eyeRegion } from '../js/engine/tsumego.js';

const L = (l) => fromLabel(l, 19);
const labels = (arr) => arr.map((i) => toLabel(i, 19)).sort();

/**
 * 사활 기본형 표.
 * 좌표는 전부 "흑이 완전히 둘러싼 백 무리"를 만들도록 손으로 짜고,
 * 궁도가 정말 그 모양이 되는지도 함께 확인한다(오타로 궁도가 달라지는 것을 막는다).
 */
const SHAPES = [
  {
    name: '귀 2궁도 — 죽음',
    white: ['B1', 'B2', 'B3', 'A3'], black: ['A4', 'B4', 'C3', 'C2', 'C1'],
    region: ['A1', 'A2'], alive: false, kills: ['A1', 'A2'],
  },
  {
    name: '귀 직삼궁 — 급소 하나로 죽음',
    white: ['B1', 'B2', 'B3', 'B4', 'A4'], black: ['A5', 'B5', 'C4', 'C3', 'C2', 'C1'],
    region: ['A1', 'A2', 'A3'], alive: false, kills: ['A2'],
  },
  {
    name: '귀 직사궁 — 삶',
    white: ['B1', 'B2', 'B3', 'B4', 'B5', 'A5'], black: ['A6', 'B6', 'C5', 'C4', 'C3', 'C2', 'C1'],
    region: ['A1', 'A2', 'A3', 'A4'], alive: true, kills: [],
  },
  {
    name: '사각4궁 — 어디에 두어도 죽음',
    white: ['C1', 'C2', 'C3', 'B3', 'A3'], black: ['A4', 'B4', 'C4', 'D3', 'D2', 'D1'],
    region: ['A1', 'A2', 'B1', 'B2'], alive: false, kills: ['A1', 'A2', 'B1', 'B2'],
  },
  {
    name: '삿갓4궁 — 가운데 급소로만 죽음',
    white: ['B1', 'C1', 'C2', 'C3', 'B3', 'B4', 'A4'], black: ['A5', 'B5', 'C4', 'D3', 'D2', 'D1'],
    region: ['A1', 'A2', 'A3', 'B2'], alive: false, kills: ['A2'],
  },
  {
    name: '변 직오궁 — 삶',
    white: ['A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'F1'],
    black: ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'G2', 'G1'],
    region: ['A1', 'B1', 'C1', 'D1', 'E1'], alive: true, kills: [],
  },
  {
    name: '오궁도화 — 가운데 급소로 죽음',
    white: ['A4', 'B4', 'B3', 'C3', 'C2', 'C1'], black: ['A5', 'B5', 'C4', 'D3', 'D2', 'D1'],
    region: ['A1', 'A2', 'A3', 'B1', 'B2'], alive: false, kills: ['A2'],
  },
  {
    name: '변의 곡사궁 — 삶',
    white: ['B1', 'B2', 'C2', 'D2', 'D3', 'E3', 'F3', 'F2', 'F1'],
    black: ['A1', 'A2', 'B3', 'C3', 'D4', 'E4', 'F4', 'G3', 'G2', 'G1'],
    region: ['C1', 'D1', 'E1', 'E2'], alive: true, kills: [],
  },
  {
    name: '귀곡사 — 같은 곡사궁이라도 귀에서는 죽음',
    white: ['A4', 'B4', 'B3', 'B2', 'C2', 'C1'], black: ['A5', 'B5', 'C4', 'C3', 'D2', 'D1'],
    region: ['A1', 'A2', 'A3', 'B1'], alive: false, kills: ['A2'],
  },
  {
    name: '두 눈 — 삶',
    white: ['A2', 'B1', 'B2', 'B3', 'B4', 'A4'], black: ['A5', 'B5', 'C4', 'C3', 'C2', 'C1'],
    region: ['A1', 'A3'], alive: true, kills: [],
  },
];

for (const s of SHAPES) {
  test(`사활 완전탐색: ${s.name}`, () => {
    const board = setup({ size: 19, white: s.white, black: s.black });
    const anchor = L(s.white[0]);
    assert.deepEqual(labels(eyeRegion(board, anchor)), [...s.region].sort(), '궁도 모양이 다릅니다');
    const r = solveTsumego(board, anchor, BLACK);
    assert.equal(r.resolved, true, '완전탐색이 판정을 내지 못했습니다');
    assert.equal(r.alive, s.alive);
    assert.deepEqual(labels(r.kills), [...s.kills].sort());
  });
}

test('둘러싸이지 않은 무리는 완전탐색 대상이 아니다', () => {
  // 활로가 반상 전체로 열려 있으면 궁도를 잡을 수 없다 → resolved=false로 물러선다
  const board = setup({ size: 19, white: ['D4'], black: ['D5'] });
  assert.equal(eyeRegion(board, L('D4')), null);
  assert.equal(solveTsumego(board, L('D4'), BLACK).resolved, false);
});

test('국지 탐색이 틀렸던 삿갓4궁을 완전탐색이 바로잡는다', async () => {
  // 회귀 테스트. defenderCanEscape는 이 모양을 "살았다"고 판정했다.
  const { defenderCanEscape } = await import('../js/engine/analysis.js');
  const board = setup({
    size: 19,
    white: ['B1', 'C1', 'C2', 'C3', 'B3', 'B4', 'A4'],
    black: ['A5', 'B5', 'C4', 'D3', 'D2', 'D1'],
  });
  const after = board.clone();
  assert.equal(after.play(BLACK, L('A2')).ok, true);
  assert.equal(defenderCanEscape(after, L('B1'), BLACK), true, '국지 탐색은 여전히 살았다고 본다');
  assert.equal(solveTsumego(after, L('B1'), WHITE).alive, false, '완전탐색은 죽음으로 본다');
});

/* ─────────────────────────── 패 처리 ─────────────────────────── */

test('패로 갈리는 모양은 삶도 죽음도 아니라 "패"라고 답한다', () => {
  // 백 무리는 흑이 팻감을 쥐면 죽고, 백이 쥐면 산다. 어느 한쪽으로 단정하면 거짓말이다.
  const board = setup({
    size: 19,
    white: ['D19', 'B18', 'D18', 'B17', 'C17', 'D17'],
    black: ['E19', 'E18', 'E17', 'E16', 'A16', 'B16', 'C16', 'D16'],
  });
  const r = solveTsumego(board, L('D19'), BLACK);
  assert.equal(r.resolved, true);
  assert.equal(r.status, 'ko');
  assert.equal(r.alive, false, '패는 확정된 삶이 아니다');
  assert.equal(r.koInvolved, true);
  assert.deepEqual(labels(r.koKills), ['B19'], '패를 거는 자리');
  assert.deepEqual(r.kills, [], '패 없이 죽이는 자리는 없다');
});

test('팻감이 아예 없다고 보면 같은 모양이 삶으로 굳는다', () => {
  // 왜 예전 엔진이 패를 놓쳤는지 보여 주는 대조군.
  // 동형반복 금지만으로 읽으면 "되따낼 수 없는 쪽이 진다"가 되어 패가 삶으로 뭉개진다.
  const board = setup({
    size: 19,
    white: ['D19', 'B18', 'D18', 'B17', 'C17', 'D17'],
    black: ['E19', 'E18', 'E17', 'E16', 'A16', 'B16', 'C16', 'D16'],
  });
  assert.equal(solveTsumego(board, L('D19'), BLACK, { koThreats: 0 }).status, 'alive');
});

test('귀곡사는 탐색으로는 패, 규칙으로는 죽음', async () => {
  const { isCornerBentFour } = await import('../js/engine/tsumego.js');
  const board = setup({
    size: 19,
    white: ['A4', 'B4', 'B3', 'B2', 'C2', 'C1'],
    black: ['A5', 'B5', 'C4', 'C3', 'D2', 'D1'],
  });
  const region = eyeRegion(board, L('A4'));
  assert.equal(isCornerBentFour(board, region), true, '귀의 꺾인 넉 점');

  // 규칙을 끄면 엔진은 정직하게 "패"라고 답한다 — 실제로 패가 맞다.
  const raw = solveTsumego(board, L('A4'), BLACK, { rules: 'superko' });
  assert.equal(raw.status, 'ko');

  // 기본값은 한국·일본 규칙 — 귀곡사는 죽은 것으로 한다.
  const ruled = solveTsumego(board, L('A4'), BLACK);
  assert.equal(ruled.status, 'dead');
  assert.match(ruled.ruleApplied, /귀곡사/);
  assert.deepEqual(labels(ruled.kills), ['A2']);
});

test('변의 곡사궁은 귀곡사 규칙을 적용받지 않는다', async () => {
  const { isCornerBentFour } = await import('../js/engine/tsumego.js');
  const board = setup({
    size: 19,
    white: ['A2', 'B2', 'C2', 'D2', 'D1'], black: ['A3', 'B3', 'C3', 'D3', 'E2', 'E1'],
  });
  const region = eyeRegion(board, L('A2'));
  assert.equal(isCornerBentFour(board, region), false, '귀에 붙은 넉 점이 아니다');
});

test('팻감 수를 늘려도 확정된 삶·죽음은 흔들리지 않는다', () => {
  for (const s of SHAPES) {
    const board = setup({ size: 19, white: s.white, black: s.black });
    const anchor = L(s.white[0]);
    const base = solveTsumego(board, anchor, BLACK, { koThreats: 1 });
    for (const th of [2, 3]) {
      const more = solveTsumego(board, anchor, BLACK, { koThreats: th });
      assert.equal(more.status, base.status, `${s.name}: 팻감 ${th}개에서 결론이 바뀌었다`);
    }
  }
});
