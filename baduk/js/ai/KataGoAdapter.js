/**
 * KataGo 등 전문 엔진 연결부 (요구사항 59·60).
 *
 * 브라우저는 프로세스를 직접 띄울 수 없으므로, GTP를 중계하는 작은 서버가 필요하다.
 * tools/gtp-bridge.js 가 그 역할을 하며, KataGo 실행 파일이 있는 환경에서만 동작한다.
 *
 * 이 어댑터는 **연결할 수 없으면 정직하게 실패를 알린다.** 그러면 EngineRegistry가
 * 내장 AI로 내려가므로, 자유대국 자체는 어떤 환경에서도 플레이할 수 있다(요구사항 59).
 *
 * 기력 조절은 요구사항 60에 따라 다음 수단만 쓴다.
 *  - 탐색량(maxVisits) 제한
 *  - 정책값 기반 후보 선택 확률 조절
 *  - 수읽기 깊이 제한
 * 덤(komi) 조절은 기력 조절과 분리한다.
 */

import { AIEngine, PASS, RESIGN } from './AIEngine.js';
import { toLabel, fromLabel, BLACK } from '../engine/board.js';
import { rankConfig } from './ranks.js';

/** 급수 → KataGo 탐색량. 낮은 급수일수록 적게 읽는다. */
export function visitsForKyu(kyu) {
  const cfg = rankConfig(kyu);
  // 18급 2회 ~ 1급 600회. 지수적으로 늘린다.
  return Math.max(2, Math.round(2 * Math.pow(600 / 2, (18 - cfg.kyu) / 17)));
}

export class KataGoAdapter extends AIEngine {
  constructor(opts = {}) {
    super({ name: 'KataGo', kyu: opts.kyu });
    this.endpoint = opts.endpoint || detectEndpoint();
    this.timeout = opts.timeout || 15000;
    this.sessionId = null;
    this.cfg = rankConfig(opts.kyu != null ? opts.kyu : 10);
  }

  async available() {
    if (!this.endpoint) {
      return {
        ok: false,
        reason: 'KataGo 중계 서버 주소가 설정되어 있지 않습니다. tools/gtp-bridge.js 를 실행한 뒤 설정에서 주소를 입력하세요.',
      };
    }
    try {
      const res = await this.rpc('status', {}, 4000);
      if (!res || !res.ready) {
        return { ok: false, reason: res?.reason || 'KataGo가 준비되지 않았습니다.' };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: `KataGo 중계 서버에 연결할 수 없습니다 (${e.message}).` };
    }
  }

  async rpc(method, params = {}, timeout = this.timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(`${this.endpoint.replace(/\/$/, '')}/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params, session: this.sessionId }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.session) this.sessionId = json.session;
      if (json.error) throw new Error(json.error);
      return json.result;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 현재 기보를 그대로 넘겨 동기화한다(작은 판에서는 이 편이 안전하다). */
  async sync(game) {
    await this.rpc('setup', {
      size: game.size,
      komi: game.komi,
      handicap: game.handicap,
      moves: game.moves
        .filter((m) => m.idx !== RESIGN)
        .map((m) => ({
          color: m.color === BLACK ? 'B' : 'W',
          vertex: m.idx === PASS ? 'pass' : toLabel(m.idx, game.size),
        })),
    });
  }

  async genMove(game, color = game.turn) {
    await this.sync(game);
    const res = await this.rpc('genmove', {
      color: color === BLACK ? 'B' : 'W',
      maxVisits: visitsForKyu(this.cfg.kyu),
      // 낮은 급수는 정책값 상위 후보 중에서 확률적으로 고르게 한다(터무니없는 수는 배제)
      policyTemperature: Number((0.05 + (18 - this.cfg.kyu) * 0).toFixed(3)) || 0.05,
      candidatePool: Math.max(1, Math.round(this.cfg.candidates / 3)),
      randomness: Number((1 - this.cfg.fighting).toFixed(3)),
    });
    if (!res || !res.vertex) return { move: PASS, reason: '엔진이 응답하지 않았습니다.' };
    if (res.vertex === 'pass') return { move: PASS, reason: 'KataGo 판단: 패스' };
    if (res.vertex === 'resign') return { move: RESIGN, reason: 'KataGo 판단: 기권' };
    return { move: fromLabel(res.vertex, game.size), score: res.winrate, reason: 'KataGo 추천수' };
  }

  async topMoves(game, color = game.turn, n = 3) {
    await this.sync(game);
    const res = await this.rpc('analyze', {
      color: color === BLACK ? 'B' : 'W',
      maxVisits: Math.max(50, visitsForKyu(this.cfg.kyu)),
      count: n,
    });
    return (res?.moves || []).slice(0, n).map((m) => ({
      move: fromLabel(m.vertex, game.size),
      score: m.winrate,
      reason: `승률 ${(m.winrate * 100).toFixed(1)}% · 탐색 ${m.visits}회`,
    }));
  }

  async dispose() {
    if (this.sessionId) {
      try { await this.rpc('close', {}, 2000); } catch { /* 이미 끊겼으면 그만이다 */ }
      this.sessionId = null;
    }
  }
}

function detectEndpoint() {
  if (typeof window !== 'undefined') {
    if (window.BADUK_KATAGO_URL) return window.BADUK_KATAGO_URL;
    try {
      const saved = localStorage.getItem('baduk100.katago.endpoint');
      if (saved) return saved;
    } catch { /* 접근 불가 환경 */ }
  }
  return null;
}
