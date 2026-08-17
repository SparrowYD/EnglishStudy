import test from 'node:test';
import assert from 'node:assert/strict';
import { BLACK, WHITE, EMPTY, fromLabel, toLabel } from '../js/engine/board.js';
import { Game, PASS, RESIGN, handicapPoints } from '../js/engine/game.js';

const L = (l) => fromLabel(l, 19);

test('교대 착수와 차례 전환', () => {
  const g = new Game();
  assert.equal(g.turn, BLACK);
  g.play(L('D4'));
  assert.equal(g.turn, WHITE);
  assert.equal(g.board.get(L('D4')), BLACK);
  g.play(L('Q16'));
  assert.equal(g.board.get(L('Q16')), WHITE);
  assert.equal(g.moveNumber, 2);
});

test('두 번 연속 패스하면 대국이 끝난다', () => {
  const g = new Game();
  g.play(PASS);
  assert.equal(g.finished, false);
  const r = g.play(PASS);
  assert.equal(r.bothPassed, true);
  assert.equal(g.finished, true);
});

test('돌을 던지면 상대가 불계승', () => {
  const g = new Game();
  g.play(RESIGN, BLACK);
  assert.equal(g.finished, true);
  assert.equal(g.result.winner, WHITE);
  assert.match(g.result.text, /불계승/);
});

test('한 수 물림은 패 상태까지 정확히 되돌린다', () => {
  const g = new Game();
  const seq = ['C4', 'D4', 'D5', 'E5', 'D3', 'E3', 'E4'];
  // 백 D4 한 점이 잡히는 패 모양을 만든 뒤
  for (let i = 0; i < seq.length; i++) g.play(L(seq[i]));
  const before = g.board.hash();
  const turnBefore = g.turn;
  g.play(L('K10'));
  g.undo();
  assert.equal(g.board.hash(), before, '반면이 그대로 복원되어야 한다');
  assert.equal(g.turn, turnBefore);
  assert.equal(g.moveNumber, seq.length);
});

test('동형반복(수퍼코) 금지', () => {
  const g = new Game({ superko: true });
  // 패 모양을 만든다: 백 D4가 단수, 흑 E4로 따냄
  const setupMoves = [
    ['C4', BLACK], ['D4', WHITE], ['D5', BLACK], ['E5', WHITE],
    ['D3', BLACK], ['E3', WHITE], ['K10', BLACK], ['F4', WHITE],
  ];
  for (const [l, c] of setupMoves) {
    const r = g.play(L(l), c);
    assert.ok(r.ok, `${l} 착수 실패: ${r.message}`);
  }
  const r1 = g.play(L('E4'), BLACK);
  assert.ok(r1.ok);
  assert.equal(r1.captured.length, 1, '백 D4 한 점을 따낸다');
  // 백은 즉시 되따낼 수 없다(단수패)
  assert.equal(g.check(L('D4'), WHITE).ok, false);
  // 팻감을 쓰고 나면 되따낼 수 있다
  g.play(L('Q16'), WHITE);
  g.play(L('R16'), BLACK);
  const r2 = g.play(L('D4'), WHITE);
  assert.ok(r2.ok, '팻감을 쓴 뒤에는 되따낼 수 있어야 한다');
});

test('접바둑: 흑이 미리 놓고 백이 먼저 둔다', () => {
  const g = new Game({ handicap: 4 });
  assert.equal(g.turn, WHITE, '접바둑은 백부터');
  assert.equal(g.board.stoneCount(BLACK), 4);
  for (const p of handicapPoints(19, 4)) {
    assert.equal(g.board.get(p), BLACK);
  }
  assert.equal(g.komi, 0.5, '접바둑의 기본 덤은 0.5');
});

test('접바둑 배석은 2~9점 모두 화점 위에 놓인다', () => {
  for (let h = 2; h <= 9; h++) {
    const pts = handicapPoints(19, h);
    assert.equal(pts.length, h, `${h}점 배석`);
    assert.equal(new Set(pts).size, h, '중복 없이');
  }
  assert.ok(handicapPoints(19, 2).includes(L('D4')));
  assert.ok(handicapPoints(19, 5).includes(L('K10')), '5점은 천원 포함');
});

test('boardAt으로 임의 수순의 반면을 복원한다 (복기용)', () => {
  const g = new Game();
  const seq = ['D4', 'Q16', 'D16', 'Q4', 'K10'];
  for (const l of seq) g.play(L(l));
  const b3 = g.boardAt(3);
  assert.equal(b3.stoneCount(BLACK) + b3.stoneCount(WHITE), 3);
  assert.equal(b3.get(L('Q4')), EMPTY);
  assert.equal(b3.get(L('D16')), BLACK);
});

test('SGF 내보내기', () => {
  const g = new Game({ komi: 6.5 });
  g.play(L('D4'));   // 좌하 화점
  g.play(L('Q16'));
  const sgf = g.toSGF({ playerBlack: '나', playerWhite: '컴퓨터' });
  assert.match(sgf, /SZ\[19\]/);
  assert.match(sgf, /KM\[6.5\]/);
  assert.match(sgf, /;B\[dp\]/, 'D4 = dp (x=3, y=15)');
  assert.match(sgf, /;W\[pd\]/, 'Q16 = pd');
});

test('끝난 대국에는 더 둘 수 없다', () => {
  const g = new Game();
  g.play(PASS); g.play(PASS);
  const r = g.play(L('D4'));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'finished');
});
