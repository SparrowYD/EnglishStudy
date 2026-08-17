/**
 * 복기 시스템 (요구사항 67·68·69).
 *
 *  - 모든 수에 평가를 붙인다: 💎 묘수 / ⭐ 좋은 수 / ○ 무난 / △ 아쉬운 수 / ⚠ 실수 / ❗ 큰 실수
 *  - 361수를 전부 설명하지 않고 **중요한 장면 5~10개만** 뽑는다
 *  - 실수한 장면은 그대로 새 문제로 만들어 "내 대국에서 나온 문제"에 저장한다
 */

import { Game, PASS, RESIGN } from '../engine/game.js';
import { BLACK, WHITE, EMPTY, opposite, toLabel, fromLabel, COLOR_NAME } from '../engine/board.js';
import { readLadder, canCapture, isSelfAtari, groupsInAtari, allGroups } from '../engine/analysis.js';

export const MARKS = [
  { key: 'brilliant', icon: '💎', label: '묘수', max: -0.001 },
  { key: 'good', icon: '⭐', label: '좋은 수', max: 3 },
  { key: 'ok', icon: '○', label: '무난', max: 10 },
  { key: 'slack', icon: '△', label: '아쉬운 수', max: 25 },
  { key: 'mistake', icon: '⚠', label: '실수', max: 50 },
  { key: 'blunder', icon: '❗', label: '큰 실수', max: Infinity },
];

export function markFor(delta) {
  for (const m of MARKS) if (delta <= m.max) return m;
  return MARKS[MARKS.length - 1];
}

/**
 * 대국 전체를 분석한다.
 * @param {Game} game 끝난 대국
 * @param {AIEngine} engine 평가에 쓸 엔진(자유대국에 쓴 것보다 세게 잡는 편이 좋다)
 * @param {object} opts { onlyColor: 사용자 색만 분석, onProgress(i, total) }
 * @returns {Promise<Array>} 수마다의 평가
 */
export async function analyzeGame(game, engine, opts = {}) {
  const onlyColor = opts.onlyColor;
  const notes = [];
  const replay = new Game({
    size: game.size, komi: game.komi, handicap: game.handicap,
    rules: game.rules, superko: game.superko,
  });

  const total = game.moves.length;
  for (let i = 0; i < total; i++) {
    const m = game.moves[i];
    if (m.idx === RESIGN) break;
    const analyse = !onlyColor || m.color === onlyColor;

    let note = null;
    if (analyse && m.idx !== PASS) {
      const before = replay.board.clone();
      const ranked = await engine.topMoves(replay, m.color, 8);
      const best = ranked[0];
      const played = ranked.find((r) => r.move === m.idx);
      const playedScore = played ? played.score : await scoreOf(engine, replay, m.color, m.idx);
      const delta = best ? best.score - playedScore : 0;
      note = {
        n: i + 1,
        color: m.color,
        move: m.idx,
        label: toLabel(m.idx, game.size),
        delta,
        mark: markFor(delta),
        best: best ? { move: best.move, label: toLabel(best.move, game.size), reason: best.reason } : null,
        alternatives: ranked.slice(0, 3).map((r) => ({
          move: r.move, label: toLabel(r.move, game.size), score: r.score, reason: r.reason,
        })),
        category: null,
        comment: '',
        before,
      };
    }

    replay.play(m.idx, m.color);

    if (note) {
      note.after = replay.board.clone();
      classify(note, game, i);
      notes.push(note);
    }
    if (opts.onProgress) await opts.onProgress(i + 1, total);
  }
  return notes;
}

async function scoreOf(engine, game, color, move) {
  const ranked = await engine.topMoves(game, color, 400);
  const found = ranked.find((r) => r.move === move);
  return found ? found.score : (ranked.length ? ranked[ranked.length - 1].score - 5 : 0);
}

/** 어떤 종류의 실수였는지 반면에서 읽어 이름을 붙인다. */
function classify(note, game, index) {
  const { before, after, move, color } = note;
  const enemy = opposite(color);
  const label = (i) => toLabel(i, game.size);

  // 자충
  if (after.cells[move] === color && after.libertyCount(move) === 1) {
    note.category = '자충';
    note.comment = `${note.label}에 둔 돌이 활로 하나뿐인 단수가 되었습니다.`;
    return;
  }

  // 놓친 따냄 — 최선의 수가 큰 따냄이었는가
  if (note.best && note.best.move !== move) {
    const chk = before.check(color, note.best.move);
    if (chk.ok && chk.captures.length >= 2) {
      note.category = '놓친 따냄';
      note.comment = `${note.best.label}에 두었다면 ${chk.captures.length}점을 따낼 수 있었습니다.`;
      return;
    }
  }

  // 놓친 축 — 잡을 수 있던 상대 돌이 있었는가
  for (const g of allGroups(before, enemy)) {
    if (g.liberties.length !== 2) continue;
    for (const lib of g.liberties) {
      const probe = before.clone();
      if (!probe.play(color, lib).ok) continue;
      if (probe.libertyCount(g.stones[0]) !== 1) continue;
      const ladder = readLadder(probe, g.stones[0], color);
      if (ladder.captured && ladder.sequence.length > 4) {
        if (move !== lib) {
          note.category = '놓친 축';
          note.comment = `${label(lib)}부터 몰았다면 상대 ${g.stones.length}점을 축으로 잡을 수 있었습니다.`;
          return;
        }
      }
    }
  }

  // 내 돌이 단수인데 손을 뺐는가
  const myAtari = groupsInAtari(before, color);
  if (myAtari.length > 0) {
    const biggest = myAtari.reduce((a, g) => (g.stones.length > a.stones.length ? g : a));
    const savedIt = biggest.liberties.includes(move);
    if (!savedIt && biggest.stones.length >= 2 && note.delta > 10) {
      note.category = '단수 방치';
      note.comment = `${label(biggest.stones[0])}의 ${biggest.stones.length}점이 단수인데 다른 곳을 두었습니다.`;
      return;
    }
  }

  // 잡히는 곳에 뛰어들었는가
  if (after.cells[move] === color) {
    const cap = canCapture(after, move, enemy, { maxDepth: 6, maxNodes: 12000 });
    if (cap.captured && note.delta > 15) {
      note.category = '잡히는 수';
      note.comment = `상대가 ${label(cap.move)}에 두면 이 돌이 잡힙니다.`;
      return;
    }
  }

  if (note.delta <= 0) {
    note.category = '좋은 수';
    note.comment = note.best?.reason ? `AI가 고른 수보다 좋았습니다.` : '';
  } else if (note.mark.key === 'good' || note.mark.key === 'ok') {
    note.category = null;
    note.comment = note.best && note.best.move !== move ? `AI 추천: ${note.best.label} (${note.best.reason})` : '';
  } else {
    note.category = '아쉬운 선택';
    note.comment = note.best ? `${note.best.label} 쪽이 나았습니다 — ${note.best.reason}` : '';
  }
}

/**
 * 요구사항 68 — 중요한 장면만 뽑는다.
 * 큰 실수 우선, 대신 한곳에 몰리지 않도록 수순을 벌려서 고른다.
 */
export function keyMoments(notes, count = 8) {
  const scored = notes
    .filter((n) => n.category || n.mark.key !== 'ok')
    .map((n) => ({ n, weight: n.delta + (n.category ? 15 : 0) + (n.mark.key === 'brilliant' ? 20 : 0) }))
    .sort((a, b) => b.weight - a.weight);

  const picked = [];
  for (const { n } of scored) {
    if (picked.length >= count) break;
    if (picked.some((p) => Math.abs(p.n - n.n) < 6)) continue; // 같은 장면 중복 방지
    picked.push(n);
  }
  return picked.sort((a, b) => a.n - b.n);
}

/**
 * 요구사항 69 — 실수 장면을 그대로 새 문제로 만든다.
 * 가능하면 규칙 엔진이 판정할 수 있는 목표(따냄·탈출)를 세우고,
 * 그럴 수 없으면 AI가 고른 상위 수들을 정답으로 삼는다(한 점만 하드코딩하지 않는다).
 */
export function toProblem(note, meta = {}) {
  const size = meta.size || 19;
  const board = note.before;
  const color = note.color;
  const enemy = opposite(color);
  const stones = { black: [], white: [] };
  for (let i = 0; i < board.length; i++) {
    if (board.cells[i] === BLACK) stones.black.push(toLabel(i, size));
    else if (board.cells[i] === WHITE) stones.white.push(toLabel(i, size));
  }

  let goal = null;
  let prompt = '가장 좋은 수를 찾아보세요.';
  let explanation = note.comment || '';

  if (note.category === '놓친 따냄' || note.category === '놓친 축') {
    // 잡을 수 있었던 상대 무리를 목표로 삼는다
    const target = findCapturableTarget(board, color);
    if (target >= 0) {
      goal = { type: 'capture', targets: [toLabel(target, size)], depth: 8 };
      prompt = `${COLOR_NAME[color]} 차례입니다. 상대 돌을 잡는 수를 찾으세요.`;
    }
  } else if (note.category === '단수 방치') {
    const atari = groupsInAtari(board, color)[0];
    if (atari) {
      goal = { type: 'escape', group: toLabel(atari.stones[0], size), minLiberties: 2 };
      prompt = `${COLOR_NAME[color]} 차례입니다. 단수당한 내 돌을 살리세요.`;
    }
  }

  if (!goal) {
    const accept = (note.alternatives || []).slice(0, 3).map((a) => a.label);
    if (accept.length === 0) return null;
    goal = { type: 'point', accept };
    explanation = explanation || `AI가 고른 수는 ${accept.join(' · ')} 입니다.`;
  }

  return {
    id: `my-${meta.gameId || 'game'}-${note.n}`,
    title: `${note.n}수째 — ${note.category || '더 좋은 수'}`,
    prompt: meta.playerName ? `${meta.playerName}님의 실제 대국에서 나온 문제입니다.\n\n${prompt}` : prompt,
    size,
    setup: stones,
    toPlay: color,
    goal,
    explanation: explanation || '이 장면에서 더 좋은 수가 있었습니다.',
    source: {
      moveNumber: note.n,
      played: note.label,
      best: note.best?.label || null,
      category: note.category,
      at: Date.now(),
    },
  };
}

function findCapturableTarget(board, color) {
  const enemy = opposite(color);
  let best = -1;
  let bestSize = 0;
  for (const g of allGroups(board, enemy)) {
    if (g.liberties.length > 2) continue;
    const r = canCapture(board, g.stones[0], color, { maxDepth: 8, maxNodes: 20000 });
    if (r.captured && g.stones.length > bestSize) {
      best = g.stones[0];
      bestSize = g.stones.length;
    }
  }
  return best;
}

/** 복기 요약 한 줄 — 대국 후 화면 맨 위에 띄운다. */
export function summarize(notes) {
  const counts = {};
  for (const n of notes) counts[n.mark.key] = (counts[n.mark.key] || 0) + 1;
  const parts = MARKS
    .filter((m) => counts[m.key])
    .map((m) => `${m.icon} ${m.label} ${counts[m.key]}`);
  const avg = notes.length ? notes.reduce((a, n) => a + Math.max(0, n.delta), 0) / notes.length : 0;
  return { counts, text: parts.join('  ·  '), averageLoss: avg };
}
