/**
 * AI 대국 실험: node tools/ai-match.js [흑급수] [백급수] [판수] [판크기]
 * 기력 설정이 실제로 강약 차이를 만드는지 확인한다.
 */
import { Game, PASS, RESIGN } from '../js/engine/game.js';
import { BLACK, WHITE, toLabel } from '../js/engine/board.js';
import { LocalBasicAI } from '../js/ai/LocalBasicAI.js';
import { score, estimateDeadStones } from '../js/engine/score.js';

const blackKyu = Number(process.argv[2] || 18);
const whiteKyu = Number(process.argv[3] || 5);
const games = Number(process.argv[4] || 4);
const size = Number(process.argv[5] || 9);

export async function playGame(bKyu, wKyu, size, seed, maxMoves = size * size * 3) {
  const game = new Game({ size, komi: 6.5, rules: 'territory' });
  const ais = {
    [BLACK]: new LocalBasicAI({ kyu: bKyu, seed, allowResign: false }),
    [WHITE]: new LocalBasicAI({ kyu: wKyu, seed: seed + 7777, allowResign: false }),
  };
  let illegal = 0;
  while (!game.finished && game.moveNumber < maxMoves) {
    const color = game.turn;
    const { move } = await ais[color].genMove(game, color);
    const res = game.play(move, color);
    if (!res.ok) { illegal++; game.play(PASS, color); }
  }
  const dead = estimateDeadStones(game.board);
  const s = score(game.board, { komi: game.komi, rules: game.rules, dead, prisoners: game.board.prisoners });
  return { game, s, illegal };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let blackWins = 0;
  const t0 = Date.now();
  for (let i = 0; i < games; i++) {
    const { game, s, illegal } = await playGame(blackKyu, whiteKyu, size, 1000 + i * 31);
    const won = s.winner === BLACK;
    if (won) blackWins++;
    console.log(`판 ${i + 1}: ${game.moveNumber}수, ${s.text} (흑 ${s.black} · 백 ${s.white})${illegal ? ` [반칙시도 ${illegal}]` : ''}`);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n흑(${blackKyu}급) ${blackWins}승 / ${games}판  — ${secs}초`);
}
