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
  '두 눈': {
    category: 'life',
    pros: ['두 눈이 나면 그 무리는 더 이상 계산할 필요가 없다. 판 전체를 볼 여유가 생긴다.'],
    mistakes: ['눈이 진짜인지 확인하지 않고 두 눈이라고 여긴다.', '이미 살아 있는 무리에 한 수를 더 들여 손해를 본다.'],
  },
  '진짜 눈의 조건': {
    category: 'life',
    pros: ['눈을 세는 기준이 분명해져 사활 판단이 빨라진다.'],
    mistakes: ['눈 자리의 상하좌우만 보고 대각을 보지 않는다.', '변·귀에서는 대각을 전부 가져야 한다는 것을 잊는다.'],
  },
  '궁도와 삶': {
    category: 'life',
    pros: ['"칸 수"가 아니라 "나눌 수 있는가"로 보게 되어 처음 보는 모양도 스스로 판단할 수 있다.'],
    mistakes: ['넓으니 살았다고 넘겨짚는다.', '이미 살아 있는 직사궁·직오궁에 한 수를 더 둔다.'],
  },
  '궁도 좁히기': {
    category: 'life',
    pros: ['잡는 쪽의 사고 순서가 분명해진다 — 칸 수 → 일렬 여부 → 두루 붙은 점.'],
    mistakes: ['일렬 궁도에 치중해 내 돌만 잡힌다.', '급소를 찾기 전에 바깥부터 메워 상대에게 정비할 시간을 준다.'],
  },
  '귀의 급소': {
    category: 'life',
    pros: ['귀는 경계가 벽 노릇을 해서 같은 칸 수라도 더 쉽게 잡거나 살 수 있다.'],
    mistakes: ['변에서 쓰던 "한가운데" 감각을 귀에 그대로 옮긴다.', '귀곡사처럼 위치에 따라 결과가 뒤집히는 모양을 외운 대로 판단한다.'],
  },
  '네 칸 궁도의 분류': {
    category: 'life',
    pros: ['실전에서 가장 자주 나오는 크기라, 이 다섯 가지만 알아도 사활 판단의 절반이 끝난다.'],
    mistakes: ['사각4궁에 한 수를 들여 살리려 한다(먼저 두어도 죽는다).', '귀에서도 곡사궁이 산다고 여긴다.'],
  },
  '다섯 칸 궁도': {
    category: 'life',
    pros: ['오궁도화·십자오궁만 기억하면 나머지 다섯 칸은 손댈 필요가 없다.'],
    mistakes: ['직오궁에 치중해 돌을 버린다.', '"죽는 모양"을 차례와 무관한 사실로 여긴다.'],
  },
  '여섯 칸 궁도': {
    category: 'life',
    pros: ['넓은 궁도에서도 급소를 찾는 눈이 생긴다.'],
    mistakes: ['여섯 칸이면 무조건 산다고 넘겨짚는다.', '2선에 늘어선 돌을 겉보기 칸 수로 계산한다.'],
  },
  '오궁도화와 매화육궁': {
    category: 'life',
    pros: ['궁도 안의 2×2 네모만 찾으면 급소가 바로 보인다.'],
    mistakes: ['궁도에 이미 상대 돌이 들어와 있는데 겉모양으로 이름을 붙인다.', '먼저 두는 쪽이 이긴다는 것을 잊고 차례를 확인하지 않는다.'],
  },
  '수상전': {
    category: 'life',
    pros: ['활로만 정확히 세면 싸우기 전에 승패를 알 수 있다.'],
    mistakes: ['공유 공배부터 메워 스스로 활로를 줄인다.', '상대에게 눈이 있는데 단순 활로 수로만 계산한다.'],
  },
  '공배를 메우는 순서': {
    category: 'life',
    pros: ['같은 활로 수에서도 한 수를 벌 수 있다.'],
    mistakes: ['안쪽 공배를 먼저 메운다.', '상대가 그 자리로 눈을 내거나 달아날 수 있는데 원칙만 지킨다.'],
  },
  '유가무가 불상전(有家無家 不相戰)': {
    category: 'life',
    pros: ['눈 하나가 한 수 이상의 값을 한다. 수상전 판단이 단순해진다.'],
    mistakes: ['활로 차이가 큰데도 격언만 믿는다.', '양쪽 다 눈이 있는데 유가무가로 착각한다.'],
  },
  '빅': {
    category: 'life',
    pros: ['이길 수 없는 수상전에서 전멸을 피한다.'],
    mistakes: ['두 눈으로 살 수 있는데 빅으로 만들어 집을 날린다.', '빅 자리를 자기 집으로 계산한다.'],
  },
  '패 사활': {
    category: 'life',
    pros: ['죽은 모양에 마지막 기회를 만든다.'],
    mistakes: ['팻감을 세지 않고 패를 시작한다.', '이길 수 없는 패에 팻감을 소모해 다른 곳의 뒷맛까지 없앤다.'],
  },
  '귀의 사활': {
    category: 'life',
    pros: ['경계를 벽으로 쓰면 적은 돌로도 잡거나 살 수 있다.'],
    mistakes: ['변의 감각을 귀에 그대로 옮긴다.', '귀라서 무조건 죽는다고 넘겨짚는다.'],
  },
  '귀곡사': {
    category: 'life',
    pros: ['모양 이름이 아니라 위치까지 보는 습관이 생긴다.'],
    mistakes: ['"곡사궁은 산다"를 귀에서도 적용한다.', '규칙 체계에 따라 처리가 달라진다는 점을 모른 채 단정한다.'],
  },
  '육사팔활(六死八活)': {
    category: 'life',
    pros: ['2선 돌의 생사를 세는 것만으로 판단할 수 있다.'],
    mistakes: ['양끝이 트여 있는데도 숫자를 그대로 적용한다.', '살아 있는 여덟 점에 들어가 굳혀 준다.'],
  },
  '선귀후변중앙(先隅後邊中央)': {
    category: 'opening',
    pros: ['포석의 첫 수를 어디에 둘지 고민하지 않아도 된다. 9집을 만드는 데 귀 6점·변 9점·중앙 12점이라는 숫자가 근거다.'],
    mistakes: ['중앙에 두는 돌을 무조건 손해로 여긴다.', '귀가 다 찼는데도 귀 근처만 맴돈다.'],
  },
  '3선과 4선': {
    category: 'opening',
    pros: ['어느 선에 둘지 판단하는 기준이 생긴다. 상대가 강하면 3선, 세력을 원하면 4선.'],
    mistakes: ['4선이 크다고 3선을 무시해 실리를 다 내준다.', '3선만 두어 판이 낮아진다.'],
  },
  '화점과 소목': {
    category: 'opening',
    pros: ['첫 수의 성격을 고르게 된다 — 빠른 세력이냐 확실한 실리냐.'],
    mistakes: ['화점 한 점으로 귀가 확정됐다고 여긴다.', '급하지 않은 굳힘에 한 수를 쓴다.'],
  },
  '벌림의 거리': {
    category: 'opening',
    pros: ['한 수로 차지하는 넓이를 최대로 하면서도 갈라치기를 견딘다.'],
    mistakes: ['상대가 두터운 쪽으로도 규칙대로 넓게 벌린다.', '겁이 나서 늘 좁게만 벌린다.'],
  },
  '갈라치기': {
    category: 'opening',
    pros: ['상대가 변 전체를 집으로 만드는 것을 한 수로 막는다.'],
    mistakes: ['한쪽에 치우쳐 좁은 쪽에서 협공당한다.', '갈라친 돌로 집을 지으려 한다.'],
  },
  '걸침': {
    category: 'opening',
    pros: ['한 수로 상대의 굳힘을 막고 나도 변에 자리를 잡는다.'],
    mistakes: ['빈 귀가 남아 있는데 걸침부터 둔다.', '상대가 두터운 쪽으로 걸쳐 협공을 맞는다.'],
  },
  '협공': {
    category: 'opening',
    pros: ['지키는 대신 공격하면서 내 진영을 넓힌다.'],
    mistakes: ['내 귀가 약한데 협공한다.', '협공으로 얻은 세력을 쓸 계획이 없다.'],
  },
  '세력의 사용법': {
    category: 'strategy',
    pros: ['두터움이 집이 아니라 힘이라는 것을 알면 판이 커진다.'],
    mistakes: ['세력 앞에 집을 짓는다.', '공격 대상이 없는데 세력만 계속 넓힌다.'],
  },
  '아생연후살타(我生然後殺他)': {
    category: 'strategy',
    pros: ['공격 전에 한 번 멈춰 서게 만든다. 무너지는 판의 대부분이 이 확인을 건너뛴 결과다.'],
    mistakes: ['공격이 즐거워 내 약점을 세지 않는다.', '반대로 너무 조심해서 다 살고 나서야 두려 한다.'],
  },
  '부득탐승(不得貪勝)': {
    category: 'strategy',
    pros: ['앞설 때 판을 흔들지 않게 해 준다. 이길 판을 스스로 망치는 일이 줄어든다.'],
    mistakes: ['지고 있는데도 안전하게만 두어 진 채로 끝낸다.', '형세 판단 없이 태도만 정한다.'],
  },
  '입계의완(入界宜緩)': {
    category: 'strategy',
    pros: ['삭감한 돌이 바깥과 이어져 안전하고, 상대 집은 확실히 줄어든다.'],
    mistakes: ['굳어진 진영에 깊이 뛰어들어 잡힌다.', '반대로 엉성한 진영에도 얕게만 두어 상대 집을 다 인정한다.'],
  },
  '공피고아(攻彼顧我)': {
    category: 'strategy',
    pros: ['공격이 헛수가 되는 것을 막는다. 무너지는 판의 대부분이 이 확인을 건너뛴 결과다.'],
    mistakes: ['상대가 약해 보이면 내 약점을 세지 않는다.', '반대로 모든 약점을 메우려다 판이 느려진다.'],
  },
  '기자쟁선(棄子爭先)': {
    category: 'strategy',
    pros: ['돌 몇 점의 값과 큰 곳의 값을 비교하게 된다. 선수의 개념이 잡힌다.'],
    mistakes: ['상대가 무시할 수 있는 수를 선수라고 착각한다.', '끊는 돌·눈자리 돌까지 버린다.'],
  },
  '사소취대(捨小取大)': {
    category: 'strategy',
    pros: ['감이 아니라 숫자로 고르게 된다.'],
    mistakes: ['급한 곳을 두고 큰 곳부터 둔다.', '익숙한 쪽을 큰 곳이라고 여긴다.'],
  },
  '봉위수기(逢危須棄)': {
    category: 'strategy',
    pros: ['잡힐 돌을 끌고 다니며 손해를 키우는 일이 없어진다.'],
    mistakes: ['상대를 끊고 있는 돌을 돌 수만 보고 버린다.', '그냥 버리기만 하고 대가를 챙기지 않는다.'],
  },
  '신물경속(愼勿輕速)': {
    category: 'strategy',
    pros: ['약점 하나로 판이 무너지는 것을 막는다. 느린 한 수가 열 수를 산다.'],
    mistakes: ['약점을 전부 메우려다 판이 좁아진다.', '약점의 크기를 세지 않는다.'],
  },
  '동수상응(動須相應)': {
    category: 'strategy',
    pros: ['걸침·벌림의 방향을 정하는 기준이 생긴다.'],
    mistakes: ['어울림만 따져 좁은 쪽으로만 둔다.', '따로 노는 돌을 만들어 하나씩 공격당한다.'],
  },
  '피강자보(彼强自保) · 세고취화(勢孤取和)': {
    category: 'strategy',
    pros: ['불리한 싸움을 피해 손해를 최소로 막는다.'],
    mistakes: ['상대가 강한 곳에서 반격을 노리다 통째로 잡힌다.', '살기만 하고 상대에게 완벽한 두터움을 준다.'],
  },
  '선수와 후수': {
    category: 'endgame',
    pros: ['같은 크기의 자리라도 순서를 바꿔 몇 집을 벌 수 있다.'],
    mistakes: ['상대가 받지 않아도 되는 수를 선수라고 여긴다.', '선수를 아무 때나 써서 뒷맛을 없앤다.'],
  },
  '끝내기의 크기': {
    category: 'endgame',
    pros: ['처음 보는 모양에서도 스스로 크기를 정할 수 있다.'],
    mistakes: ['"내가 두면 얼마"만 세고 상대가 두었을 때를 세지 않는다.', '크기만 보고 선수·후수를 무시한다.'],
  },
  '선수 끝내기': {
    category: 'endgame',
    pros: ['두고도 차례가 남아 사실상 공짜로 집을 얻는다.'],
    mistakes: ['상대가 무시할 만큼 작은 수를 선수로 착각한다.', '나중에 엮어 쓸 자리를 미리 소모한다.'],
  },
  '후수 끝내기': {
    category: 'endgame',
    pros: ['크기 순으로 정리하면 되므로 판단이 단순하다.'],
    mistakes: ['작은 후수를 먼저 두어 큰 곳을 내준다.', '아직 사활이 남았는데 끝내기부터 한다.'],
  },
  '역끝내기': {
    category: 'endgame',
    pros: ['내 집을 늘리면서 상대의 공짜를 동시에 없앤다.'],
    mistakes: ['내 선수가 남아 있는데 역끝내기부터 둔다.', '후수라는 것을 잊고 크기를 과대평가한다.'],
  },
  '끝내기의 순서': {
    category: 'endgame',
    pros: ['순서만 지켜도 끝내기에서 몇 집을 번다.'],
    mistakes: ['사활이 남아 있는데 끝내기 순서를 적용한다.'],
  },
  '끝내기 가치 계산': {
    category: 'endgame',
    pros: ['선수와 후수를 같은 단위로 비교할 수 있게 된다.'],
    mistakes: ['두 배라는 어림을 정확한 값으로 여긴다.'],
  },
  '형세판단': {
    category: 'endgame',
    pros: ['앞서는지 뒤지는지를 알아야 전략을 고를 수 있다. 부득탐승의 전제다.'],
    mistakes: ['세력을 집으로 세어 형세를 착각한다.', '사석과 덤을 빠뜨린다.'],
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
