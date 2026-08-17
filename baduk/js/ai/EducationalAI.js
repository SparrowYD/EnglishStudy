/**
 * 학습용 AI.
 *
 * 자유대국용 AI와 달리 **설명 가능하고 재현 가능한** 수를 둔다.
 *  - 무작위성 없음(같은 국면이면 항상 같은 수)
 *  - 허용된 수 목록을 지정할 수 있어, 수업 흐름을 벗어나지 않는다
 *  - 왜 그 수를 두었는지 한국어 설명을 함께 돌려준다
 */

import { LocalBasicAI } from './LocalBasicAI.js';
import { PASS } from './AIEngine.js';
import { fromLabel } from '../engine/board.js';

export class EducationalAI extends LocalBasicAI {
  constructor(opts = {}) {
    super({ ...opts, kyu: opts.kyu != null ? opts.kyu : 5, seed: 1, allowResign: false });
    this.name = '학습 AI';
    // 수업에서 벗어나지 않도록 착점을 제한할 수 있다
    this.allowed = opts.allowed ? new Set(opts.allowed) : null;
    this.cfg.temperature = 0.01;
    this.cfg.blunder = 0;
  }

  setAllowed(labels, size = 19) {
    this.allowed = labels ? new Set(labels.map((l) => (typeof l === 'number' ? l : fromLabel(l, size)))) : null;
  }

  async genMove(game, color = game.turn) {
    const ranked = this.rankMoves(game, color);
    const pool = this.allowed ? ranked.filter((m) => this.allowed.has(m.move)) : ranked;
    if (pool.length === 0) return { move: PASS, reason: '둘 곳이 없습니다.' };
    const best = pool[0];
    return { move: best.move, score: best.score, reason: best.reason };
  }

  /** 최선만 고른다 — 학습 중에는 흔들림이 없어야 한다. */
  choose(moves) { return moves[0]; }
}
