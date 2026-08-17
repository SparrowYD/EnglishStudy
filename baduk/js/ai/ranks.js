/**
 * 18급 ~ 1급 기력 설정 (요구사항 56·57·58·60).
 *
 * 중요한 설계 원칙:
 *  - 낮은 급수를 "랜덤 착수"로 만들지 않는다(요구사항 79).
 *    대신 **보는 범위와 읽는 깊이를 줄인다.** 사람 초보가 약한 이유는
 *    아무 데나 두어서가 아니라, 방금 둔 곳 주변만 보고 한 수 앞만 읽기 때문이다.
 *  - 그래서 급수가 낮을수록: 시야가 좁고(visionRadius), 단수를 놓치고(atariAwareness),
 *    축을 못 읽고(readsLadder), 큰 곳보다 붙은 곳을 둔다(localBias).
 *  - 급수 표시는 어디까지나 "예상 기력"이며 실제 인간 급수와 같다고 단정하지 않는다(요구사항 58).
 */

/**
 * @typedef {object} RankConfig
 * @property {number} kyu            급수 (18~1)
 * @property {number} visionRadius   최근 착수 주변 몇 칸까지 후보로 볼 것인가 (낮을수록 근시안)
 * @property {number} candidates     정밀 평가할 후보수 개수
 * @property {number} readDepth      포획 수읽기 깊이
 * @property {number} atariAwareness 단수(내 돌/상대 돌)를 알아챌 확률
 * @property {number} readsLadder    축을 읽을 확률
 * @property {number} lifeDeath      사활(눈 모양)을 고려하는 정도 0~1
 * @property {number} fighting       접촉전 정확도 0~1
 * @property {number} opening        포석 판단 0~1 (귀→변→중앙, 3·4선 감각)
 * @property {number} endgame        끝내기 정확도 0~1
 * @property {number} positional     형세판단 정확도 0~1 (기권 판단에 쓰인다)
 * @property {number} blunder        최선 대신 그럴듯한 차선을 고를 확률
 * @property {number} blunderMargin  실수해도 이 점수 차 안쪽에서만 고른다.
 *                                   눈앞의 따냄처럼 확실히 큰 수를 던져 버리는 일은 없다.
 * @property {number} temperature    후보 중 고를 때의 무작위성(0이면 항상 최선)
 */

/** 18급(가장 약함)과 1급(가장 강함)의 값을 정하고 그 사이를 보간한다. */
const WEAKEST = {
  visionRadius: 2,
  candidates: 6,
  readDepth: 1,
  atariAwareness: 0.45,
  readsLadder: 0,
  lifeDeath: 0.05,
  fighting: 0.2,
  opening: 0.05,
  endgame: 0.05,
  positional: 0.1,
  blunder: 0.35,
  blunderMargin: 25,
  temperature: 1.1,
};

const STRONGEST = {
  visionRadius: 19,
  candidates: 26,
  readDepth: 7,
  atariAwareness: 1,
  readsLadder: 1,
  lifeDeath: 0.9,
  fighting: 0.95,
  opening: 0.9,
  endgame: 0.9,
  positional: 0.85,
  blunder: 0.02,
  blunderMargin: 3,
  temperature: 0.12,
};

function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * 급수별 설정. kyu 18 → t=0, kyu 1 → t=1.
 * 중간 급수는 선형 보간하되, 깊이·개수처럼 정수여야 하는 값은 반올림한다.
 */
export function rankConfig(kyu) {
  const k = Math.max(1, Math.min(18, Math.round(kyu)));
  const t = (18 - k) / 17;
  const cfg = { kyu: k };
  for (const key of Object.keys(WEAKEST)) {
    const v = lerp(WEAKEST[key], STRONGEST[key], t);
    cfg[key] = ['visionRadius', 'candidates', 'readDepth'].includes(key) ? Math.round(v) : v;
  }
  return cfg;
}

/** 화면에 보여 줄 급수별 설명(요구사항 57의 예시를 반영). */
export const RANK_NOTES = {
  18: '규칙은 정확히 지키지만 단순한 단수를 놓치기도 하고, 집이라는 개념이 아직 약합니다.',
  17: '가까운 곳의 단수는 대체로 알아봅니다. 여전히 판 전체를 보지는 못합니다.',
  16: '돌을 이어야 할 때와 달아나야 할 때를 조금씩 구분합니다.',
  15: '기본적인 단수·축·연결과 귀의 가치를 이해합니다.',
  14: '끊기면 위험하다는 감각이 생기고, 두 수 앞을 읽기 시작합니다.',
  13: '상대의 약한 돌을 알아보고 쫓아가려 합니다.',
  12: '간단한 사활 모양을 알아보기 시작합니다. 큰 곳과 급한 곳을 조금 구분합니다.',
  11: '포석에서 귀를 먼저 차지하려 하고, 벌림의 개념이 생깁니다.',
  10: '간단한 사활, 기본 포석, 약한 돌 공격, 큰 곳 판단이 가능합니다.',
  9: '축과 장문을 구분하고 방향을 보고 둡니다.',
  8: '세력과 실리를 어느 정도 저울질합니다.',
  7: '수상전의 활로 계산이 제법 정확합니다.',
  6: '침입과 삭감의 시점을 고릅니다.',
  5: '정석 기본, 전투, 사활, 삭감, 침입, 형세판단 능력이 고루 올라옵니다.',
  4: '끝내기의 크기를 비교해 두는 순서를 정합니다.',
  3: '선수와 후수를 의식하며 판을 운영합니다.',
  2: '전투에서 잘 흔들리지 않고 형세 판단이 안정적입니다.',
  1: '상당히 강한 아마추어 수준을 목표로 합니다.',
};

export const KYU_LIST = Array.from({ length: 18 }, (_, i) => 18 - i); // 18급 → 1급

export function kyuLabel(kyu) { return `${kyu}급`; }

/** 요구사항 58 — 게임 안에서 항상 이 문구와 함께 표시한다. */
export const RANK_DISCLAIMER =
  '표시된 급수는 체감 난이도를 맞추기 위한 **예상 기력**입니다. 실제 인간 급수와 정확히 같다고 보장하지 않습니다.';
