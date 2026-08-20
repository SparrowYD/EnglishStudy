/**
 * 콘텐츠 작성 도우미.
 *
 * 요구사항 51: 모든 '공식'은 네 단계로 설명한다.
 *   ① 공식  ② 왜 그런가?  ③ 언제 유효한가?  ④ 언제 예외가 생기는가?
 * 요구사항 73: 용어를 규칙 / 형태 / 테수지 / 사활 기본형 / 격언 / 전략 원칙으로 구분한다.
 */

import { BLACK, WHITE } from '../engine/board.js';
import { STEP } from '../game/stage.js';

export { BLACK, WHITE };

/** 요구사항 73의 분류. 게임 안에서 배지로 표시된다. */
export const KIND = {
  RULE: { key: 'rule', label: '규칙', hint: '반드시 지켜지는 바둑의 법칙입니다.' },
  SHAPE: { key: 'shape', label: '형태', hint: '자주 나오는 돌의 모양입니다. 상황에 따라 평가가 달라집니다.' },
  TESUJI: { key: 'tesuji', label: '테수지', hint: '국지적으로 효과가 큰 수법입니다. 조건이 맞아야 성립합니다.' },
  LIFE: { key: 'life', label: '사활 기본형', hint: '삶과 죽음의 기본 모양입니다.' },
  PROVERB: { key: 'proverb', label: '격언', hint: '경험에서 나온 조언입니다. 절대 법칙이 아닙니다.' },
  STRATEGY: { key: 'strategy', label: '전략 원칙', hint: '판 전체를 보는 사고의 틀입니다.' },
};

/**
 * 공식 카드. formula/why/when/exception 네 칸을 모두 채우도록 강제한다.
 * exception이 비어 있으면 개발 중에 바로 드러나도록 검증 테스트가 잡는다.
 */
export function formula({ name, kind, statement, why, when, exception, related = [] }) {
  return { name, kind, statement, why, when, exception, related };
}

export function concept({ title, body, demo = null, formula: f = null, illustrate = null }) {
  return { type: STEP.CONCEPT, title, body, demo, formula: f, illustrate };
}

/**
 * 따라 두기 — 게임이 알려주는 자리에 사용자가 직접 놓아본다.
 * sequence: [{ at:'D4', color, say }] — color를 생략하면 사용자 색과 상대가 번갈아 둔다.
 */
export function follow({ title, body, setup = {}, sequence, size = 19 }) {
  return { type: STEP.FOLLOW, title, body, setup, sequence, size };
}

export function quiz({ title, question, options, answer, explain }) {
  return { type: STEP.QUIZ, title, question, options, answer, explain };
}

/** 문제 단계. type은 basic / variant / practice / boss 중 하나. */
export function problemStep(type, p) {
  return { type, title: p.title, problem: { ...p, id: p.id } };
}

export const basic = (p) => problemStep(STEP.BASIC, p);
export const variant = (p) => problemStep(STEP.VARIANT, p);
export const practice = (p) => problemStep(STEP.PRACTICE, p);
export const boss = (p) => problemStep(STEP.BOSS, p);

/**
 * 실전 대국 단계(LEVEL 99). 내장 AI와 19×19 한 판을 둔다.
 * 별 계산에는 들어가지 않고 도전 과제로 기록된다.
 */
export function match({ title, body = [], aiKyu = 10, komi = 6.5, handicap = 0 }) {
  return { type: STEP.MATCH, title, body, aiKyu, komi, handicap };
}

export function level({ id, chapter, title, subtitle, formula: f = null, steps }) {
  return { id, chapter, title, subtitle, formula: f, steps };
}
