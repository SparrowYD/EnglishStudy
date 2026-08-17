import test from 'node:test';
import assert from 'node:assert/strict';
import { Board, BLACK, WHITE, EMPTY, setup, toLabel, fromLabel, starPoints } from '../js/engine/board.js';

const L = (b, l) => fromLabel(l, b.size);

test('좌표 표기 왕복 변환 (I열 없음)', () => {
  assert.equal(toLabel(fromLabel('D4', 19), 19), 'D4');
  assert.equal(toLabel(fromLabel('T19', 19), 19), 'T19');
  assert.equal(toLabel(fromLabel('A1', 19), 19), 'A1');
  assert.equal(toLabel(fromLabel('K10', 19), 19), 'K10');
  assert.equal(fromLabel('I5', 19), -1, 'I열은 존재하지 않는다');
  // A1은 왼쪽 아래 = idx 18*19
  assert.equal(fromLabel('A1', 19), 18 * 19);
});

test('활로: 중앙 4, 변 3, 귀 2', () => {
  const b = new Board(19);
  b.play(BLACK, L(b, 'K10'));
  assert.equal(b.libertyCount(L(b, 'K10')), 4);
  const b2 = new Board(19);
  b2.play(BLACK, L(b2, 'A10'));
  assert.equal(b2.libertyCount(L(b2, 'A10')), 3);
  const b3 = new Board(19);
  b3.play(BLACK, L(b3, 'A1'));
  assert.equal(b3.libertyCount(L(b3, 'A1')), 2);
});

test('연결된 돌은 활로를 공유한다', () => {
  const b = setup({ black: ['D4', 'D5'] });
  const g = b.group(L(b, 'D4'));
  assert.equal(g.stones.length, 2);
  assert.equal(g.liberties.length, 6, '두 점이 이어지면 활로는 6');
});

test('돌 잡기: 활로를 모두 메우면 따낸다', () => {
  const b = setup({ black: ['D5', 'C4', 'E4'], white: ['D4'] });
  assert.equal(b.libertyCount(L(b, 'D4')), 1);
  const r = b.play(BLACK, L(b, 'D3'));
  assert.ok(r.ok);
  assert.equal(r.captured.length, 1);
  assert.equal(b.get(L(b, 'D4')), EMPTY);
  assert.equal(b.prisoners[BLACK], 1);
});

test('자살수 금지', () => {
  const b = setup({ white: ['D5', 'C4', 'E4', 'D3'] });
  const chk = b.check(BLACK, L(b, 'D4'));
  assert.equal(chk.ok, false);
  assert.equal(chk.reason, 'suicide');
  assert.match(chk.message, /자살수/);
});

test('상대를 따내는 수는 자살수가 아니다', () => {
  // 백 한 점이 단수 상태로 흑에 둘러싸임 → 흑이 그 자리에 두어 따내는 것은 합법
  const b = setup({
    black: ['C5', 'D6', 'E5', 'C3', 'D2', 'E3', 'B4', 'F4'],
    white: ['C4', 'D5', 'E4', 'D3'],
  });
  const r = b.play(BLACK, L(b, 'D4'));
  assert.ok(r.ok, '상대 돌을 따내면서 두는 수는 합법이어야 한다');
  assert.equal(r.captured.length, 4);
});

test('패: 방금 딴 자리를 바로 되따낼 수 없다', () => {
  // 전형적인 패 모양: 백 D4 한 점이 단수, 흑이 E4로 따내면 흑 E4도 단수가 된다
  const b = setup({
    black: ['C4', 'D5', 'D3'],
    white: ['D4', 'E5', 'E3', 'F4'],
  });
  assert.equal(b.libertyCount(L(b, 'D4')), 1);
  const r1 = b.play(BLACK, L(b, 'E4'));
  assert.ok(r1.ok);
  assert.equal(r1.captured.length, 1);
  assert.equal(b.ko, L(b, 'D4'), '패 금지점이 설정되어야 한다');
  // 백이 즉시 되따내면 반칙
  const chk = b.check(WHITE, L(b, 'D4'));
  assert.equal(chk.ok, false);
  assert.equal(chk.reason, 'ko');
});

test('여러 점을 한 번에 따내면 패가 아니다', () => {
  const b = setup({
    black: ['C5', 'D6', 'E6', 'F5', 'C4', 'D4', 'D3', 'E3', 'F4'],
    white: ['D5', 'E5'],
  });
  // 백 두 점의 마지막 활로 하나만 남기고, 흑이 메워 두 점을 따낸다
  const wg = b.group(L(b, 'D5'));
  assert.equal(wg.stones.length, 2);
  assert.equal(wg.liberties.length, 1);
  const r = b.play(BLACK, wg.liberties[0]);
  assert.ok(r.ok);
  assert.equal(r.captured.length, 2);
  assert.equal(b.ko, -1, '두 점 이상 따냈으면 패가 성립하지 않는다');
});

test('이미 돌이 있는 자리에는 둘 수 없다', () => {
  const b = setup({ black: ['D4'] });
  assert.equal(b.check(WHITE, L(b, 'D4')).reason, 'occupied');
});

test('setup 그림 표기', () => {
  const b = setup({ size: 9, anchor: 'A9', diagram: ['XO.', '.X.'] });
  assert.equal(b.get(fromLabel('A9', 9)), BLACK);
  assert.equal(b.get(fromLabel('B9', 9)), WHITE);
  assert.equal(b.get(fromLabel('B8', 9)), BLACK);
  assert.equal(b.get(fromLabel('C8', 9)), EMPTY);
});

test('화점은 19로에서 9개, D4/K10/Q16을 포함', () => {
  const pts = starPoints(19);
  assert.equal(pts.length, 9);
  assert.ok(pts.includes(fromLabel('D4', 19)));
  assert.ok(pts.includes(fromLabel('K10', 19)));
  assert.ok(pts.includes(fromLabel('Q16', 19)));
});

test('해시는 같은 반면이면 같고 다른 반면이면 다르다', () => {
  const a = setup({ black: ['D4', 'Q16'] });
  const b = setup({ black: ['Q16', 'D4'] });
  assert.equal(a.hash(), b.hash(), '착수 순서와 무관해야 한다');
  const c = setup({ black: ['D4'], white: ['Q16'] });
  assert.notEqual(a.hash(), c.hash());
});
