/**
 * 스테이지 엔진 — LEVEL을 문제 번호가 아니라 게임의 한 스테이지로 굴린다(요구사항 52·53).
 *
 * 한 LEVEL의 내부 순서:
 *   개념 배우기 → 따라 두기 → 기본 문제 → 변형 문제 → 실전 문제 → BOSS 문제
 * BOSS는 힌트 없이 풀어야 하고, BOSS를 통과해야 다음 LEVEL이 열린다.
 */

import { ProblemSession, VERDICT } from './problem.js';

export const STEP = {
  CONCEPT: 'concept',   // 짧은 설명 + 시연
  FOLLOW: 'follow',     // 알려주는 대로 직접 놓아보기
  BASIC: 'basic',       // 기본 문제
  VARIANT: 'variant',   // 돌 위치가 조금 바뀐 형태
  PRACTICE: 'practice', // 실전에서 나올 법한 형태
  BOSS: 'boss',         // 힌트 없이
  QUIZ: 'quiz',         // 개념 확인(종합시험 등)
  MATCH: 'match',       // 내장 AI와의 실전 대국(요구사항 54의 LEVEL 99)
};

export const STEP_LABEL = {
  [STEP.CONCEPT]: '개념 배우기',
  [STEP.FOLLOW]: '따라 두기',
  [STEP.BASIC]: '기본 문제',
  [STEP.VARIANT]: '변형 문제',
  [STEP.PRACTICE]: '실전 문제',
  [STEP.BOSS]: 'BOSS 문제',
  [STEP.QUIZ]: '개념 확인',
  [STEP.MATCH]: '실전 대국',
};

/** BOSS 단계에서는 힌트·정답 보기를 쓸 수 없다. */
export function hintsAllowed(step) {
  return step.type !== STEP.BOSS;
}

/** 별 산정에 반영되는 "핵심 문제" — 개념/따라두기는 제외한다. */
/**
 * 별 계산에 들어가는 단계인가.
 * 실전 대국(MATCH)은 결과를 기록하되 별에는 넣지 않는다 —
 * 한 판을 이겨야만 커리큘럼이 열리면 진도가 막히기 때문이다.
 * 대신 통과 여부를 화면과 프로필에 남겨 "도전 과제"로 다룬다.
 */
export function isScored(step) {
  return step.type !== STEP.CONCEPT && step.type !== STEP.FOLLOW && step.type !== STEP.MATCH;
}

export class StageSession {
  constructor(level) {
    this.level = level;
    this.steps = level.steps || [];
    this.index = 0;
    this.records = this.steps.map(() => ({ done: false, hints: 0, wrong: 0, revealed: false }));
    this.startedAt = Date.now();
  }

  get current() { return this.steps[this.index]; }
  get record() { return this.records[this.index]; }
  get total() { return this.steps.length; }
  get finished() { return this.index >= this.steps.length; }

  /** 현재 단계의 문제 세션을 만든다(문제 단계일 때만). */
  makeProblemSession() {
    const step = this.current;
    if (!step || !step.problem) return null;
    return new ProblemSession(step.problem, { allowHints: hintsAllowed(step) });
  }

  markDone() {
    if (this.record) this.record.done = true;
  }

  recordHint() { if (this.record) this.record.hints += 1; }
  recordWrong() { if (this.record) this.record.wrong += 1; }
  recordReveal() { if (this.record) this.record.revealed = true; }

  next() {
    this.index = Math.min(this.index + 1, this.steps.length);
    return this.current;
  }

  /** 요구사항 53의 별 기준. */
  stars() {
    const scored = this.steps
      .map((s, i) => ({ s, r: this.records[i] }))
      .filter(({ s }) => isScored(s));
    const bossIdx = this.steps.findIndex((s) => s.type === STEP.BOSS);
    const bossOk = bossIdx < 0 ? true : this.records[bossIdx].done;
    if (!bossOk) return 0;

    const anyRevealed = scored.some(({ r }) => r.revealed);
    if (anyRevealed) return 1;                       // ★☆☆ 정답 보기 사용

    const hints = scored.reduce((a, { r }) => a + r.hints, 0);
    const wrong = scored.reduce((a, { r }) => a + r.wrong, 0);
    if (hints === 0 && wrong === 0) return 3;        // ★★★ 완벽
    return 2;                                        // ★★☆ 통과
  }

  summary() {
    const scored = this.steps.map((s, i) => ({ s, r: this.records[i] })).filter(({ s }) => isScored(s));
    return {
      stars: this.stars(),
      solved: scored.filter(({ r }) => r.done).length,
      total: scored.length,
      hints: scored.reduce((a, { r }) => a + r.hints, 0),
      wrong: scored.reduce((a, { r }) => a + r.wrong, 0),
      revealed: scored.some(({ r }) => r.revealed),
      seconds: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }
}

/* ------------------------------------------------------------------ *
 * 해금 규칙
 * ------------------------------------------------------------------ */

/** 10·20·…·100은 종합시험 LEVEL. */
export function isExamLevel(levelId) {
  return levelId % 10 === 0;
}

export const EXAM_PASS_STARS = 2; // 종합시험은 ★★ 이상이어야 다음 챕터로

/**
 * 다음 LEVEL 해금 여부.
 * 기본은 ★ 하나만 받아도 진행, 종합시험만 기준이 높다(요구사항 53).
 */
export function unlocksNext(levelId, stars) {
  if (stars <= 0) return false;
  return isExamLevel(levelId) ? stars >= EXAM_PASS_STARS : stars >= 1;
}

export function unlockRequirementText(levelId) {
  return isExamLevel(levelId)
    ? `종합시험입니다. ★★ 이상이어야 다음 챕터가 열립니다.`
    : `★ 하나 이상이면 다음 LEVEL이 열립니다.`;
}
