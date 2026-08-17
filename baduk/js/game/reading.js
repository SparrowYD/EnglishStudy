/**
 * 수읽기 훈련 (요구사항 70).
 *
 * 문제를 손으로 만들어 두지 않는다. 규칙 엔진으로 **축 모양을 생성하고 길이를 측정해서**
 * 난이도에 맞는 것만 골라 낸다. 그래서 매번 새로운 문제가 나온다.
 *
 * 훈련 방식: 돌을 바로 놓지 않고 머릿속으로 수순을 정한 뒤 순서대로 찍어서 제출한다.
 */

import { Board, BLACK, WHITE, EMPTY, opposite, toLabel, fromLabel } from '../engine/board.js';
import { readLadder } from '../engine/analysis.js';
import { ProblemSession, VERDICT } from './problem.js';

export const LEVELS = {
  beginner: { key: 'beginner', label: '초급', moves: [2, 3], range: [3, 7] },
  intermediate: { key: 'intermediate', label: '중급', moves: [4, 6], range: [8, 13] },
  advanced: { key: 'advanced', label: '고급', moves: [7, 99], range: [14, 60] },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 네 방향으로 뒤집어 축의 진행 방향을 바꾼다. */
const ORIENTATIONS = [
  { sx: 1, sy: 1 },   // 우하로 진행
  { sx: -1, sy: 1 },  // 좌하로 진행
  { sx: 1, sy: -1 },  // 우상으로 진행
  { sx: -1, sy: -1 }, // 좌상으로 진행
];

/**
 * 난이도에 맞는 축 문제를 만든다.
 * @returns {{problem:object, expectedMoves:number, sequence:string[]}|null}
 */
export function generateLadderProblem(difficulty = 'beginner', seed = Date.now(), size = 19) {
  const spec = LEVELS[difficulty] || LEVELS.beginner;
  const rand = mulberry32(seed);

  for (let attempt = 0; attempt < 300; attempt++) {
    const o = ORIENTATIONS[Math.floor(rand() * ORIENTATIONS.length)];
    // 축이 끝나는 귀에서 얼마나 떨어진 곳에서 시작할지
    const back = 2 + Math.floor(rand() * 14);
    const jitter = Math.floor(rand() * 3);
    const cx = o.sx > 0 ? size - 1 - back : back;
    const cy = o.sy > 0 ? size - 1 - back - jitter : back + jitter;
    if (cx < 1 || cy < 1 || cx > size - 2 || cy > size - 2) continue;

    // 잡히는 쪽(백) 한 점과, 그 돌을 축으로 몰 수 있는 흑 세 점
    const target = { x: cx, y: cy };
    const walls = [
      { x: cx - o.sx, y: cy },          // 진행 반대쪽 옆
      { x: cx, y: cy - o.sy },          // 진행 반대쪽 위아래
      { x: cx + o.sx, y: cy - o.sy },   // 대각 — 이 돌이 있어야 축이 성립한다
    ];
    if (walls.some((w) => w.x < 0 || w.y < 0 || w.x >= size || w.y >= size)) continue;

    const board = new Board(size);
    board.place(WHITE, target.y * size + target.x);
    for (const w of walls) board.place(BLACK, w.y * size + w.x);

    const targetIdx = target.y * size + target.x;
    const res = readLadder(board, targetIdx, BLACK);
    if (!res.captured) continue;
    const len = res.sequence.length;
    if (len < spec.range[0] || len > spec.range[1]) continue;

    const black = [];
    const white = [];
    for (let i = 0; i < board.length; i++) {
      if (board.cells[i] === BLACK) black.push(toLabel(i, size));
      else if (board.cells[i] === WHITE) white.push(toLabel(i, size));
    }

    const myMoves = Math.ceil(len / 2);
    const built = {
      expectedMoves: myMoves,
      sequence: res.sequence.map((i) => toLabel(i, size)),
      problem: {
        id: `read-${difficulty}-${seed}-${attempt}`,
        title: `${spec.label} 수읽기 — ${myMoves}수`,
        prompt: `흑 차례입니다. 백 한 점을 **축으로 잡는 수순**을 머릿속으로 끝까지 읽고, 순서대로 찍어 제출하세요. (내 수 ${myMoves}수)`,
        size,
        setup: { black, white },
        toPlay: BLACK,
        // immediate: 돌이 실제로 들려 나가야 정답이다.
        // "결국 잡힌다"까지만 인정하면 첫 수만 두고 끝나 버려 수읽기 훈련이 되지 않는다.
        goal: { type: 'capture', targets: [toLabel(targetIdx, size)], immediate: true },
        // 아직 잡지는 못했어도 축이 계속 성립하면 "잘 가고 있는 수"로 인정한다
        progressGoal: { type: 'ladder', target: toLabel(targetIdx, size) },
        explanation: `축은 상대를 계속 단수로 몰아 귀까지 끌고 가 잡는 기술입니다. 이 문제의 수순은 ${res.sequence.slice(0, 8).map((i) => toLabel(i, size)).join(' → ')}${len > 8 ? ' → …' : ''} 입니다.`,
        hints: [
          '상대 돌의 활로 두 곳 중 어느 쪽을 막아야 계속 단수로 몰 수 있을지 생각해 보세요.',
          '한 번 몰고 나서 상대가 뻗으면, 그다음에도 활로가 둘만 남는지 확인하세요.',
        ],
        maxMoves: myMoves + 6,
      },
    };

    // 축이 "이겼다"고 판정되는 시점과 돌이 실제로 들려 나가는 시점은 한 수 차이가 날 수 있다.
    // 그래서 기대 수순을 손으로 쓰지 않고 **문제 엔진에게 직접 풀려 보고** 그 결과를 정답으로 삼는다.
    // 이렇게 하면 화면에 안내하는 수순과 채점기가 인정하는 수순이 어긋날 수 없다.
    const solved = solveWithEngine(built.problem, targetIdx, size);
    if (!solved) continue;
    built.mySequence = solved;
    built.expectedMoves = solved.length;
    built.problem.title = `${spec.label} 수읽기 — ${solved.length}수`;
    built.problem.prompt = built.problem.prompt.replace(/내 수 \d+수/, `내 수 ${solved.length}수`);
    return built;
  }
  return null;
}

/** 목표 무리의 활로를 차례로 시도해, 문제 엔진이 인정하는 공격 수순을 찾는다. */
function solveWithEngine(problem, targetIdx, size) {
  const session = new ProblemSession(problem, { allowHints: false });
  const mine = [];
  for (let guard = 0; guard < 120 && !session.solved; guard++) {
    if (session.board.cells[targetIdx] === EMPTY) break;
    const group = session.board.group(targetIdx);
    let advanced = false;
    for (const lib of group.liberties) {
      const res = session.play(lib);
      if (res.verdict === VERDICT.CORRECT) {
        mine.push(toLabel(lib, size));
        advanced = true;
        break;
      }
      // 오답이면 세션이 스스로 국면을 되돌리므로 다음 활로를 그대로 시도하면 된다
    }
    if (!advanced) return null;
  }
  return session.solved ? mine : null;
}

/**
 * 머릿속 수읽기 채점.
 * 사용자가 찍은 수순을 순서대로 두어 보고, 도중에 어긋나면 몇 수째에서 틀렸는지 알려준다.
 * 상대 응수는 대본이 아니라 문제 엔진이 매번 계산한다.
 */
export function verifySequence(problem, labels) {
  const size = problem.size || 19;
  const session = new ProblemSession(problem, { allowHints: false });
  const played = [];
  for (let i = 0; i < labels.length; i++) {
    const idx = typeof labels[i] === 'number' ? labels[i] : fromLabel(labels[i], size);
    const res = session.play(idx);
    played.push({ label: toLabel(idx, size), verdict: res.verdict, message: res.message });
    if (res.verdict === VERDICT.ILLEGAL) {
      return { ok: false, at: i + 1, played, message: `${i + 1}번째 수: ${res.message}` };
    }
    if (res.verdict === VERDICT.WRONG) {
      return { ok: false, at: i + 1, played, message: `${i + 1}번째 수에서 어긋났습니다. ${res.message}` };
    }
    if (session.solved) {
      return { ok: true, at: i + 1, played, message: `${i + 1}수 만에 잡았습니다!`, session };
    }
  }
  return {
    ok: false,
    at: labels.length,
    played,
    message: '수순이 끝났지만 아직 잡지 못했습니다. 몇 수 더 읽어야 합니다.',
    session,
  };
}
