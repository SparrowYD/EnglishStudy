/**
 * 바둑 공식 도감 (요구사항 71·72·73).
 *
 * 항목마다 정의·핵심 원리·언제 쓰는가·장점·주의점·흔한 실수·예외·직접 풀어보기·관련 LEVEL을 제공한다.
 * 각 LEVEL의 공식 카드를 그대로 재사용하므로, 수업에서 배운 문장과 도감의 문장이 어긋나지 않는다.
 *
 * 요구사항 73에 따라 항목을 규칙 / 형태 / 테수지 / 사활 기본형 / 격언 / 전략 원칙으로 구분해 표시한다.
 */

import { LEVELS } from './curriculum.js';
import { KIND } from './authoring.js';
import { STEP } from '../game/stage.js';

/** 요구사항 71의 분류. */
export const CATEGORIES = [
  { key: 'move', label: '행마' },
  { key: 'tactic', label: '전술' },
  { key: 'life', label: '사활' },
  { key: 'opening', label: '포석' },
  { key: 'strategy', label: '전략' },
  { key: 'endgame', label: '끝내기' },
  { key: 'rule', label: '규칙' },
];

/** LEVEL 공식 카드에 없는 정보(장점·흔한 실수)를 이름으로 붙인다. */
const EXTRA = {
  '활로': {
    category: 'rule',
    pros: ['바둑의 모든 판단이 여기서 출발한다. 활로만 셀 줄 알면 잡기·단수·사활을 스스로 읽을 수 있다.'],
    mistakes: ['대각선을 활로로 착각한다.', '이어진 돌을 따로따로 세어 활로를 잘못 계산한다.'],
  },
  '돌의 연결': {
    category: 'rule',
    pros: ['활로를 공유해 훨씬 잡히기 어려워진다.'],
    mistakes: ['대각선으로 놓인 돌을 이미 이어진 것으로 착각한다.'],
  },
  '돌 잡기': {
    category: 'rule',
    pros: ['잡은 돌은 계가에서 상대 집을 메우므로 한 점당 실제로는 두 집 차이가 난다.'],
    mistakes: ['작은 돌 몇 점을 잡느라 더 큰 곳을 놓친다.', '잡을 수 있다는 이유만으로 필요 없는 곳에 수를 들인다.'],
  },
  '단수(斷手)': {
    category: 'rule',
    pros: ['상대에게 응수를 강요할 수 있다.'],
    mistakes: ['의미 없는 단수를 쳐서 상대만 튼튼하게 만든다.', '단수를 치고 정작 잡는 수를 잇지 못한다.'],
  },
  '단수에서 벗어나는 세 가지 방법': {
    category: 'rule',
    pros: ['달아날지 버릴지 판단하는 습관이 실력의 분기점이 된다.'],
    mistakes: ['축에 걸린 돌을 계속 끌고 나가 손해를 키운다.'],
  },
  '자충(自充)과 자살수': {
    category: 'rule',
    pros: ['자충을 알면 상대의 자충을 유도해 잡는 수법(LEVEL 39)으로 이어진다.'],
    mistakes: ['상대 진영 안에서 무심코 자기 활로를 메운다.'],
  },
  '패(劫)': {
    category: 'rule',
    pros: ['팻감이 많은 쪽에게는 강력한 무기가 된다.'],
    mistakes: ['이득이 크지 않은데 패싸움을 시작한다.', '팻감을 아무 곳에나 써서 상대가 받지 않는다.'],
  },
  '붙임': {
    category: 'move',
    pros: ['응수를 물어 방향을 정할 수 있고, 좁은 곳에서 살 길을 만든다.'],
    mistakes: ['약한 상대 돌을 공격하면서 붙여 상대를 튼튼하게 만든다.'],
  },
  '붙이면 젖혀라': {
    category: 'move',
    pros: ['상대의 진행을 막으면서 내 모양이 커진다.'],
    mistakes: ['내 돌이 약한데 젖혀서 끊긴다.', '내 세력이 있는 쪽으로 상대를 몰아 세력을 스스로 부순다.'],
  },
  '뻗음': {
    category: 'move',
    pros: ['끊길 염려가 전혀 없다. 접촉전에서 가장 믿음직하다.'],
    mistakes: ['넓은 곳에서도 뻗기만 해서 상대에게 큰 곳을 다 내준다.'],
  },
  '이음': {
    category: 'move',
    pros: ['두 덩어리가 활로를 공유해 강해진다.'],
    mistakes: ['끊겨도 괜찮은 돌까지 다 이어서 큰 곳을 놓친다.'],
  },
  '호구(虎口)': {
    category: 'move',
    pros: ['돌을 아끼면서 사실상 이은 효과를 낸다. 모양이 넓다.'],
    mistakes: ['호구를 이루는 돌이 단수인데도 호구만 믿고 손을 뺀다.'],
  },
  '쌍립(雙立)': {
    category: 'move',
    pros: ['상대가 사이로 들어와도 반대쪽을 막으면 오히려 상대가 단수가 된다.'],
    mistakes: ['한쪽 덩어리가 약한데 쌍립 모양만 보고 안심한다.'],
  },
  '날일자': {
    category: 'move',
    pros: ['빠르면서도 비교적 튼튼하다. 귀를 지키고 변으로 나갈 때 가장 많이 쓴다.'],
    mistakes: ['접촉전이 벌어진 곳에서 날일자로 벌려 건너붙임을 당한다.'],
  },
  '눈목자': {
    category: 'move',
    pros: ['한 수로 가장 넓은 자리를 차지한다.'],
    mistakes: ['상대가 강한 쪽으로 눈목자해서 갈라진다.'],
  },
  '한칸뜀에 악수 없다': {
    category: 'move',
    pros: ['빠르면서도 사이로 들어온 돌이 자충이 되어 끊기지 않는다.'],
    mistakes: ['상대 돌이 이미 양옆에 있는데도 격언만 믿고 뛴다.'],
  },
  '끼워 끊기': {
    category: 'tactic',
    pros: ['상대를 두 무리로 갈라 약한 쪽을 만들 수 있다. 공격은 대개 끊음에서 시작한다.'],
    mistakes: ['호구 안쪽처럼 자충이 되는 자리에 끊어 한 점을 그냥 준다.', '끊어 놓고도 두 무리가 다 튼튼해 얻는 것이 없다.'],
  },
  '이음의 세 가지 방법': {
    category: 'move',
    pros: ['붙여 잇지 않고 호구·쌍립으로 이으면 같은 한 수로 더 넓게 자리를 잡는다.'],
    mistakes: ['모양 이름만 믿고 끊어 보지 않는다.', '상대 돌이 늘어난 뒤에도 예전 호구를 안전하다고 여긴다.'],
  },
  '치중(置中)': {
    category: 'life',
    pros: ['궁도가 넓어 보이는 무리도 급소 한 수로 잡을 수 있다.'],
    mistakes: ['직사궁·직오궁처럼 치중해도 사는 모양에 두어 돌만 잡힌다.', '칸 수만 세고 모양(한가운데가 있는지)을 보지 않는다.'],
  },
  '조임': {
    category: 'tactic',
    pros: ['상대가 순순히 응수할수록 상대가 나빠진다. 잡지 못하더라도 바깥이 두터워진다.'],
    mistakes: ['잡히는 돌이 작아 상대가 손을 빼 버린다.', '조이는 순서를 틀려 상대에게 활로를 늘릴 기회를 준다.'],
  },
  '후절수(後切手)': {
    category: 'tactic',
    pros: ['갇혀 죽은 줄 알았던 돌이 상대의 활로를 미리 막아 두는 역할을 한다.'],
    mistakes: ['바깥을 메우지 않고 먼저 안쪽에 두어 상대에게 손 뺄 여유를 준다.', '갇힌 돌을 살리려다 기회를 놓친다.'],
  },
  '버림돌': {
    category: 'strategy',
    pros: ['한 수로 지킬 수 있는 곳을 지켜 손해를 최소화한다. 버린 돌로 상대를 자충으로 만들 수도 있다.'],
    mistakes: ['상대를 끊고 있는 돌을 돌 수가 적다는 이유로 버린다.', '버릴 결심을 못 해 두 곳을 다 잃는다.'],
  },
  '연속 희생': {
    category: 'tactic',
    pros: ['한 번으로 안 되는 자리를 두 번, 세 번 던져 넣어 끝낼 수 있다.'],
    mistakes: ['던질 때마다 상대 공간이 줄어드는지 확인하지 않는다.', '상대가 따내지 않아도 되는데 던져 돌만 준다.'],
  },
  '패 만들기': {
    category: 'tactic',
    pros: ['그냥 두면 죽는 돌에 한 번 더 기회를 만든다.'],
    mistakes: ['팻감을 세지 않고 패를 시작한다.', '패에 져서 원래보다 더 나빠진다.'],
  },
  '팻감': {
    category: 'tactic',
    pros: ['상대가 받는 사이에 패를 되따낼 수 있다. 팻감 수가 곧 패의 승부다.'],
    mistakes: ['상대가 무시할 만한 작은 팻감을 써서 패를 그냥 내준다.', '이길 수 없는 패에 팻감을 소모해 뒷맛까지 없앤다.'],
  },
};

/** 아직 LEVEL로 구현되지 않은 항목들 — "준비 중"임을 분명히 표시한다. */
export const UPCOMING = [
  { name: '마늘모', category: 'move', kind: KIND.SHAPE, level: 21, definition: '대각선으로 한 칸 가는 행마. 느리지만 끊기지 않고 힘이 있다.' },
  { name: '빈삼각', category: 'move', kind: KIND.SHAPE, level: 22, definition: '돌 세 개가 ㄱ자로 뭉친 대표적인 나쁜 모양. 같은 돌 수로 활로가 적다.' },
  { name: '들여다봄', category: 'move', kind: KIND.TESUJI, level: 24, definition: '상대 연결의 빈틈을 찔러 이음을 강요하는 수.' },
  { name: '어깨짚기', category: 'move', kind: KIND.SHAPE, level: 25, definition: '상대 돌 위에서 중앙 방향으로 누르는 삭감의 기본 행마.' },
  { name: '모자', category: 'move', kind: KIND.SHAPE, level: 26, definition: '상대 돌 위에 씌워 진출 방향을 제한하는 수.' },
  { name: '건너붙임', category: 'tactic', kind: KIND.TESUJI, level: 27, definition: '상대의 연결선을 흔들며 끊는 맥.' },
  { name: '껴붙임', category: 'tactic', kind: KIND.TESUJI, level: 28, definition: '상대 돌 사이나 약점에 붙여 모양을 무너뜨리는 맥.' },
  { name: '양단수', category: 'tactic', kind: KIND.TESUJI, level: 31, definition: '한 수로 두 곳을 동시에 단수로 만들어 한쪽을 반드시 잡는 수.' },
  { name: '축', category: 'tactic', kind: KIND.TESUJI, level: 32, definition: '계속 단수로 몰아 귀까지 끌고 가 잡는 기술. 진행로에 상대 돌(축머리)이 있으면 성립하지 않는다.' },
  { name: '축머리', category: 'tactic', kind: KIND.TESUJI, level: 34, definition: '축의 진행로에 놓여 축을 무산시키는 돌. 축을 시작하기 전에 반드시 판 전체를 확인해야 한다.' },
  { name: '장문', category: 'tactic', kind: KIND.TESUJI, level: 35, definition: '한 칸 떨어진 곳에서 그물처럼 씌워 잡는 수. 축이 안 될 때의 대안.' },
  { name: '촉촉수', category: 'tactic', kind: KIND.TESUJI, level: 36, definition: '연속 단수로 몰아 결국 잡는 수법.' },
  { name: '환격', category: 'tactic', kind: KIND.TESUJI, level: 37, definition: '한 점을 일부러 잡히게 한 뒤 되잡는 수법.' },
  { name: '먹여치기', category: 'tactic', kind: KIND.TESUJI, level: 38, definition: '상대 활로를 줄이려고 일부러 돌을 던져 넣는 수.' },
  { name: '자충 유도', category: 'tactic', kind: KIND.TESUJI, level: 39, definition: '상대가 스스로 자기 활로를 메우게 만드는 기술.' },
  { name: '두 눈', category: 'life', kind: KIND.LIFE, level: 51, definition: '완전한 눈이 두 개 있으면 상대가 아무리 두어도 잡히지 않는다.' },
  { name: '가짜 눈', category: 'life', kind: KIND.LIFE, level: 52, definition: '눈처럼 보이지만 대각을 상대가 차지해 결국 메워지는 자리.' },
  { name: '궁도 넓히기', category: 'life', kind: KIND.PROVERB, level: 53, definition: '삶은 넓힘에 있다 — 살려면 눈을 낼 공간을 넓혀야 한다.' },
  { name: '1-1 · 2-1 급소', category: 'life', kind: KIND.LIFE, level: 55, definition: '귀는 반상 경계 때문에 특수한 사활 급소가 생긴다.' },
  { name: '오궁도화', category: 'life', kind: KIND.LIFE, level: 59, definition: '다섯 집 모양의 급소. 모양을 외우는 것이 아니라 왜 가운데가 급소인지를 이해해야 한다.' },
  { name: '빅', category: 'life', kind: KIND.LIFE, level: 64, definition: '서로 공배를 메우면 스스로 불리해져 손대지 못하는 공존 형태.' },
  { name: '유가무가 불상전', category: 'life', kind: KIND.PROVERB, level: 63, definition: '집이 있는 쪽과 없는 쪽의 수상전은 싸움이 되지 않는다는 격언. 성립 조건이 있다.' },
  { name: '귀곡사', category: 'life', kind: KIND.LIFE, level: 67, definition: '귀의 특수 사활. 규칙 체계(한국·일본식 / 중국식)에 따라 처리가 달라질 수 있다.' },
  { name: '육사팔활', category: 'life', kind: KIND.PROVERB, level: 68, definition: '2선에서 여섯 점은 죽고 여덟 점은 산다는 격언. 양끝 모양과 선수 여부에 따라 예외가 있다.' },
  { name: '선귀후변중앙', category: 'opening', kind: KIND.PROVERB, level: 71, definition: '귀 → 변 → 중앙 순으로 집을 만들기 쉽다. 같은 돌 수로 만들 수 있는 집을 비교해 보면 알 수 있다.' },
  { name: '3선과 4선', category: 'opening', kind: KIND.STRATEGY, level: 72, definition: '3선은 실리, 4선은 세력. 어느 쪽이 항상 우월하지 않고 균형이 중요하다.' },
  { name: '벌림', category: 'opening', kind: KIND.SHAPE, level: 74, definition: '내 돌에서 적당한 거리를 두고 변으로 펼치는 수.' },
  { name: '갈라치기', category: 'opening', kind: KIND.STRATEGY, level: 75, definition: '상대가 변 전체를 차지하기 전에 중간을 차지해 발전을 제한하는 전략.' },
  { name: '걸침', category: 'opening', kind: KIND.SHAPE, level: 76, definition: '상대 귀의 확장을 견제하는 접근수.' },
  { name: '협공', category: 'opening', kind: KIND.STRATEGY, level: 77, definition: '걸쳐온 돌을 공격하면서 내 세력을 넓히는 수.' },
  { name: '아생연후살타', category: 'strategy', kind: KIND.PROVERB, level: 79, definition: '내 돌을 먼저 살린 뒤에 상대를 공격하라.' },
  { name: '부득탐승', category: 'strategy', kind: KIND.STRATEGY, level: 81, definition: '승리를 지나치게 탐내 무리하지 않는다.' },
  { name: '입계의완', category: 'strategy', kind: KIND.STRATEGY, level: 82, definition: '상대 진영에 들어갈 때 지나치게 깊이 들어가지 않는다.' },
  { name: '사소취대', category: 'strategy', kind: KIND.STRATEGY, level: 85, definition: '작은 이득을 버리고 큰 곳을 차지한다.' },
  { name: '봉위수기', category: 'strategy', kind: KIND.STRATEGY, level: 86, definition: '위험에 처한 돌은 과감히 버린다. 모든 돌을 살리려 하지 않는다.' },
  { name: '선수와 후수', category: 'endgame', kind: KIND.STRATEGY, level: 91, definition: '상대가 반드시 받아야 하는 수가 선수. 선수를 쥐면 다음 큰 곳을 먼저 둘 수 있다.' },
  { name: '끝내기의 크기', category: 'endgame', kind: KIND.STRATEGY, level: 92, definition: '착수 전후의 집 차이로 크기를 계산한다. 외우는 것이 아니라 세는 것이다.' },
  { name: '역끝내기', category: 'endgame', kind: KIND.STRATEGY, level: 95, definition: '상대가 두면 선수로 큰 이득을 얻는 자리를 내가 먼저 차지하는 것.' },
  { name: '형세판단', category: 'endgame', kind: KIND.STRATEGY, level: 98, definition: '확정된 집과 세력을 어림해 지금 누가 앞서는지 판단하는 것.' },
];

/** 도감 전체 항목. LEVEL로 구현된 것이 앞에 오고, 준비 중 항목이 뒤에 온다. */
export function codexEntries() {
  const ready = [];
  for (const lv of LEVELS) {
    if (!lv.formula) continue;
    const f = lv.formula;
    const extra = EXTRA[f.name] || {};
    const practice = lv.steps.find((s) => s.problem && s.type === STEP.BASIC);
    ready.push({
      name: f.name,
      kind: f.kind,
      category: extra.category || 'move',
      ready: true,
      definition: f.statement,
      principle: f.why,
      when: f.when,
      exception: f.exception,
      pros: extra.pros || [],
      mistakes: extra.mistakes || [],
      related: f.related || [],
      level: lv.id,
      levelTitle: lv.title,
      problem: practice ? practice.problem : null,
      diagram: diagramOf(lv),
    });
  }
  const upcoming = UPCOMING.map((u) => ({
    name: u.name,
    kind: u.kind,
    category: u.category,
    ready: false,
    definition: u.definition,
    principle: '',
    when: '',
    exception: '',
    pros: [],
    mistakes: [],
    related: [],
    level: u.level,
    levelTitle: '',
    problem: null,
    diagram: null,
  }));
  return [...ready, ...upcoming];
}

/** 항목의 기본 그림 — 해당 LEVEL의 개념 단계 시연 국면을 그대로 쓴다. */
function diagramOf(lv) {
  const concept = lv.steps.find((s) => s.type === STEP.CONCEPT && s.demo);
  if (!concept) return null;
  return { setup: concept.demo.setup || {}, moves: concept.demo.moves || [] };
}

export function findEntry(name) {
  return codexEntries().find((e) => e.name === name) || null;
}

export function entriesByCategory() {
  const all = codexEntries();
  return CATEGORIES.map((c) => ({
    ...c,
    entries: all.filter((e) => e.category === c.key),
  })).filter((c) => c.entries.length > 0);
}
