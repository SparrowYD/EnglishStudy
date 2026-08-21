#!/usr/bin/env node
/**
 * 내장 AI를 **GTP로 말하게** 하는 껍데기 (요구사항 59·60).
 *
 * 왜 필요한가.
 *   tools/gtp-bridge.js 는 "GTP를 하는 아무 엔진"이나 붙일 수 있게 만들었다.
 *   그런데 KataGo가 깔려 있지 않은 환경에서는 그 중계 경로 전체가 한 번도
 *   실행되지 않은 채로 남는다 — 즉 "버튼은 있는데 눌러 본 적이 없는" 상태다(요구사항 79).
 *   그래서 우리 엔진 자신을 GTP 엔진으로 만들어, 브라우저 → 어댑터 → 중계 서버 →
 *   GTP 프로세스로 이어지는 길을 KataGo 없이도 끝까지 테스트한다.
 *
 * 실행:  node tools/gtp-engine.js [--kyu 10]
 * 표준입력으로 GTP 명령을 받고 표준출력으로 응답한다.
 *
 * 정직하게 밝혀 둘 것: 이 엔진의 kata-genmove_analyze 가 내놓는 winrate 는
 * **진짜 승률이 아니다.** 후보 수들의 자체 평가 점수를 softmax 로 정규화한
 * "상대적 선호도"다. 그래서 status 응답에 engine 이름을 함께 실어,
 * 부르는 쪽이 KataGo인지 내장 AI인지 구분할 수 있게 했다.
 */
import readline from 'node:readline';
import { Game, PASS, RESIGN, handicapPoints } from '../js/engine/game.js';
import { LocalBasicAI } from '../js/ai/LocalBasicAI.js';
import { BLACK, WHITE, EMPTY, toLabel, fromLabel, COLUMNS } from '../js/engine/board.js';

const argv = process.argv.slice(2);
function argOf(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] != null ? argv[i + 1] : dflt;
}

const NAME = 'baduk100-local';
const VERSION = '1.0';

const state = {
  size: Number(argOf('--size', 19)),
  komi: Number(argOf('--komi', 6.5)),
  kyu: Number(argOf('--kyu', 10)),
  game: null,
  ai: null,
};

function reset() {
  state.game = new Game({ size: state.size, komi: state.komi, superko: true });
  state.ai = new LocalBasicAI({ kyu: state.kyu, allowResign: false });
}
reset();

const COMMANDS = [
  'protocol_version', 'name', 'version', 'known_command', 'list_commands', 'quit',
  'boardsize', 'clear_board', 'komi', 'play', 'genmove', 'undo', 'showboard',
  'fixed_handicap', 'place_free_handicap', 'set_free_handicap',
  'kata-set-param', 'kata-genmove_analyze', 'baduk-set-kyu',
];

function colorOf(tok) {
  const t = String(tok || '').toLowerCase();
  if (t === 'b' || t === 'black') return BLACK;
  if (t === 'w' || t === 'white') return WHITE;
  return null;
}

function vertexOf(tok, size) {
  const t = String(tok || '').toUpperCase();
  if (t === 'PASS') return PASS;
  if (t === 'RESIGN') return RESIGN;
  const idx = fromLabel(t, size);
  return idx >= 0 ? idx : null;
}

function showboard() {
  const b = state.game.board;
  const n = b.size;
  const head = '   ' + COLUMNS.slice(0, n).split('').join(' ');
  const rows = [head];
  for (let y = 0; y < n; y++) {
    const line = n - y;
    const cells = [];
    for (let x = 0; x < n; x++) {
      const c = b.cells[y * n + x];
      cells.push(c === BLACK ? 'X' : c === WHITE ? 'O' : '.');
    }
    rows.push(String(line).padStart(2) + ' ' + cells.join(' ') + ' ' + String(line).padStart(2));
  }
  rows.push(head);
  return rows.join('\n');
}

/** 후보 점수를 상대적 선호도로 바꾼다. 진짜 승률이 아님을 잊지 말 것. */
function preference(moves) {
  if (moves.length === 0) return [];
  const top = moves[0].score;
  const w = moves.map((m) => Math.exp((m.score - top) / 12));
  const total = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((v) => v / total);
}

async function handle(cmd, args) {
  switch (cmd) {
    case 'protocol_version': return '2';
    case 'name': return NAME;
    case 'version': return VERSION;
    case 'list_commands': return COMMANDS.join('\n');
    case 'known_command': return COMMANDS.includes(String(args[0])) ? 'true' : 'false';

    case 'boardsize': {
      const n = Number(args[0]);
      if (!Number.isInteger(n) || n < 5 || n > 19) throw new Error('unacceptable size');
      state.size = n; reset(); return '';
    }
    case 'clear_board': reset(); return '';
    case 'komi': {
      const k = Number(args[0]);
      if (!Number.isFinite(k)) throw new Error('invalid komi');
      state.komi = k; state.game.komi = k; return '';
    }
    case 'baduk-set-kyu': {
      const k = Number(args[0]);
      if (!Number.isFinite(k)) throw new Error('invalid kyu');
      state.kyu = Math.min(18, Math.max(1, Math.round(k)));
      state.ai.setKyu(state.kyu);
      return '';
    }
    case 'kata-set-param': return '';        // 내장 AI는 탐색량 대신 급수로 조절한다

    case 'fixed_handicap':
    case 'place_free_handicap': {
      const n = Number(args[0]);
      const pts = handicapPoints(state.size, n);
      for (const p of pts) state.game.board.place(BLACK, p);
      state.game.positions.add(state.game.board.hash());
      state.game.handicap = n;
      state.game.turn = WHITE;
      return pts.map((p) => toLabel(p, state.size)).join(' ');
    }
    case 'set_free_handicap': {
      for (const a of args) {
        const idx = vertexOf(a, state.size);
        if (idx == null || idx < 0) throw new Error('invalid vertex');
        state.game.board.place(BLACK, idx);
      }
      state.game.positions.add(state.game.board.hash());
      state.game.handicap = args.length;
      state.game.turn = WHITE;
      return '';
    }

    case 'play': {
      const color = colorOf(args[0]);
      const idx = vertexOf(args[1], state.size);
      if (color == null || idx == null) throw new Error('invalid move');
      const res = state.game.play(idx, color);
      if (!res.ok) throw new Error('illegal move');
      return '';
    }
    case 'undo': return state.game.undo() ? '' : (() => { throw new Error('cannot undo'); })();

    case 'genmove': {
      const color = colorOf(args[0]) || state.game.turn;
      const { move } = await state.ai.genMove(state.game, color);
      state.game.play(move, color);
      return move === PASS ? 'pass' : move === RESIGN ? 'resign' : toLabel(move, state.size);
    }

    case 'kata-genmove_analyze': {
      const color = colorOf(args[0]) || state.game.turn;
      const top = await state.ai.topMoves(state.game, color, 12);
      const playable = top.filter((m) => m.move >= 0);
      const pref = preference(playable);
      const lines = playable.map((m, i) =>
        `info move ${toLabel(m.move, state.size)} visits ${playable.length - i}`
        + ` winrate ${pref[i].toFixed(6)} prior ${pref[i].toFixed(6)} order ${i} pv ${toLabel(m.move, state.size)}`);
      const { move } = await state.ai.genMove(state.game, color);
      state.game.play(move, color);
      const played = move === PASS ? 'pass' : move === RESIGN ? 'resign' : toLabel(move, state.size);
      return lines.concat(`play ${played}`).join('\n');
    }

    case 'showboard': return '\n' + showboard();
    default: throw new Error('unknown command');
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
let queue = Promise.resolve();

rl.on('line', (raw) => {
  const line = raw.replace(/#.*$/, '').trim();
  if (!line) return;
  const parts = line.split(/\s+/);
  let id = '';
  if (/^\d+$/.test(parts[0])) id = parts.shift();
  const cmd = (parts.shift() || '').toLowerCase();
  // GTP는 한 번에 한 명령씩 처리한다. genmove가 비동기이므로 큐로 순서를 지킨다.
  // quit 도 같은 큐에 넣는다 — 명령이 한꺼번에 들어와도 앞선 응답을 잘라먹지 않는다.
  queue = queue.then(async () => {
    if (cmd === 'quit') {
      process.stdout.write(`=${id}\n\n`);
      rl.close();
      process.exit(0);
    }
    try {
      const out = await handle(cmd, parts);
      process.stdout.write(`=${id} ${out}\n\n`);
    } catch (e) {
      process.stdout.write(`?${id} ${e.message}\n\n`);
    }
  });
});
