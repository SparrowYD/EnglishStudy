/**
 * AI 계층 분리 (요구사항 59).
 *
 *   AIEngine
 *   ├─ EducationalAI   학습용 — 예측 가능하고 설명 가능한 수를 둔다
 *   ├─ LocalBasicAI    자유대국용 — 18급~1급 기력을 재현하는 내장 엔진
 *   └─ KataGoAdapter   외부 전문 엔진 연결부(GTP)
 *
 * 어떤 엔진을 쓰든 화면 쪽 코드는 genMove/topMoves만 호출한다.
 */

import { PASS, RESIGN } from '../engine/game.js';

export class AIEngine {
  constructor(opts = {}) {
    this.name = opts.name || 'AI';
    this.kyu = opts.kyu != null ? opts.kyu : 10;
  }

  /** 이 엔진을 지금 환경에서 쓸 수 있는가. @returns {Promise<{ok:boolean, reason?:string}>} */
  async available() { return { ok: true }; }

  /**
   * 한 수를 고른다.
   * @returns {Promise<{move:number, score?:number, reason?:string}>} move는 좌표 또는 PASS/RESIGN
   */
  async genMove() { return { move: PASS }; }

  /**
   * 후보수 목록. 선생님 대국의 힌트(요구사항 66)와 복기 평가(요구사항 67)가 쓴다.
   * @returns {Promise<Array<{move:number, score:number, reason:string}>>}
   */
  async topMoves() { return []; }

  /** 엔진 정리(외부 프로세스 종료 등). */
  async dispose() {}
}

/** 사용 가능한 엔진들을 등록해 두고, 쓸 수 있는 것 중 가장 앞선 것을 고른다. */
export class EngineRegistry {
  constructor() { this.entries = []; }

  register(key, factory, meta = {}) {
    this.entries.push({ key, factory, meta });
    return this;
  }

  get(key) { return this.entries.find((e) => e.key === key) || null; }

  list() { return this.entries.map((e) => ({ key: e.key, ...e.meta })); }

  /**
   * 원하는 엔진을 만들되, 쓸 수 없으면 fallback으로 내려간다.
   * 어떤 엔진이 선택됐고 왜 그렇게 됐는지 함께 돌려주므로 화면에 정직하게 표시할 수 있다.
   */
  async create(key, opts = {}) {
    const order = [key, ...this.entries.map((e) => e.key).filter((k) => k !== key)];
    const notes = [];
    for (const k of order) {
      const entry = this.get(k);
      if (!entry) continue;
      try {
        const engine = entry.factory(opts);
        const av = await engine.available();
        if (av.ok) {
          return { engine, key: k, fallback: k !== key, notes };
        }
        notes.push(`${entry.meta.label || k}: ${av.reason || '사용할 수 없음'}`);
        await engine.dispose?.();
      } catch (e) {
        notes.push(`${entry.meta.label || k}: ${e.message}`);
      }
    }
    throw new Error(`쓸 수 있는 AI 엔진이 없습니다. ${notes.join(' / ')}`);
  }
}

export { PASS, RESIGN };
