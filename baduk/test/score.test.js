import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, BLACK, WHITE, EMPTY, setup, fromLabel } from '../js/engine/board.js';
import { score, bensonPassAlive, estimateDeadStones, verdictOf } from '../js/engine/score.js';

test('집 계산: 한쪽 색만 둘러싼 영역이 그 색의 집', () => {
  // 5로 반면을 B열(흑)과 D열(백)으로 나눈다
  const b = setup({
    size: 5,
    black: ['B1', 'B2', 'B3', 'B4', 'B5'],
    white: ['D1', 'D2', 'D3', 'D4', 'D5'],
  });
  const s = score(b, { komi: 0, rules: 'territory' });
  assert.equal(s.blackTerritory, 5, 'A열 5점이 흑집');
  assert.equal(s.whiteTerritory, 5, 'E열 5점이 백집');
  assert.equal(s.dame, 5, 'C열 5점은 공배');
  assert.equal(s.diff, 0);
});

test('중국식(area)과 한국·일본식(territory)은 계산 방식이 다르다', () => {
  const b = setup({
    size: 5,
    black: ['B1', 'B2', 'B3', 'B4', 'B5'],
    white: ['D1', 'D2', 'D3', 'D4', 'D5'],
  });
  const t = score(b, { komi: 0, rules: 'territory' });
  const a = score(b, { komi: 0, rules: 'area' });
  assert.equal(t.black, 5);
  assert.equal(a.black, 10, '중국식은 반상의 내 돌도 함께 센다');
  // 어느 규칙이든 승패(차이)는 같다
  assert.equal(t.diff, a.diff);
});

test('덤은 백에게 더한다', () => {
  const b = setup({ size: 5, black: ['B1', 'B2', 'B3', 'B4', 'B5'], white: ['D1', 'D2', 'D3', 'D4', 'D5'] });
  const s = score(b, { komi: 6.5, rules: 'territory' });
  assert.equal(s.white, 11.5);
  assert.equal(s.winner, WHITE);
  assert.match(s.text, /^백 6.5집 승$/);
});

test('Benson: 두 눈을 가진 돌은 무조건 산 돌', () => {
  // B1과 D1 두 개의 눈을 가진 흑 대마
  const b = setup({
    black: ['A1', 'C1', 'E1', 'A2', 'B2', 'C2', 'D2', 'E2'],
  });
  const alive = bensonPassAlive(b, BLACK);
  assert.ok(alive.has(fromLabel('A1', 19)), '두 눈이 있으므로 무조건 삶');
  assert.ok(alive.has(fromLabel('C2', 19)));
});

test('Benson: 눈이 하나뿐이면 무조건 삶이 아니다', () => {
  const b = setup({
    black: ['A1', 'C1', 'A2', 'B2', 'C2'],
  });
  const alive = bensonPassAlive(b, BLACK);
  assert.equal(alive.size, 0, '외눈은 무조건 삶에 해당하지 않는다');
});

test('사석 자동 판정: 상대 산 돌에 완전히 갇힌 돌은 죽은 돌', () => {
  // 9로. 백은 2선을 모두 차지하고 1선에 E1·G1 두 눈을 가져 무조건 살아 있다.
  // 흑 B1·C1 두 점은 A1 한 점짜리 눈밖에 없어 죽은 돌이다.
  const b = setup({
    size: 9,
    black: ['B1', 'C1'],
    white: [
      'A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2', 'J2',
      'D1', 'F1', 'H1', 'J1',
    ],
  });
  assert.ok(bensonPassAlive(b, WHITE).has(fromLabel('A2', 9)), '백은 무조건 산 돌이어야 한다');
  const dead = estimateDeadStones(b);
  assert.ok(dead.has(fromLabel('B1', 9)), '갇힌 흑 두 점은 죽은 돌로 추정되어야 한다');
  assert.ok(dead.has(fromLabel('C1', 9)));
});

test('사석 판정은 산 돌을 죽었다고 하지 않는다', () => {
  const b = setup({
    black: ['A1', 'C1', 'E1', 'A2', 'B2', 'C2', 'D2', 'E2'],
  });
  const dead = estimateDeadStones(b);
  assert.equal(dead.size, 0);
});

test('죽은 돌은 들어내고 상대 집으로 센다', () => {
  const b = setup({
    size: 5,
    black: ['C1', 'C2', 'C3', 'C4', 'C5', 'A1'],
    white: ['A2', 'B2', 'B1'],
  });
  const dead = new Set([fromLabel('A1', 5)]);
  const withDead = score(b, { komi: 0, rules: 'territory', dead, prisoners: [0, 0, 0] });
  // A1이 들어내지면 백은 A1 한 점을 잡은 것으로 계산된다
  assert.equal(withDead.white >= 1, true);
});

test('형세판단 5단계 표현', () => {
  assert.equal(verdictOf(20).text, '흑 우세');
  assert.equal(verdictOf(6).text, '흑 약간 우세');
  assert.equal(verdictOf(0).text, '호각');
  assert.equal(verdictOf(-6).text, '백 약간 우세');
  assert.equal(verdictOf(-20).text, '백 우세');
});
