/**
 * 내장 바둑 AI — 18급 ~ 1급.
 *
 * 설계 요지(요구사항 57·60·79):
 *  - 낮은 급수는 "랜덤"이 아니다. **보는 범위가 좁고 읽는 깊이가 얕을 뿐**이다.
 *    사람 초보처럼 방금 둔 곳 주변을 따라다니고, 단수를 가끔 못 보고, 축을 못 읽는다.
 *  - 높은 급수는 같은 평가 함수에 시야·깊이·정확도를 모두 열어 준다.
 *  - 강한 수를 계산해 놓고 일부러 엉뚱한 곳에 던지는 방식은 쓰지 않는다.
 *    실수는 "후보 중 차선을 고르는" 형태로만 들어간다.
 */

import { BLACK, WHITE, EMPTY, opposite, toLabel, starPoints, fromLabel } from '../engine/board.js';
import { PASS, RESIGN } from '../engine/game.js';
import { AIEngine } from './AIEngine.js';
import { rankConfig } from './ranks.js';
import {
  groupsInAtari, allGroups, isTrueEye, readLadder, canCapture, neighborhood,
} from '../engine/analysis.js';
import { score, estimateDeadStones } from '../engine/score.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class LocalBasicAI extends AIEngine {
  constructor(opts = {}) {
    super({ name: '내장 AI', kyu: opts.kyu });
    this.cfg = rankConfig(opts.kyu != null ? opts.kyu : 10);
    this.rand = mulberry32(opts.seed != null ? opts.seed : 20260817);
    this.allowResign = opts.allowResign !== false;
  }

  async available() { return { ok: true }; }

  setKyu(kyu) { this.cfg = rankConfig(kyu); this.kyu = this.cfg.kyu; }

  async genMove(game, color = game.turn) {
    const moves = this.rankMoves(game, color);
    if (moves.length === 0) return { move: PASS, reason: '둘 만한 곳이 없습니다.' };

    const best = moves[0];
    if (best.score <= PASS_THRESHOLD) {
      return { move: PASS, reason: '더 둘 가치가 있는 곳이 없습니다.' };
    }

    if (this.allowResign && this.shouldResign(game, color)) {
      return { move: RESIGN, reason: '형세가 크게 기울었습니다.' };
    }

    const chosen = this.choose(moves);
    return { move: chosen.move, score: chosen.score, reason: chosen.reason };
  }

  async topMoves(game, color = game.turn, n = 3) {
    return this.rankMoves(game, color).slice(0, n);
  }

  /* ---------------- 후보 생성 ---------------- */

  candidates(game, color) {
    const board = game.board;
    const cfg = this.cfg;
    const out = new Set();
    const nearsighted = cfg.visionRadius <= 4;

    if (nearsighted) {
      // 근시안: 최근 몇 수 주변과, 지금 잡히거나 잡을 수 있는 돌 주변만 본다
      const recent = game.moves.slice(-3).filter((m) => m.idx >= 0).map((m) => m.idx);
      for (const m of recent) for (const p of neighborhood(board, [m], cfg.visionRadius)) out.add(p);
      for (const c of [color, opposite(color)]) {
        for (const g of groupsInAtari(board, c)) {
          for (const p of neighborhood(board, g.stones, 1)) out.add(p);
        }
      }
      if (out.size === 0) for (const p of neighborhood(board, this.allStones(board), 2)) out.add(p);
    } else {
      const r = cfg.visionRadius >= 8 ? 2 : 1;
      const stones = this.allStones(board);
      for (const p of neighborhood(board, stones, r)) out.add(p);
    }

    // 포석 후보는 항상 목록에는 넣되, 점수는 급수에 따라 다르게 준다
    for (const p of this.openingPoints(board)) out.add(p);

    const list = [];
    for (const p of out) {
      if (board.cells[p] !== EMPTY) continue;
      if (isTrueEye(board, p, color)) continue;          // 내 눈을 메우면 자살행위다
      if (!game.check(p, color).ok) continue;
      list.push(p);
    }
    return list;
  }

  allStones(board) {
    const out = [];
    for (let i = 0; i < board.length; i++) if (board.cells[i] !== EMPTY) out.push(i);
    return out;
  }

  /** 귀·변의 기본 착점. 빈 귀가 있으면 그쪽을 먼저 본다. */
  openingPoints(board) {
    const size = board.size;
    const pts = [];
    if (size !== 19) return starPoints(size);
    const corners = [
      ['D4', 'C4', 'D3', 'C3', 'E3', 'C5'],
      ['Q16', 'R16', 'Q17', 'R17', 'P17', 'R15'],
      ['Q4', 'R4', 'Q3', 'R3', 'P3', 'R5'],
      ['D16', 'C16', 'D17', 'C17', 'E17', 'C15'],
    ];
    for (const group of corners) {
      for (const l of group) {
        const i = fromLabel(l, size);
        if (i >= 0 && board.cells[i] === EMPTY) pts.push(i);
      }
    }
    for (const l of ['K4', 'K16', 'D10', 'Q10', 'K10']) {
      const i = fromLabel(l, size);
      if (i >= 0 && board.cells[i] === EMPTY) pts.push(i);
    }
    return pts;
  }

  /* ---------------- 평가 ---------------- */

  rankMoves(game, color) {
    const board = game.board;
    const cfg = this.cfg;
    const ctx = this.buildContext(game, color);
    const scored = [];
    for (const move of this.candidates(game, color)) {
      const s = this.quickScore(board, game, color, move, ctx);
      if (s.score > -900) scored.push({ move, ...s });
    }
    scored.sort((a, b) => b.score - a.score);

    // 상위 후보만 실제로 수읽기를 해서 다듬는다(전부 읽으면 너무 느리다)
    const deep = scored.slice(0, Math.max(4, cfg.candidates));
    for (const cand of deep) this.refine(board, game, color, cand, ctx);
    deep.sort((a, b) => b.score - a.score);
    return deep.concat(scored.slice(Math.max(4, cfg.candidates)));
  }

  buildContext(game, color) {
    const board = game.board;
    const enemy = opposite(color);
    const ctx = {
      enemy,
      myAtari: new Map(),     // 활로 좌표 -> 내 무리
      enemyAtari: new Map(),
      myTwoLib: new Map(),
      enemyTwoLib: new Map(),
      lastMove: -1,
      territory: null,
      moveNumber: game.moveNumber,
    };
    for (let i = game.moves.length - 1; i >= 0; i--) {
      if (game.moves[i].idx >= 0) { ctx.lastMove = game.moves[i].idx; break; }
    }
    for (const g of allGroups(board, color)) {
      if (g.liberties.length === 1) ctx.myAtari.set(g.liberties[0], g);
      else if (g.liberties.length === 2) for (const l of g.liberties) ctx.myTwoLib.set(l, g);
    }
    for (const g of allGroups(board, enemy)) {
      if (g.liberties.length === 1) ctx.enemyAtari.set(g.liberties[0], g);
      else if (g.liberties.length === 2) for (const l of g.liberties) ctx.enemyTwoLib.set(l, g);
    }
    // 집이 굳어진 뒤에는 자기 집을 메우지 않도록 영토를 본다
    if (game.moveNumber > 50) {
      try {
        ctx.territory = score(board, { komi: 0, dead: estimateDeadStones(board) }).territory;
      } catch { ctx.territory = null; }
    }
    return ctx;
  }

  quickScore(board, game, color, move, ctx) {
    const cfg = this.cfg;
    const enemy = ctx.enemy;
    const reasons = [];
    let s = 0;

    const chk = board.check(color, move);
    if (!chk.ok) return { score: -1000, reason: '' };

    // 1) 따내기
    if (chk.captures.length > 0) {
      s += 24 * chk.captures.length + 10;
      reasons.push(`${chk.captures.length}점을 따낸다`);
    }

    // 2) 단수당한 내 돌 살리기 — 알아채야 둘 수 있다
    const saving = ctx.myAtari.get(move);
    if (saving && this.notices(cfg.atariAwareness)) {
      s += 18 + 10 * saving.stones.length;
      reasons.push(`단수당한 ${saving.stones.length}점을 살린다`);
    }
    // 내 돌이 단수인데 엉뚱한 곳을 두면 그만큼 손해다
    if (ctx.myAtari.size > 0 && !saving && this.notices(cfg.atariAwareness)) {
      let biggest = 0;
      for (const g of ctx.myAtari.values()) biggest = Math.max(biggest, g.stones.length);
      s -= 6 * biggest * cfg.fighting;
    }

    // 3) 상대 단수 만들기 / 활로 줄이기
    const attacking = ctx.enemyTwoLib.get(move);
    if (attacking && this.notices(cfg.atariAwareness)) {
      s += 6 + 4 * attacking.stones.length;
      reasons.push(`상대 ${attacking.stones.length}점을 단수로 몬다`);
    }
    if (ctx.enemyAtari.has(move) && chk.captures.length === 0) {
      // 단수인 상대 돌의 활로 자리 = 따내는 자리이므로 위에서 이미 계산되었다
    }

    // 4) 자충 회피
    const probe = board.clone();
    probe.play(color, move);
    const myLibs = probe.libertyCount(move);
    if (myLibs === 1 && chk.captures.length === 0) {
      s -= 45 * (0.4 + 0.6 * cfg.fighting);
      reasons.push('자충(스스로 단수)');
    } else if (myLibs === 2 && chk.captures.length === 0) {
      s -= 4 * cfg.fighting;
    }

    // 5) 모양 — 붙은 돌 수. 초보일수록 접촉을 좋아한다
    let ownAdj = 0;
    let enemyAdj = 0;
    for (const nb of board.neighbors(move)) {
      if (board.cells[nb] === color) ownAdj++;
      else if (board.cells[nb] === enemy) enemyAdj++;
    }
    const contactLove = 1 - cfg.opening;      // 초보일수록 크다
    s += enemyAdj * (2 + 4 * contactLove);
    s += ownAdj * (1 + 2 * contactLove);
    // 너무 뭉치면 효율이 나쁘다 — 이 감각은 급수가 올라갈수록 생긴다
    if (ownAdj >= 3) s -= 8 * cfg.opening;

    // 6) 선(線)의 가치 — 귀·변·중앙과 3·4선 감각
    s += this.lineValue(board, move, ctx) * cfg.opening;

    // 7) 방금 상대가 둔 곳 근처에 응수 — 시야가 좁을수록 강하게 끌린다
    if (ctx.lastMove >= 0) {
      const d = this.distance(board, move, ctx.lastMove);
      if (d <= 3) s += (4 - d) * (1 + 3 * contactLove);
    }

    // 8) 이미 굳어진 자기 집은 메우지 않는다
    if (ctx.territory) {
      const t = ctx.territory[move];
      if (t === color && chk.captures.length === 0 && enemyAdj === 0) {
        s -= 30;
        reasons.push('내 집을 메우는 자리');
      } else if (t === enemy && chk.captures.length === 0) {
        s -= 12 * cfg.positional;
      }
    }

    // 9) 빈 귀 선점
    if (this.isEmptyCorner(board, move)) {
      s += 22 * cfg.opening;
      reasons.push('빈 귀를 차지한다');
    }

    // 약간의 흔들림 — 같은 점수의 수 중에서 매번 같은 것만 고르지 않도록
    s += this.rand() * 0.8;

    return { score: s, reason: reasons[0] || this.describe(board, move, ctx) };
  }

  /** 상위 후보만 실제로 읽어 본다. 여기서 축·포획이 확인된다. */
  refine(board, game, color, cand, ctx) {
    const cfg = this.cfg;
    if (cfg.readDepth < 2) return;
    const enemy = ctx.enemy;
    const probe = board.clone();
    probe.play(color, cand.move);

    // (a) 달아난 돌이 결국 축으로 잡히는가
    const saving = ctx.myAtari.get(cand.move) || ctx.myTwoLib.get(cand.move);
    if (saving && this.notices(cfg.readsLadder)) {
      const g = probe.cells[cand.move] === color ? cand.move : saving.stones[0];
      if (probe.cells[g] === color && probe.libertyCount(g) <= 2) {
        const ladder = readLadder(probe, g, enemy);
        if (ladder.captured) {
          cand.score -= 30;
          cand.reason = '달아나도 축으로 잡힌다';
          return;
        }
      }
    }

    // (b) 상대 돌을 실제로 잡을 수 있는가(축·장문 포함)
    for (const nb of board.neighbors(cand.move)) {
      if (board.cells[nb] !== enemy) continue;
      const eg = probe.cells[nb] === enemy ? probe.group(nb) : null;
      if (!eg || eg.liberties.length > 2) continue;
      if (eg.liberties.length === 2 && this.notices(cfg.readsLadder)) {
        const ladder = readLadder(probe, nb, color);
        if (ladder.captured) {
          cand.score += 14 + 6 * eg.stones.length;
          cand.reason = `상대 ${eg.stones.length}점을 축으로 잡을 수 있다`;
          return;
        }
      }
      if (cfg.readDepth >= 4 && eg.liberties.length <= 2) {
        const cap = canCapture(probe, nb, color, { maxDepth: cfg.readDepth, maxNodes: 6000 });
        if (cap.captured) {
          cand.score += 10 + 5 * eg.stones.length;
          cand.reason = `상대 ${eg.stones.length}점을 잡을 수 있다`;
          return;
        }
      }
    }

    // (c) 내 돌이 이 수 뒤에 잡히지는 않는가
    if (cfg.readDepth >= 3 && probe.cells[cand.move] === color) {
      const mine = probe.group(cand.move);
      if (mine.liberties.length <= 2 && mine.stones.length >= 2) {
        const cap = canCapture(probe, cand.move, enemy, { maxDepth: cfg.readDepth, maxNodes: 6000 });
        if (cap.captured) {
          cand.score -= 12 + 6 * mine.stones.length;
          cand.reason = '이 수는 잡히는 모양이다';
        }
      }
    }
  }

  /* ---------------- 선택 ---------------- */

  /** 최선만 고르지 않는다. 급수가 낮을수록 차선을 고를 확률이 높다. */
  choose(moves) {
    const cfg = this.cfg;
    const pool = moves.slice(0, Math.max(2, cfg.candidates));
    if (pool.length === 1) return pool[0];

    if (this.rand() < cfg.blunder) {
      // 실수 = "그럴듯한 차선". 점수 차가 큰 수는 실수로도 고르지 않는다.
      // 그래서 눈앞의 따냄이나 유일한 탈출구를 통째로 놓치는 일은 생기지 않는다.
      const margin = cfg.blunderMargin != null ? cfg.blunderMargin : 20;
      const alt = pool.slice(1, Math.min(pool.length, 5)).filter((m) => m.score >= pool[0].score - margin);
      if (alt.length) return alt[Math.floor(this.rand() * alt.length)];
    }

    const temp = Math.max(0.05, cfg.temperature);
    const top = pool[0].score;
    const weights = pool.map((m) => Math.exp((m.score - top) / (temp * 10)));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.rand() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[0];
  }

  shouldResign(game, color) {
    const cfg = this.cfg;
    if (cfg.positional < 0.5 || game.moveNumber < 100) return false;
    try {
      const s = score(game.board, {
        komi: game.komi, rules: game.rules, dead: estimateDeadStones(game.board),
      });
      const diff = color === BLACK ? s.diff : -s.diff;
      return diff < -60;
    } catch { return false; }
  }

  /* ---------------- 도우미 ---------------- */

  notices(p) { return p >= 1 ? true : this.rand() < p; }

  distance(board, a, b) {
    return Math.abs(board.x(a) - board.x(b)) + Math.abs(board.y(a) - board.y(b));
  }

  /** 1·2선은 낮고 3·4선이 좋다는 감각. 중앙은 초반에 가치가 덜하다. */
  lineValue(board, move, ctx) {
    const size = board.size;
    const x = board.x(move);
    const y = board.y(move);
    const line = Math.min(x, y, size - 1 - x, size - 1 - y) + 1;
    const early = ctx.moveNumber < 60;
    if (!early) return 0;
    if (line === 1) return -10;
    if (line === 2) return -4;
    if (line === 3) return 8;
    if (line === 4) return 8;
    if (line === 5) return 2;
    return -2;
  }

  isEmptyCorner(board, move) {
    const size = board.size;
    if (size !== 19) return false;
    const x = board.x(move);
    const y = board.y(move);
    const line = Math.min(x, y, size - 1 - x, size - 1 - y) + 1;
    if (line < 3 || line > 4) return false;
    const inCorner = (x <= 5 || x >= size - 6) && (y <= 5 || y >= size - 6);
    if (!inCorner) return false;
    for (const p of neighborhood(board, [move], 4)) {
      if (board.cells[p] !== EMPTY) return false;
    }
    return true;
  }

  describe(board, move, ctx) {
    const size = board.size;
    const x = board.x(move);
    const y = board.y(move);
    const line = Math.min(x, y, size - 1 - x, size - 1 - y) + 1;
    if (this.isEmptyCorner(board, move)) return '빈 귀를 차지하는 수';
    if (line <= 2) return '가장자리를 지키는 수';
    if (ctx.lastMove >= 0 && this.distance(board, move, ctx.lastMove) <= 2) return '상대의 마지막 수에 응수';
    if (line === 3) return '실리를 굳히는 3선';
    if (line === 4) return '세력을 넓히는 4선';
    return '중앙을 향한 수';
  }
}

const PASS_THRESHOLD = 0.5;
