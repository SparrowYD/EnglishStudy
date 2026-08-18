/**
 * 100 LEVEL 커리큘럼.
 *
 * 지금 실제로 플레이할 수 있는 것은 LEVEL 1~40이다.
 * 나머지 챕터는 "이런 순서로 이어진다"는 지도를 보여 주되,
 * 준비 중이라는 사실을 화면에서 분명히 표시한다.
 * (요구사항 79 — 이름만 100개 나열해 놓고 되는 것처럼 보이게 하지 않는다)
 */

import { CHAPTER1 } from './ch1.js';
import { CHAPTER2 } from './ch2.js';
import { CHAPTER3 } from './ch3.js';
import { CHAPTER4 } from './ch4.js';
import { CHAPTER5 } from './ch5.js';
import { CHAPTER6 } from './ch6.js';
import { CHAPTER7 } from './ch7.js';

export const LEVELS = [...CHAPTER1, ...CHAPTER2, ...CHAPTER3, ...CHAPTER4, ...CHAPTER5, ...CHAPTER6, ...CHAPTER7];

export const TOTAL_LEVELS = 100;

/** 완성된 LEVEL 번호 집합. */
export const IMPLEMENTED = new Set(LEVELS.map((l) => l.id));

export function getLevel(id) {
  return LEVELS.find((l) => l.id === Number(id)) || null;
}

/** 챕터 지도. levels가 있는 챕터는 플레이 가능, titles만 있는 챕터는 준비 중. */
export const CHAPTERS = [
  {
    id: 1, range: [1, 10], title: '바둑의 법칙', ready: true,
    summary: '활로 하나로 잡기·단수·자충·패까지 전부 설명한다.',
  },
  {
    id: 2, range: [11, 20], title: '행마의 기본 공식', ready: true,
    summary: '붙임·젖힘·뻗음부터 날일자·한칸뜀까지, 속도와 안전을 저울질하는 법.',
  },
  {
    id: 3, range: [21, 30], title: '좋은 모양과 나쁜 모양', ready: true,
    summary: '모양의 좋고 나쁨을 느낌이 아니라 활로 숫자로 확인한다.',
  },
  {
    id: 4, range: [31, 40], title: '돌을 잡는 전술 공식', ready: true,
    summary: '축·장문으로 잡고, 촉촉수·환격·먹여치기로 상대가 스스로 무너지게 만든다.',
  },
  {
    id: 5, range: [41, 50], title: '고급 맥과 국지전', ready: true,
    summary: '끊는 맥·잇는 맥·치중·조임·후절수·버림돌·패 만들기·팻감.',
  },
  {
    id: 6, range: [51, 60], title: '사활 공식', ready: true,
    summary: '두 눈·가짜 눈·궁도 넓히기와 좁히기·귀의 급소·오궁·육궁.',
  },
  {
    id: 7, range: [61, 70], title: '수상전·빅·패 사활', ready: true,
    summary: '활로 계산·안팎 공배·유가무가·빅·패 사활·귀곡사·육사팔활.',
  },
  {
    id: 8, range: [71, 80], title: '포석과 전판 전략', ready: false,
    summary: '선귀후변중앙·3선과 4선·화점과 소목·벌림·갈라치기·걸침·협공·세력.',
    titles: ['선귀후변중앙', '3선과 4선', '화점과 소목', '벌림', '갈라치기', '걸침', '협공', '세력은 공격에 활용', '아생연후살타', '포석 종합시험'],
  },
  {
    id: 9, range: [81, 90], title: '실전 전략과 위기십결', ready: false,
    summary: '부득탐승부터 세고취화까지, 격언을 상황 판단으로 바꾸는 훈련.',
    titles: ['부득탐승', '입계의완', '공피고아', '기자쟁선', '사소취대', '봉위수기', '신물경속', '동수상응', '피강자보 + 세고취화', '위기십결 종합 BOSS'],
  },
  {
    id: 10, range: [91, 100], title: '끝내기·계산·실전 완성', ready: false,
    summary: '선수와 후수·끝내기의 크기·역끝내기·형세판단·19×19 실전과 FINAL BOSS.',
    titles: ['선수와 후수', '끝내기의 크기', '선수 끝내기', '후수 끝내기', '역끝내기', '끝내기 우선순위', '선수와 끝내기 가치 계산', '형세판단', '19×19 AI 실전시험', 'FINAL BOSS'],
  },
];

export function chapterOf(levelId) {
  return CHAPTERS.find((c) => levelId >= c.range[0] && levelId <= c.range[1]) || null;
}

/** 커리큘럼 지도용 — 100개 항목을 상태와 함께 돌려준다. */
export function levelMap() {
  const out = [];
  for (const ch of CHAPTERS) {
    for (let id = ch.range[0]; id <= ch.range[1]; id++) {
      const lv = getLevel(id);
      out.push({
        id,
        chapter: ch.id,
        chapterTitle: ch.title,
        title: lv ? lv.title : (ch.titles ? ch.titles[id - ch.range[0]] : `LEVEL ${id}`),
        subtitle: lv ? lv.subtitle : '',
        ready: !!lv,
        exam: id % 10 === 0,
      });
    }
  }
  return out;
}
