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

/* ─────────────────────── 빅(seki) — 한국식 계가 ─────────────────────── */

/**
 * 눈 있는 빅. 9로 반면 왼쪽 아래에 만든다.
 *
 *   X X X X X X          C1이 아무도 메울 수 없는 자리(빅의 공배)다.
 *   O O O O . X          흑이 메우면 흑 D1이 잡히고, 백이 메우면 백 무리가 잡힌다.
 *   . O . X . X          그래서 백의 눈 A1은 **집이 되지 않는다.**
 */
const SEKI_BOARD = {
  size: 9,
  black: ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'F2', 'F1', 'D1'],
  white: ['A2', 'B2', 'C2', 'D2', 'B1'],
};

test('빅: 서로 메울 수 없는 공배를 찾아낸다', () => {
  const b = setup(SEKI_BOARD);
  const s = score(b, { komi: 0, rules: 'territory', dead: new Set() });
  assert.equal(s.sekiGroups, 2, '백 무리와 흑 D1이 빅에 걸려 있다');
});

test('한국식 계가: 빅 안의 빈 점은 집이 아니다', () => {
  const b = setup(SEKI_BOARD);
  const s = score(b, { komi: 0, rules: 'territory', dead: new Set() });
  assert.equal(s.sekiPoints, 1, '백의 눈 A1 한 점이 집에서 빠진다');
  assert.equal(s.whiteTerritory, 0, '빅에 걸린 백은 집이 없다');
  assert.equal(s.territory[fromLabel('A1', 9)], 3, '반면에 빅 표식(SEKI)으로 남는다');
});

test('중국식 계가에서는 같은 자리를 그대로 센다', () => {
  const b = setup(SEKI_BOARD);
  const s = score(b, { komi: 0, rules: 'area', dead: new Set() });
  assert.equal(s.sekiPoints, 0, '점 계가는 반면의 모든 점을 세므로 빼지 않는다');
  assert.equal(s.whiteTerritory, 1, 'A1은 백의 점으로 남는다');
});

test('빅 판정이 대국 중간의 넓은 빈 곳을 빅으로 오해하지 않는다', () => {
  // 화점 네 개만 놓인 초반. 서로 마주 보는 돌이 있어도 빅이 아니다.
  const b = setup({ size: 19, black: ['D4', 'Q16'], white: ['Q4', 'D16'] });
  const s = score(b, { komi: 0, rules: 'territory', dead: new Set() });
  assert.equal(s.sekiGroups, 0);
  assert.equal(s.sekiPoints, 0);
});

test('빅 판정이 그냥 죽은 돌을 빅으로 만들지 않는다', () => {
  // 흑에게 완전히 둘러싸인 백 한 점. 흑이 메우면 잡히지 않으므로 빅이 아니다.
  const b = setup({
    size: 9,
    black: ['B1', 'B2', 'C2', 'D2', 'D1', 'C4', 'B4', 'D4', 'A4'],
    white: ['C1'],
  });
  const s = score(b, { komi: 0, rules: 'territory', dead: new Set() });
  assert.equal(s.sekiGroups, 0);
});

test('빅에 걸린 무리가 아닌 산 무리의 집은 그대로 센다', () => {
  const b = setup(SEKI_BOARD);
  const s = score(b, { komi: 0, rules: 'territory', dead: new Set() });
  assert.ok(s.blackTerritory > 50, `바깥 흑집은 그대로여야 합니다 (${s.blackTerritory})`);
});
