import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, BLACK, WHITE, EMPTY, setup, fromLabel, toLabel } from '../js/engine/board.js';
import {
  readLadder, canCapture, isTrueEye, eyeCount, isSelfAtari,
  groupsInAtari, isSafelyConnected, isConnected,
} from '../js/engine/analysis.js';

const L = (l) => fromLabel(l, 19);
const labels = (arr) => arr.map((i) => toLabel(i, 19));

test('단수 판정', () => {
  const b = setup({ black: ['D5', 'C4', 'E4'], white: ['D4'] });
  const atari = groupsInAtari(b, WHITE);
  assert.equal(atari.length, 1);
  assert.equal(atari[0].liberties.length, 1);
  assert.equal(toLabel(atari[0].liberties[0], 19), 'D3');
});

test('자충(스스로 단수 되는 수) 판정', () => {
  const b = setup({ white: ['C4', 'D5', 'E4'] });
  // D4는 놓는 순간 활로가 D3 하나뿐 → 자충
  assert.equal(isSelfAtari(b, BLACK, L('D4')), true);
  // 빈 곳 한가운데는 자충이 아니다
  assert.equal(isSelfAtari(b, BLACK, L('K10')), false);
});

test('축: 몰아서 끝까지 잡을 수 있다', () => {
  // 흑 D16 한 점, 백이 C16·D17로 막고 E17에 두어 축이 성립하는 형태
  const b = setup({ black: ['D16'], white: ['C16', 'D17', 'E17'] });
  const res = readLadder(b, L('D16'), WHITE);
  assert.equal(res.captured, true, '축으로 잡혀야 한다');
  assert.ok(res.sequence.length > 6, `축이라면 수순이 길어야 한다 (실제 ${res.sequence.length}수)`);
});

test('축머리가 있으면 축이 성립하지 않는다', () => {
  const base = setup({ black: ['D16'], white: ['C16', 'D17', 'E17'] });
  const path = readLadder(base, L('D16'), WHITE).sequence;
  // 축 진행로 한복판에 흑 돌(축머리)을 놓아본다
  const breaker = path[Math.floor(path.length / 2)];
  const b = setup({
    black: ['D16', toLabel(breaker, 19)],
    white: ['C16', 'D17', 'E17'],
  });
  assert.equal(readLadder(b, L('D16'), WHITE).captured, false,
    '진행로에 내 돌이 있으면(축머리) 축은 실패한다');

  // 다만 축이 이미 귀에 몰린 뒤에 놓인 돌은 축머리 구실을 하지 못한다.
  // "축머리는 아무 데나 놓으면 되는 것이 아니다"라는 LEVEL 34의 교육 내용과 같은 사실이다.
  const tooLate = setup({
    black: ['D16', toLabel(path[path.length - 1], 19)],
    white: ['C16', 'D17', 'E17'],
  });
  assert.equal(readLadder(tooLate, L('D16'), WHITE).captured, true);
});

test('축이 성립하지 않는 방향으로는 몰 수 없다', () => {
  // 백 돌이 한쪽에만 있으면 흑은 그냥 달아난다
  const b = setup({ black: ['D16'], white: ['C16'] });
  assert.equal(readLadder(b, L('D16'), WHITE).captured, false);
});

test('포획 수읽기: 단수인 돌은 잡을 수 있고, 중앙의 외돌은 국지적으로 잡을 수 없다', () => {
  const b = setup({ black: ['D5', 'C4', 'E4'], white: ['D4'] });
  const r = canCapture(b, L('D4'), BLACK, { maxDepth: 4 });
  assert.equal(r.captured, true);
  assert.equal(toLabel(r.move, 19), 'D3');

  const open = setup({ white: ['K10'] });
  assert.equal(canCapture(open, L('K10'), BLACK, { maxDepth: 6 }).captured, false);
});

test('완전한 눈과 가짜 눈', () => {
  // 귀의 눈: A1이 눈, 대각 B2가 상대 돌이면 가짜 눈
  const real = setup({ black: ['A2', 'B1', 'B2'] });
  assert.equal(isTrueEye(real, L('A1'), BLACK), true);

  const fake = setup({ black: ['A2', 'B1'], white: ['B2'] });
  assert.equal(isTrueEye(fake, L('A1'), BLACK), false, '귀에서는 대각 한 점만 상대여도 가짜 눈');

  // 중앙의 눈: 대각 하나까지는 허용, 둘이면 가짜
  const center = setup({ black: ['J10', 'L10', 'K11', 'K9'], white: ['J11'] });
  assert.equal(isTrueEye(center, L('K10'), BLACK), true);
  const center2 = setup({ black: ['J10', 'L10', 'K11', 'K9'], white: ['J11', 'L9'] });
  assert.equal(isTrueEye(center2, L('K10'), BLACK), false);
});

test('두 눈이면 산 돌', () => {
  const b = setup({
    black: ['A1', 'C1', 'E1', 'A2', 'B2', 'C2', 'D2', 'E2'],
  });
  const g = b.group(L('A1'));
  assert.equal(eyeCount(b, g), 2, 'B1과 D1 두 눈');
});

test('연결: 호구는 상대가 끊으러 와도 이을 수 있다', () => {
  // 호구 모양 — 흑 D4, E5, F4 사이의 E4로 백이 들어와도 흑이 잡아버린다
  const hogu = setup({ black: ['D4', 'E5', 'F4'] });
  assert.equal(isConnected(hogu, L('D4'), L('F4')), false, '아직 물리적으로는 떨어져 있다');
  assert.equal(isSafelyConnected(hogu, L('D4'), L('F4'), BLACK), true, '호구는 안전한 연결');
});

test('연결: 그냥 한 칸 벌린 두 점은 끊길 수 있다', () => {
  const b = setup({ black: ['D4', 'F4'], white: ['E5', 'E3'] });
  assert.equal(isSafelyConnected(b, L('D4'), L('F4'), BLACK), false);
});
