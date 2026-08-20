/**
 * CHAPTER 1 — 바둑의 법칙 (LEVEL 1~10)
 *
 * 이 챕터의 목표는 "규칙을 외우는 것"이 아니라
 * 활로라는 하나의 개념으로 잡기·단수·자충·패가 전부 설명된다는 것을 몸으로 아는 것이다.
 */

import {
  level, concept, follow, quiz, basic, variant, practice, boss, formula, KIND, BLACK, WHITE,
} from './authoring.js';

export const CHAPTER1 = [

  /* ============================ LEVEL 1 ============================ */
  level({
    id: 1, chapter: 1,
    title: '돌 놓기',
    subtitle: '바둑판 위 어디에 돌을 놓는가',
    steps: [
      concept({
        title: '돌은 선이 만나는 점에 놓는다',
        body: [
          '바둑판은 가로 19줄, 세로 19줄입니다. 돌은 칸 안이 아니라 **선과 선이 만나는 점(교차점)** 에 놓습니다.',
          '19×19 바둑판에는 교차점이 361개 있습니다. 그래서 바둑에서 둘 수 있는 자리는 361곳입니다.',
          '흑이 먼저 두고, 흑과 백이 한 수씩 번갈아 둡니다. **한 번 놓은 돌은 움직이지 않습니다.** 옮기고 싶어도 옮길 수 없습니다.',
          '판 위에 굵게 찍힌 점 9개를 **화점**이라고 합니다. 바둑판의 기준점이 되는 자리입니다.',
        ],
        demo: {
          setup: {},
          moves: [
            { at: 'D4', color: BLACK, note: '왼쪽 아래 화점' },
            { at: 'Q16', color: WHITE, note: '오른쪽 위 화점' },
            { at: 'K10', color: BLACK, note: '판 한가운데 — 천원' },
          ],
        },
      }),

      follow({
        title: '직접 놓아 봅시다',
        body: ['알려주는 자리에 차례대로 놓아 보세요. 좌표는 가로가 글자, 세로가 숫자입니다. (바둑에서는 I를 쓰지 않습니다)'],
        sequence: [
          { at: 'D4', color: BLACK, say: '왼쪽 아래 화점 D4에 흑을 놓아 보세요.' },
          { at: 'Q16', color: WHITE, say: '이번엔 오른쪽 위 화점 Q16에 백을 놓습니다.' },
          { at: 'K10', color: BLACK, say: '마지막으로 판 한가운데 K10(천원)입니다.' },
        ],
      }),

      basic({
        id: 'L1-b1',
        title: '화점에 놓기',
        prompt: '굵은 점으로 표시된 **화점** 아무 곳에나 흑을 놓아 보세요.',
        setup: {},
        toPlay: BLACK,
        goal: { type: 'point', accept: ['D4', 'K4', 'Q4', 'D10', 'K10', 'Q10', 'D16', 'K16', 'Q16'], reason: '화점은 반상에 굵게 표시된 아홉 개의 점입니다. 그중 한 곳이어야 합니다.' },
        successMessage: '좋습니다. 화점은 9곳 모두 정답입니다.',
        explanation: '화점은 D4·K4·Q4·D10·K10·Q10·D16·K16·Q16 아홉 곳입니다.',
        hints: ['굵게 표시된 점을 찾아보세요. 모두 9곳입니다.'],
      }),

      variant({
        id: 'L1-b2',
        title: '빈 자리에만 둘 수 있다',
        prompt: '이미 돌이 놓인 자리에는 둘 수 없습니다. **비어 있는 화점**에 흑을 놓으세요.',
        setup: { black: ['D4', 'Q4'], white: ['D16', 'Q16'] },
        toPlay: BLACK,
        goal: { type: 'point', accept: ['K4', 'D10', 'K10', 'Q10', 'K16'], reason: '비어 있는 화점만 정답입니다. 이미 돌이 놓인 자리에는 둘 수 없습니다.' },
        comments: {
          D4: '여기엔 이미 흑돌이 있습니다. 돌 위에 돌을 겹쳐 놓을 수는 없습니다.',
          Q16: '여기엔 이미 백돌이 있습니다. 다른 화점을 찾아보세요.',
        },
        explanation: '남아 있는 화점은 K4·D10·K10·Q10·K16 다섯 곳입니다.',
      }),

      practice({
        id: 'L1-b3',
        title: '귀 · 변 · 중앙',
        prompt: '바둑판은 **귀(모서리), 변(가장자리), 중앙**으로 나눠 봅니다. 네 귀의 화점 중 아직 비어 있는 곳에 두세요.',
        setup: { black: ['D4'], white: ['Q16'] },
        toPlay: BLACK,
        goal: { type: 'point', accept: ['Q4', 'D16'], reason: '네 귀의 화점 중 아직 비어 있는 곳이어야 합니다. 귀는 반상의 네 모서리 부근입니다.' },
        comments: {
          K10: '천원(중앙)입니다. 지금 문제는 귀의 화점을 찾는 것입니다.',
          K4: '변의 화점입니다. 귀가 아닙니다.',
        },
        explanation: '네 귀의 화점은 D4·Q4·D16·Q16이고, 그중 Q4와 D16이 비어 있습니다.',
        hints: ['네 모서리 쪽을 보세요.'],
      }),

      boss({
        id: 'L1-boss',
        title: 'BOSS — 천원을 찾아라',
        prompt: '바둑판의 **정확히 한가운데** 점에 흑을 놓으세요. 이 자리를 천원(天元)이라고 합니다.',
        setup: { black: ['D4', 'Q4'], white: ['D16', 'Q16'] },
        toPlay: BLACK,
        goal: { type: 'point', accept: ['K10'], reason: '천원은 반상의 정확한 한가운데 — 가로도 세로도 열 번째 줄이 만나는 점입니다.' },
        explanation: '19줄의 한가운데는 열 번째 줄이므로 K10이 천원입니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 2 ============================ */
  level({
    id: 2, chapter: 1,
    title: '활로',
    subtitle: '돌이 숨 쉬는 길',
    formula: formula({
      name: '활로',
      kind: KIND.RULE,
      statement: '돌에 상하좌우로 붙어 있는 빈 점을 활로라고 하며, 활로가 0이 되면 돌은 판에서 들어낸다.',
      why: '바둑에서 돌을 잡는다는 것은 곧 상대 돌의 활로를 전부 메운다는 뜻이기 때문이다. 잡기·단수·자충·패가 모두 이 하나의 개념에서 나온다.',
      when: '언제나. 활로는 규칙이지 격언이 아니다.',
      exception: '예외는 없다. 다만 **대각선은 활로가 아니다** — 초보자가 가장 많이 착각하는 지점이다.',
      related: ['단수', '자충', '돌 잡기'],
    }),
    steps: [
      concept({
        title: '활로 — 돌이 숨 쉬는 길',
        body: [
          '돌에 **상하좌우로 바로 붙어 있는 빈 점**을 활로(活路)라고 합니다. 돌이 숨 쉬는 길이라고 생각하면 쉽습니다.',
          '**대각선은 활로가 아닙니다.** 이것이 초보자가 가장 많이 헷갈리는 부분입니다.',
          '놓는 자리에 따라 활로 수가 달라집니다. 중앙은 4개, 변은 3개, 귀는 2개입니다.',
          '귀의 돌은 활로가 2개뿐이라 약해 보이지만, 그만큼 **적은 돌로 집을 만들기 쉽다**는 장점이 있습니다. 이 이야기는 나중에 포석에서 다시 다룹니다.',
        ],
        demo: {
          setup: {},
          moves: [
            { at: 'K10', color: BLACK, note: '중앙 — 활로 4개', showLiberties: true },
            { at: 'A10', color: WHITE, note: '변 — 활로 3개', showLiberties: true },
            { at: 'A1', color: BLACK, note: '귀 — 활로 2개', showLiberties: true },
          ],
        },
      }),

      basic({
        id: 'L2-b1',
        title: '활로 2개인 자리',
        prompt: '놓았을 때 그 돌의 **활로가 2개**가 되는 자리에 흑을 놓으세요.',
        setup: {},
        toPlay: BLACK,
        goal: { type: 'liberties', count: 2 },
        successMessage: '맞습니다. 귀는 활로가 2개뿐입니다.',
        explanation: '네 귀(A1·A19·T1·T19)는 붙어 있는 빈 점이 2개뿐입니다. 정답은 네 곳 모두입니다.',
        hints: ['가장자리 중에서도 더 구석진 곳을 생각해 보세요.'],
      }),

      variant({
        id: 'L2-b2',
        title: '활로 3개인 자리',
        prompt: '이번에는 **활로가 3개**가 되는 자리에 두세요.',
        setup: {},
        toPlay: BLACK,
        goal: { type: 'liberties', count: 3 },
        explanation: '가장자리 한 줄(1선) 위의 점은 판 밖으로는 활로가 없으므로 3개가 됩니다. 귀는 2개이므로 제외됩니다.',
        hints: ['가장자리 줄 위에 두어 보세요. 단, 모서리는 아닙니다.'],
      }),

      practice({
        id: 'L2-b3',
        title: '상대 돌 옆은 활로가 줄어든다',
        prompt: '백돌 옆에 두면 내 활로도 줄어듭니다. 흑을 두어 **활로가 3개**가 되게 하세요. (단, 판 가운데 쪽에서)',
        setup: { white: ['K10'] },
        toPlay: BLACK,
        goal: { type: 'liberties', count: 3 },
        comments: {
          K11: '백돌에 딱 붙였습니다. 붙인 돌은 활로가 3개가 되지요. 정답입니다.',
        },
        explanation: '백돌에 바로 붙이면 그 방향은 활로가 아니므로 4개가 아니라 3개가 됩니다. 가장자리(1선)에 두어도 3개가 되므로 그것도 정답입니다.',
        hints: ['활로 4개짜리 자리에서 한 방향을 상대 돌이 막고 있으면 몇 개가 될까요?'],
      }),

      quiz({
        title: '개념 확인',
        question: '흑돌 하나가 K10(중앙)에 있습니다. 백이 K11에 두면 흑돌의 활로는 몇 개가 될까요?',
        options: ['4개', '3개', '2개', '변하지 않는다'],
        answer: 1,
        explain: '원래 4개였던 활로 중 위쪽 한 곳을 백돌이 차지했으므로 3개가 됩니다.',
      }),

      boss({
        id: 'L2-boss',
        title: 'BOSS — 활로를 가장 많이',
        prompt: '흑을 두어 그 돌의 **활로가 4개**가 되게 하세요.',
        setup: { white: ['C3', 'D17', 'Q4'] },
        toPlay: BLACK,
        goal: { type: 'liberties', count: 4 },
        explanation: '가장자리(1선)가 아니고 상대 돌에도 붙지 않은 자리라면 활로가 4개입니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 3 ============================ */
  level({
    id: 3, chapter: 1,
    title: '연결된 돌',
    subtitle: '붙어 있으면 한 덩어리',
    formula: formula({
      name: '돌의 연결',
      kind: KIND.RULE,
      statement: '같은 색 돌이 상하좌우로 붙어 있으면 하나의 덩어리가 되어 활로를 함께 쓴다. 잡힐 때도 함께 잡힌다.',
      why: '활로를 공유하므로 따로 있을 때보다 잡기 어려워진다. 두 점이 이어지면 활로가 6개가 된다.',
      when: '언제나 — 이것은 규칙이다.',
      exception: '규칙 자체에는 예외가 없다. 다만 "이었으니 무조건 안전하다"는 생각은 틀리다. 뭉쳐서 이으면 활로는 늘어도 효율이 떨어질 수 있고(LEVEL 22 빈삼각), 대각선으로 놓인 돌은 아직 이어진 것이 아니다.',
      related: ['활로', '이음', '호구'],
    }),
    steps: [
      concept({
        title: '붙어 있는 같은 색 돌은 한 덩어리',
        body: [
          '같은 색 돌이 **상하좌우로 붙어 있으면** 하나의 덩어리가 됩니다. 이 덩어리는 활로를 함께 쓰고, 잡힐 때도 함께 잡힙니다.',
          '돌 한 점의 활로는 중앙에서 4개입니다. 두 점이 이어지면 4+4=8이 아니라 **6개**가 됩니다. 서로 맞닿은 두 자리는 활로가 아니기 때문입니다.',
          '**대각선으로 놓인 돌은 아직 이어진 것이 아닙니다.** 사이가 비어 있어 상대가 파고들 수 있습니다. 이 "이어질 듯 말 듯한 관계"가 바둑의 재미이자 어려움입니다.',
        ],
        demo: {
          setup: {},
          moves: [
            { at: 'D4', color: BLACK, note: '한 점 — 활로 4개', showLiberties: true },
            { at: 'D5', color: BLACK, note: '이으면 두 점이 한 덩어리 — 활로 6개', showLiberties: true },
          ],
        },
      }),

      basic({
        id: 'L3-b1',
        title: '두 돌을 잇기',
        prompt: '백이 양옆에서 노리고 있습니다. 흑 두 점(D4·D6)을 **잇는** 자리에 두세요.',
        setup: { black: ['D4', 'D6'], white: ['C5', 'E5'] },
        toPlay: BLACK,
        goal: { type: 'connect', a: 'D4', b: 'D6' },
        explanation: 'D5에 두면 세 점이 완전히 한 덩어리가 됩니다. 백이 끊고 들어올 자리가 사라집니다.',
        hints: ['두 흑돌 사이의 빈 점을 보세요.'],
      }),

      variant({
        id: 'L3-b2',
        title: '가로로 벌어진 두 점',
        prompt: '이번에는 좌우로 떨어져 있습니다. 흑 두 점(D4·F4)을 이으세요.',
        setup: { black: ['D4', 'F4'], white: ['E5', 'E3'] },
        toPlay: BLACK,
        goal: { type: 'connect', a: 'D4', b: 'F4' },
        explanation: 'E4가 두 돌을 잇는 유일한 점입니다. 백이 먼저 E4에 두면 흑은 두 동강이 납니다.',
        hints: ['백이 먼저 두면 가장 곤란한 자리가 어디일까요?'],
      }),

      practice({
        id: 'L3-b3',
        title: '따내면서 잇기',
        prompt: '백돌 하나가 흑을 끊고 있습니다. 이 백돌을 **따내면서** 흑을 이으세요.',
        setup: { black: ['D4', 'F4', 'E5'], white: ['E4'] },
        toPlay: BLACK,
        goal: { type: 'connect', a: 'D4', b: 'F4' },
        explanation: '백 E4는 활로가 E3 하나뿐입니다. E3에 두면 백돌을 따내고, 그 자리가 비면서 흑이 이어집니다. 잇는 방법은 사이를 메우는 것만이 아닙니다.',
        hints: ['끊고 있는 백돌의 활로가 몇 개인지 세어 보세요.'],
      }),

      quiz({
        title: '개념 확인',
        question: '흑돌이 D4와 E5에 대각선으로 놓여 있습니다. 이 두 돌은 이어져 있을까요?',
        options: [
          '이어져 있다 — 붙어 있으니까',
          '이어져 있지 않다 — 대각선은 연결이 아니다',
          '흑 차례면 이어져 있다',
        ],
        answer: 1,
        explain: '대각선은 연결이 아닙니다. 다만 상대가 사이로 들어와도 대개 한 수로 이을 수 있어 "느슨한 연결"로 봅니다. 이 모양을 마늘모라고 하며 LEVEL 21에서 다룹니다.',
      }),

      boss({
        id: 'L3-boss',
        title: 'BOSS — 끊길 자리를 지켜라',
        prompt: '백이 한 수로 흑을 끊으려 합니다. **미리 막아** 흑 D4와 D6이 확실히 이어지게 하세요.',
        setup: { black: ['D4', 'D6', 'C7'], white: ['C5', 'E5', 'E6', 'E4'] },
        toPlay: BLACK,
        goal: { type: 'connect', a: 'D4', b: 'D6' },
        explanation: 'D5 자리가 유일한 연결점입니다. 백에게 이 자리를 내주면 흑 두 점이 갈라져 각각 약해집니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 4 ============================ */
  level({
    id: 4, chapter: 1,
    title: '돌 잡기',
    subtitle: '활로를 모두 메우면 들어낸다',
    formula: formula({
      name: '돌 잡기',
      kind: KIND.RULE,
      statement: '상대 돌 덩어리의 활로를 마지막 하나까지 메우면 그 돌을 판에서 들어내 잡는다.',
      why: '활로가 0이 된 돌은 살아 있을 수 없다는 것이 바둑의 기본 약속이다. 잡은 돌은 계가할 때 상대 집을 메우는 데 쓰이므로 그대로 점수가 된다.',
      when: '언제나. 다만 잡는 데 드는 수의 개수와 잡아서 얻는 이득을 비교해야 한다.',
      exception: '"잡을 수 있으면 잡는다"는 항상 옳지는 않다. 작은 돌 몇 점을 잡으려다 더 큰 곳을 놓치는 일이 흔하다(LEVEL 85 사소취대). 일부러 잡히게 두는 버림돌 전술도 있다(LEVEL 46).',
      related: ['활로', '단수'],
    }),
    steps: [
      concept({
        title: '활로를 모두 메우면 잡는다',
        body: [
          '상대 돌의 **활로를 마지막 하나까지 메우면** 그 돌을 판에서 들어냅니다. 이것이 돌을 잡는다는 뜻입니다.',
          '잡은 돌은 따로 모아 둡니다. 대국이 끝나면 이 돌로 상대 집을 메우기 때문에, 한 점을 잡으면 실제로는 **집 두 개만큼** 차이가 납니다.',
          '한 덩어리는 함께 잡힙니다. 다섯 점이 이어져 있다면 활로를 다 메우는 순간 다섯 점이 한꺼번에 들려 나갑니다.',
        ],
        demo: {
          setup: { white: ['D4'], black: ['C4', 'D5', 'E4'] },
          moves: [
            { at: 'D3', color: BLACK, note: '마지막 활로를 메우면 백돌이 들려 나간다' },
          ],
        },
      }),

      follow({
        title: '따라 두기 — 한 점 잡기',
        body: ['백돌 D4의 활로가 하나 남았습니다. 그 자리에 두어 직접 따내 보세요.'],
        setup: { white: ['D4'], black: ['C4', 'D5', 'E4'] },
        sequence: [
          { at: 'D3', color: BLACK, say: '마지막 활로 D3에 두세요. 백돌이 판에서 사라집니다.' },
        ],
      }),

      basic({
        id: 'L4-b1',
        title: '한 점 잡기',
        prompt: '백돌 한 점을 잡으세요.',
        setup: { white: ['D4'], black: ['C4', 'D5', 'E4'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['D4'], immediate: true },
        explanation: '백 D4의 마지막 활로는 D3입니다.',
      }),

      variant({
        id: 'L4-b2',
        title: '귀에서 잡기',
        prompt: '귀에 있는 백돌은 활로가 적습니다. A1의 백돌을 잡으세요.',
        setup: { white: ['A1'], black: ['A2'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A1'], immediate: true },
        explanation: '귀의 돌은 활로가 2개뿐입니다. A2가 이미 막혀 있으니 B1 하나만 메우면 잡힙니다.',
        hints: ['귀의 돌에게 남은 활로는 몇 개일까요?'],
      }),

      practice({
        id: 'L4-b3',
        title: '두 점 한꺼번에',
        prompt: '이어진 백 두 점을 한꺼번에 잡으세요.',
        setup: { white: ['D4', 'D5'], black: ['C4', 'C5', 'D3', 'D6', 'E4'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['D4'], immediate: true },
        explanation: '백 두 점은 한 덩어리이므로 활로도 함께 셉니다. 마지막 남은 E5를 메우면 두 점이 동시에 들려 나갑니다.',
        hints: ['백 두 점 전체의 활로를 세어 보세요. 하나만 남았습니다.'],
      }),

      boss({
        id: 'L4-boss',
        title: 'BOSS — 지금 잡을 수 있는 쪽',
        prompt: '백돌이 두 군데 있습니다. **지금 한 수로 잡을 수 있는 쪽**을 잡으세요.',
        setup: {
          white: ['D4', 'Q16'],
          black: ['C4', 'D5', 'E4', 'P16', 'Q17'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['D4'], immediate: true },
        comments: {
          Q15: '오른쪽 위 백돌은 활로가 아직 2개(Q15·R16)입니다. 한 수로는 잡히지 않습니다.',
          R16: '오른쪽 위 백돌은 활로가 아직 2개 남아 한 수로 잡을 수 없습니다.',
        },
        explanation: '왼쪽 아래 백 D4는 활로가 D3 하나뿐이라 바로 잡힙니다. 오른쪽 위 백 Q16은 활로가 둘이라 한 수로는 잡지 못합니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 5 ============================ */
  level({
    id: 5, chapter: 1,
    title: '단수',
    subtitle: '다음 수에 잡겠다는 예고',
    formula: formula({
      name: '단수(斷手)',
      kind: KIND.RULE,
      statement: '활로가 하나만 남은 상태를 단수라고 한다. 상대가 손을 빼면 다음 수에 잡힌다.',
      why: '활로가 1개라는 것은 그 한 점만 메우면 잡힌다는 뜻이므로, 단수는 곧 "잡겠다"는 예고다.',
      when: '상대 돌의 활로가 2개일 때 하나를 메우면 단수가 된다.',
      exception: '단수를 쳤다고 반드시 잡히는 것은 아니다. 상대는 달아나거나(LEVEL 6), 내 돌을 되잡거나, 그 돌을 버리고 더 큰 곳을 둘 수 있다. **의미 없는 단수는 오히려 내 수만 낭비하고 상대를 튼튼하게 만든다.**',
      related: ['활로', '돌 잡기', '단수에서 탈출'],
    }),
    steps: [
      concept({
        title: '단수 — 활로가 하나 남았다',
        body: [
          '활로가 **하나만 남은** 상태를 단수라고 합니다. 다음 수에 그 한 점을 메우면 돌이 잡힙니다.',
          '그래서 단수는 "잡겠다"는 예고입니다. 단수를 당한 쪽은 그냥 두면 안 되고, 달아나거나 되받아쳐야 합니다.',
          '하지만 **단수를 쳤다고 반드시 잡는 것은 아닙니다.** 상대가 달아나 버리면 오히려 상대 돌만 튼튼해지고 내 수는 낭비됩니다. 이 이야기는 다음 LEVEL에서 확인합니다.',
        ],
        demo: {
          setup: { white: ['D4'], black: ['C4', 'D5'] },
          moves: [
            { at: 'E4', color: BLACK, note: '활로가 D3 하나만 남았다 — 단수!' },
          ],
        },
      }),

      basic({
        id: 'L5-b1',
        title: '단수 만들기',
        prompt: '백돌을 **단수**로 만드세요. (활로를 하나만 남기면 됩니다)',
        setup: { white: ['D4'], black: ['C4', 'D5'] },
        toPlay: BLACK,
        goal: { type: 'atari', targets: ['D4'] },
        successMessage: '단수! 활로가 하나만 남았습니다.',
        explanation: '백 D4의 활로는 D3와 E4 두 개입니다. 둘 중 어느 쪽을 메워도 단수가 되므로 정답은 두 곳입니다.',
        hints: ['백돌의 활로가 몇 개인지 먼저 세어 보세요.'],
      }),

      variant({
        id: 'L5-b2',
        title: '두 점을 단수로',
        prompt: '이어진 백 두 점을 단수로 만드세요.',
        setup: { white: ['D4', 'E4'], black: ['C4', 'D5', 'E5', 'D3'] },
        toPlay: BLACK,
        goal: { type: 'atari', targets: ['D4'] },
        explanation: '백 두 점의 활로는 E3과 F4 두 개입니다. 어느 쪽을 메워도 단수가 됩니다.',
        hints: ['두 점은 한 덩어리이므로 활로를 함께 세어야 합니다.'],
      }),

      practice({
        id: 'L5-b3',
        title: '자충이 되지 않게',
        prompt: '백돌을 단수로 만드세요. 두면 안 되는 자리가 하나 섞여 있습니다.',
        setup: {
          white: ['D4', 'C5', 'C3', 'B4'],
          black: ['D5', 'E4'],
        },
        toPlay: BLACK,
        goal: { type: 'atari', targets: ['D4'] },
        comments: {
          C4: '여기는 사방이 백돌이라 놓는 순간 활로가 0이 됩니다. 자살수이므로 규칙상 둘 수 없습니다.',
        },
        explanation: '백 D4의 활로는 C4와 D3입니다. 그런데 C4는 사방이 백이라 자살수여서 둘 수 없습니다. 따라서 D3이 정답입니다.',
        hints: ['백 D4의 활로 두 곳을 먼저 찾고, 그중 내가 실제로 둘 수 있는 자리를 고르세요.'],
      }),

      boss({
        id: 'L5-boss',
        title: 'BOSS — 단수 자리를 찾아라',
        prompt: '백 세 점을 단수로 만드세요.',
        setup: {
          white: ['D4', 'D5', 'D6'],
          black: ['C4', 'C5', 'C6', 'E4', 'E5', 'E6'],
        },
        toPlay: BLACK,
        goal: { type: 'atari', targets: ['D4'] },
        explanation: '백 세 점은 한 덩어리이므로 활로를 함께 셉니다. 남은 활로는 위쪽 D7과 아래쪽 D3 두 곳뿐이므로, 어느 쪽을 메워도 단수가 됩니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 6 ============================ */
  level({
    id: 6, chapter: 1,
    title: '단수에서 탈출',
    subtitle: '달아나거나, 되잡거나, 버리거나',
    formula: formula({
      name: '단수에서 벗어나는 세 가지 방법',
      kind: KIND.RULE,
      statement: '단수를 당하면 ① 뻗어서 활로를 늘리거나 ② 상대 돌을 되잡거나 ③ 그 돌을 버린다.',
      why: '활로가 1개인 돌은 그대로 두면 잡힌다. 활로를 늘리는 것이 가장 직접적인 대응이고, 나를 몰고 있는 상대 돌을 잡으면 문제 자체가 사라진다.',
      when: '달아났을 때 활로가 충분히 늘어나고, 달아난 뒤에도 계속 몰리지 않는 경우.',
      exception: '**달아나면 오히려 손해인 경우가 많다.** 축(LEVEL 32)에 걸린 돌은 아무리 도망쳐도 결국 잡히며, 도망칠수록 잡히는 돌만 늘어난다. 이럴 땐 버리는 것이 정답이다(LEVEL 46 버림돌).',
      related: ['단수', '축', '버림돌'],
    }),
    steps: [
      concept({
        title: '단수를 당했다면',
        body: [
          '내 돌이 단수를 당하면 세 가지 선택이 있습니다.',
          '**① 뻗는다** — 활로가 있는 쪽으로 한 점 이어 활로를 늘립니다. 가장 기본적인 대응입니다.',
          '**② 되잡는다** — 나를 몰고 있는 상대 돌이 마침 단수라면, 그 돌을 먼저 잡아 버립니다.',
          '**③ 버린다** — 살려도 이득이 없거나 아무리 달아나도 잡히는 돌이라면 그냥 버리고 더 큰 곳을 둡니다. 이것도 훌륭한 선택입니다.',
          '중요한 것은 **달아나는 것이 항상 옳지는 않다**는 점입니다. 이 판단은 앞으로 계속 연습하게 됩니다.',
        ],
        demo: {
          setup: { black: ['D4'], white: ['C4', 'D5', 'D3'] },
          moves: [
            { at: 'E4', color: BLACK, note: '뻗어서 활로를 3개로 늘린다' },
          ],
        },
      }),

      basic({
        id: 'L6-b1',
        title: '뻗어서 달아나기',
        prompt: '흑 D4가 단수입니다. 뻗어서 살리세요.',
        setup: { black: ['D4'], white: ['C4', 'D5', 'D3'] },
        toPlay: BLACK,
        goal: { type: 'escape', group: 'D4', minLiberties: 3 },
        explanation: 'E4로 뻗으면 활로가 3개로 늘어 당장은 안전합니다. 남은 활로는 E5·F4·E3입니다.',
        hints: ['백돌이 막고 있지 않은 방향은 한 곳뿐입니다.'],
      }),

      variant({
        id: 'L6-b2',
        title: '두 점을 살리기',
        prompt: '흑 두 점이 단수입니다. 살리세요.',
        setup: { black: ['D4', 'E4'], white: ['C4', 'D5', 'E5', 'D3', 'E3'] },
        toPlay: BLACK,
        goal: { type: 'escape', group: 'D4', minLiberties: 3 },
        explanation: 'F4로 뻗으면 활로가 F5·G4·F3 세 개로 늘어납니다.',
        hints: ['두 점 전체에 남은 활로가 어디인지 보세요.'],
      }),

      practice({
        id: 'L6-b3',
        title: '되잡아서 살기',
        prompt: '흑 D4가 단수입니다. 그런데 나를 몰고 있는 백돌도 위험해 보입니다. **백돌을 되잡아** 흑을 살리세요.',
        setup: {
          black: ['D4', 'C5', 'C3'],
          white: ['C4', 'D5', 'D3', 'E5', 'E3'],
        },
        toPlay: BLACK,
        goal: { type: 'escape', group: 'D4', minLiberties: 2 },
        comments: {
          E4: '뻗어 보아도 F4 하나만 남는 단수입니다. 이 방향으로는 달아날 수 없습니다.',
        },
        explanation: '백 C4는 흑 C5·C3에 눌려 활로가 B4 하나뿐입니다. B4에 두면 백 한 점이 들려 나가고, 그 빈자리가 흑 D4의 새 활로가 됩니다. E4로 뻗는 것은 다시 단수라 소용이 없습니다. 달아나는 것만이 사는 길은 아닙니다.',
        hints: ['나를 몰고 있는 백돌의 활로를 세어 보세요.', '백 C4에 남은 활로는 딱 한 곳입니다.'],
      }),

      quiz({
        title: '원칙의 한계 — 꼭 달아나야 할까?',
        question: '단수를 당한 돌은 언제나 달아나는 것이 좋을까요?',
        options: [
          '그렇다 — 잡히면 무조건 손해다',
          '아니다 — 달아나도 결국 잡히는 모양이면 오히려 손해가 커진다',
          '상대가 강할 때만 달아난다',
        ],
        answer: 1,
        explain: '달아난 돌이 결국 잡히면 잡히는 돌만 늘어나고, 그 사이 상대는 주변이 두터워집니다. 축(LEVEL 32)이 대표적인 예입니다. 살릴 수 없는 돌은 일찍 버리는 것이 정답일 때가 많습니다.',
      }),

      boss({
        id: 'L6-boss',
        title: 'BOSS — 살릴 수 있는 쪽',
        prompt: '흑 세 점이 단수입니다. 열려 있는 방향을 찾아 살리세요.',
        setup: {
          black: ['D4', 'E4', 'F4'],
          white: ['C4', 'D5', 'E5', 'F5', 'D3', 'E3', 'F3'],
        },
        toPlay: BLACK,
        goal: { type: 'escape', group: 'D4', minLiberties: 3 },
        explanation: '위아래가 모두 막혀 있고 왼쪽도 백돌이 있습니다. 열린 방향은 오른쪽뿐이므로 G4로 뻗어야 합니다. 뻗고 나면 활로가 G5·H4·G3 세 개로 늘어납니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 7 ============================ */
  level({
    id: 7, chapter: 1,
    title: '여러 돌의 활로',
    subtitle: '어느 쪽으로 이어야 튼튼한가',
    steps: [
      concept({
        title: '덩어리가 커지면 활로도 달라진다',
        body: [
          '돌을 이으면 활로를 함께 씁니다. 하지만 **어느 방향으로 잇느냐에 따라 활로 수가 크게 달라집니다.**',
          '중앙 쪽으로 이으면 활로가 많이 늘고, 가장자리 쪽으로 이으면 적게 늘어납니다. 판 밖으로는 활로가 없기 때문입니다.',
          '같은 "잇기"라도 좋은 이음과 나쁜 이음이 있습니다. 활로 수를 세어 보는 습관이 수읽기의 출발점입니다.',
        ],
        demo: {
          setup: { black: ['D4'] },
          moves: [
            { at: 'D5', color: BLACK, note: '중앙 쪽으로 이으면 활로 6개', showLiberties: true },
          ],
        },
      }),

      basic({
        id: 'L7-b1',
        title: '활로가 가장 많아지는 이음',
        prompt: '흑 D4에 한 점을 이어 **활로가 6개**가 되게 하세요.',
        setup: { black: ['D4'] },
        toPlay: BLACK,
        goal: { type: 'liberties', group: 'D4', count: 6 },
        explanation: '중앙 쪽(C4·D5·E4·D3 어느 쪽이든 1선이 아니면) 이으면 두 점의 활로가 6개가 됩니다.',
        hints: ['두 점이 이어지면 맞닿은 두 자리는 활로에서 빠집니다.'],
      }),

      variant({
        id: 'L7-b2',
        title: '가장자리에서는 다르다',
        prompt: '흑 A4에 한 점을 이어 활로가 **4개**가 되게 하세요.',
        setup: { black: ['A4'] },
        toPlay: BLACK,
        goal: { type: 'liberties', group: 'A4', count: 4 },
        explanation: '가장자리를 따라 A3이나 A5로 이으면 활로가 4개뿐입니다. 판 밖으로는 활로가 없기 때문입니다. B4로 중앙 쪽으로 이으면 5개가 됩니다.',
        hints: ['가장자리 줄을 따라 이어 보세요.'],
      }),

      practice({
        id: 'L7-b3',
        title: '포위망 안에서 활로 늘리기',
        prompt: '흑 두 점의 활로는 지금 2개입니다. 한 수로 활로를 **3개**로 늘리세요. 두 방향 중 하나만 정답입니다.',
        setup: {
          black: ['D4', 'D5'],
          white: ['C4', 'C5', 'D6', 'D3', 'E6'],
        },
        toPlay: BLACK,
        goal: { type: 'liberties', group: 'D4', count: 3 },
        comments: {
          E5: '위쪽에 백 E6이 버티고 있어 이쪽으로 뻗으면 활로가 2개밖에 되지 않습니다.',
        },
        explanation: 'E4로 뻗으면 활로가 E5·E3·F4 세 개가 됩니다. E5 쪽은 백 E6이 막고 있어 활로가 2개뿐입니다. 같은 "뻗음"이라도 방향에 따라 결과가 다릅니다.',
        hints: ['두 방향으로 각각 뻗어 본다고 상상하고, 활로 수를 직접 세어 비교해 보세요.'],
      }),

      boss({
        id: 'L7-boss',
        title: 'BOSS — 튼튼하게 잇기',
        prompt: '떨어진 흑 두 점을 이어 한 덩어리로 만드세요.',
        setup: {
          black: ['D4', 'D6'],
          white: ['C4', 'C6', 'E4', 'E6', 'C5', 'E5'],
        },
        toPlay: BLACK,
        goal: { type: 'connect', a: 'D4', b: 'D6' },
        explanation: 'D5로 이으면 세 점이 한 덩어리가 됩니다. 백이 먼저 D5에 두면 흑 두 점은 각각 활로 2개짜리 약한 돌이 되어 버립니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 8 ============================ */
  level({
    id: 8, chapter: 1,
    title: '자충',
    subtitle: '스스로 활로를 메우는 수',
    formula: formula({
      name: '자충(自充)과 자살수',
      kind: KIND.RULE,
      statement: '스스로 활로를 줄이는 수를 자충이라 한다. 놓는 순간 활로가 0이 되는 자리(자살수)에는 아예 둘 수 없다.',
      why: '활로가 0인 돌은 판 위에 존재할 수 없기 때문이다. 다만 그 수로 상대 돌을 따낸다면 활로가 생기므로 둘 수 있다.',
      when: '규칙이므로 언제나 적용된다.',
      exception: '자살수 금지에는 예외가 없지만, **자충 자체는 금지가 아니다.** 활로를 줄이면서도 이득이 큰 수는 얼마든지 있다. 먹여치기(LEVEL 38)는 일부러 자기 돌을 잡히게 던져 넣는 수법이다.',
      related: ['활로', '먹여치기', '빅'],
    }),
    steps: [
      concept({
        title: '자충 — 스스로 숨통을 조이는 수',
        body: [
          '내가 둔 수 때문에 **내 돌의 활로가 오히려 줄어드는 것**을 자충이라고 합니다.',
          '특히 놓는 순간 활로가 0이 되는 자리에는 **아예 둘 수 없습니다.** 이것을 자살수라고 하며, 바둑의 규칙으로 금지되어 있습니다.',
          '단, 그 수로 **상대 돌을 따낸다면** 이야기가 다릅니다. 상대 돌이 들려 나가면서 빈자리가 생겨 내 돌에 활로가 생기므로, 그 수는 합법입니다.',
          '자충이 늘 나쁜 것은 아닙니다. 나중에 배울 먹여치기는 일부러 자기 돌을 던져 넣어 상대의 활로를 줄이는 수법입니다.',
        ],
        demo: {
          setup: { white: ['C4', 'D5', 'E4', 'D3'] },
          moves: [
            { at: 'K10', color: BLACK, note: 'D4는 활로가 0이 되므로 둘 수 없다 — 눌러 보면 규칙이 안내된다' },
          ],
        },
      }),

      basic({
        id: 'L8-b1',
        title: '자살수는 둘 수 없다',
        prompt: '백에게 완전히 둘러싸인 D4에는 둘 수 없습니다. 흑돌의 활로가 **2개 이상**이 되는 안전한 자리에 두세요.',
        setup: { white: ['C4', 'D5', 'E4', 'D3'] },
        toPlay: BLACK,
        goal: { type: 'liberties', min: 2 },
        comments: {
          D4: '여기는 자살수입니다. 놓는 순간 활로가 0이 되므로 규칙상 둘 수 없습니다.',
        },
        explanation: '백에게 둘러싸인 한 점 자리만 아니면 됩니다. 활로가 2개 이상 남는 자리를 고르세요.',
      }),

      variant({
        id: 'L8-b2',
        title: '따낼 수 있다면 둘 수 있다',
        prompt: '겉보기엔 자살수 같지만, 이 수는 **백돌을 따내므로** 둘 수 있습니다. 백 네 점을 잡으세요.',
        setup: {
          white: ['C4', 'D5', 'E4', 'D3'],
          black: ['C5', 'D6', 'E5', 'B4', 'F4', 'C3', 'E3', 'D2'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['C4'], immediate: true },
        explanation: 'D4에 두면 백 네 점의 활로가 모두 없어져 들려 나갑니다. 상대를 따내는 수는 자살수가 아닙니다.',
        hints: ['백 네 점을 한 덩어리로 보고 남은 활로를 세어 보세요.'],
      }),

      practice({
        id: 'L8-b3',
        title: '자충을 피해서 단수',
        prompt: '백 D4를 단수로 만드세요. 단, **내 돌이 단수가 되는 자충**은 정답이 아닙니다.',
        setup: {
          white: ['D4', 'E5', 'F4'],
          black: ['C4', 'D5'],
        },
        toPlay: BLACK,
        requireSafe: true,
        goal: { type: 'atari', targets: ['D4'] },
        comments: {
          E4: '백 D4는 단수가 되지만, 이 흑돌 자신도 E3 하나만 남은 단수입니다. 백이 E3에 두면 흑돌이 먼저 잡히므로 아무 소용이 없습니다.',
        },
        explanation: '백 D4의 활로는 D3과 E4입니다. E4는 백 E5·F4에 둘러싸여 스스로 단수가 되는 자충이라 소용이 없습니다. D3에 두어야 내 돌도 안전하면서 백을 단수로 몰 수 있습니다.',
        hints: ['두 곳 다 백을 단수로 만들 수 있습니다. 그런데 한쪽은 내 돌이 먼저 잡힙니다.'],
      }),

      boss({
        id: 'L8-boss',
        title: 'BOSS — 자살수처럼 보이지만',
        prompt: '귀의 백 세 점을 잡으세요. 언뜻 둘 수 없어 보이는 자리가 정답입니다.',
        setup: {
          white: ['A2', 'B2', 'B1'],
          black: ['A3', 'B3', 'C2', 'C1'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A2'], immediate: true },
        explanation: 'A1은 상하좌우가 백돌이라 자살수처럼 보입니다. 그러나 이 수가 백 세 점의 마지막 활로를 메우므로 백이 먼저 들려 나가고, 그 빈자리가 흑돌의 활로가 됩니다. 따라서 합법입니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 9 ============================ */
  level({
    id: 9, chapter: 1,
    title: '패',
    subtitle: '바로 되따낼 수는 없다',
    formula: formula({
      name: '패(劫)',
      kind: KIND.RULE,
      statement: '한 점을 따낸 자리를 상대가 곧바로 되따낼 수는 없다. 다른 곳을 한 번 둔 뒤에야 되따낼 수 있다.',
      why: '이 규칙이 없으면 서로 한 점씩 무한히 되따내며 대국이 영원히 끝나지 않는다.',
      when: '딱 한 점을 따냈고 그 결과 딴 돌도 활로가 하나뿐일 때 패가 성립한다.',
      exception: '두 점 이상을 한꺼번에 따냈다면 패가 아니라 그냥 따낸 것이므로 바로 되따낼 수 있다. 또한 패는 "손해"가 아니라 강력한 무기다 — 상대가 반드시 받아야 할 곳을 두어(팻감) 이득을 얻는 수단이 된다(LEVEL 49).',
      related: ['돌 잡기', '팻감', '패 사활'],
    }),
    steps: [
      concept({
        title: '패 — 무한 반복을 막는 규칙',
        body: [
          '서로 한 점씩 계속 되따낼 수 있는 모양이 생기면 대국이 끝나지 않습니다. 그래서 **방금 따낸 자리를 곧바로 되따내는 것은 금지**되어 있습니다.',
          '되따내려면 먼저 **다른 곳에 한 수**를 두어야 합니다. 상대가 그 수에 응수하면 그때 비로소 패를 되따낼 수 있습니다.',
          '이때 두는 "다른 곳의 한 수"를 **팻감**이라고 합니다. 상대가 받지 않으면 손해가 큰 자리여야 팻감 구실을 합니다.',
          '패는 성가신 규칙이 아니라 **강력한 무기**입니다. 팻감이 많은 쪽이 패싸움에서 이깁니다.',
          '주의: **두 점 이상을 한꺼번에 따냈다면 패가 아닙니다.** 그때는 바로 되따낼 수 있습니다.',
        ],
        demo: {
          setup: { black: ['C4', 'D5', 'D3'], white: ['D4', 'E5', 'E3', 'F4'] },
          moves: [
            { at: 'E4', color: BLACK, note: '백 D4 한 점을 따낸다 — 이제 백은 D4에 바로 둘 수 없다' },
          ],
        },
      }),

      follow({
        title: '따라 두기 — 패 따내기',
        body: ['전형적인 패 모양입니다. 흑이 백 한 점을 따내 봅시다. 그다음 백이 바로 되따내려 하면 어떻게 되는지 확인합니다.'],
        setup: { black: ['C4', 'D5', 'D3'], white: ['D4', 'E5', 'E3', 'F4'] },
        sequence: [
          { at: 'E4', color: BLACK, say: 'E4에 두어 백 D4 한 점을 따내세요.' },
          { at: 'Q16', color: WHITE, say: '백은 D4에 바로 둘 수 없어 다른 곳(팻감)을 둡니다.' },
          { at: 'R16', color: BLACK, say: '흑이 팻감을 받아 줍니다.' },
          { at: 'D4', color: WHITE, say: '이제야 백이 패를 되따낼 수 있습니다.' },
        ],
      }),

      basic({
        id: 'L9-b1',
        title: '패를 따내기',
        prompt: '패 모양입니다. 백 한 점을 따내세요.',
        setup: { black: ['C4', 'D5', 'D3'], white: ['D4', 'E5', 'E3', 'F4'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['D4'], immediate: true },
        explanation: 'E4로 백 한 점을 따냅니다. 이 순간 백은 D4에 바로 둘 수 없습니다.',
      }),

      variant({
        id: 'L9-b2',
        title: '이것은 패가 아니다',
        prompt: '백 **두 점**을 따내세요. 두 점 이상을 따내면 패가 아니라 그냥 따낸 것입니다.',
        setup: {
          white: ['D5', 'E5'],
          black: ['C5', 'D6', 'E6', 'F5', 'C4', 'D4', 'D3', 'E3', 'F4'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['D5'], immediate: true },
        explanation: 'E4에 두면 백 두 점이 들려 나갑니다. 두 점을 따냈으므로 패가 성립하지 않고, 백은 바로 그 자리에 둘 수 있습니다.',
        hints: ['백 두 점의 남은 활로는 한 곳입니다.'],
      }),

      practice({
        id: 'L9-b4',
        title: '패를 없애 버리기',
        prompt: '패를 계속 싸우는 대신 **이어서 없애는** 방법도 있습니다. 흑 C4와 D3을 확실히 이으세요.',
        setup: { black: ['C4', 'D5', 'D3', 'E4'], white: ['E5', 'E3', 'F4', 'C3', 'C5'] },
        toPlay: BLACK,
        goal: { type: 'connect', a: 'C4', b: 'D3' },
        explanation: 'D4에 이으면 패 모양 자체가 사라져 더 이상 시달리지 않습니다. 패는 이득이 클 때 싸우고, 그렇지 않으면 없애 버리는 것도 훌륭한 선택입니다.',
        hints: ['패가 생기는 자리를 내가 먼저 메워 버리면 됩니다.'],
      }),

      boss({
        id: 'L9-boss',
        title: 'BOSS — 패를 따내라',
        prompt: '흑 차례입니다. 패를 따내세요.',
        setup: {
          black: ['C16', 'D17', 'D15'],
          white: ['D16', 'E17', 'E15', 'F16'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['D16'], immediate: true },
        explanation: 'E16으로 백 한 점을 따냅니다. 위치가 바뀌어도 패 모양을 알아보는 것이 중요합니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 10 ============================ */
  level({
    id: 10, chapter: 1,
    title: '기본 규칙 종합시험',
    subtitle: 'CHAPTER 1 — 활로·잡기·단수·자충·패',
    steps: [
      concept({
        title: '종합시험 안내',
        body: [
          'CHAPTER 1에서 배운 것을 모두 확인합니다. **★★ 이상**을 받아야 다음 챕터가 열립니다.',
          '지금까지 배운 규칙은 사실 하나로 이어집니다. **활로** 하나만 알면 잡기·단수·자충·패가 전부 설명됩니다.',
          '문제를 풀 때는 항상 "이 돌의 활로가 몇 개인가?"부터 세어 보세요.',
        ],
      }),

      basic({
        id: 'L10-1',
        title: '1 — 잡기',
        prompt: '백돌을 잡으세요.',
        setup: { white: ['E4', 'E5'], black: ['D4', 'D5', 'F4', 'F5', 'E3'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['E4'], immediate: true },
        explanation: '백 두 점은 한 덩어리입니다. 좌우와 아래가 모두 막혀 있으므로 남은 활로는 E6 하나뿐입니다.',
      }),

      variant({
        id: 'L10-2',
        title: '2 — 단수',
        prompt: '백 두 점을 단수로 만드세요.',
        setup: { white: ['D4', 'D5'], black: ['C4', 'C5', 'D6', 'E5'] },
        toPlay: BLACK,
        goal: { type: 'atari', targets: ['D4'] },
        explanation: '백 두 점에 남은 활로는 D3과 E4입니다. 어느 쪽을 메워도 단수가 됩니다.',
      }),

      practice({
        id: 'L10-3',
        title: '3 — 탈출',
        prompt: '단수당한 흑 두 점을 살리세요.',
        setup: { black: ['D4', 'E4'], white: ['C4', 'D5', 'E5', 'D3', 'E3'] },
        toPlay: BLACK,
        goal: { type: 'escape', group: 'D4', minLiberties: 3 },
        explanation: 'F4로 뻗으면 활로가 셋으로 늘어납니다.',
      }),

      practice({
        id: 'L10-4',
        title: '4 — 연결',
        prompt: '흑 두 점이 끊기지 않도록 이으세요.',
        setup: { black: ['D4', 'F4'], white: ['E5', 'E3', 'C4', 'G4'] },
        toPlay: BLACK,
        goal: { type: 'connect', a: 'D4', b: 'F4' },
        explanation: 'E4가 유일한 연결점입니다.',
      }),

      boss({
        id: 'L10-boss',
        title: 'BOSS — 패를 따내라',
        prompt: '마지막 문제입니다. 패를 따내세요. 힌트는 없습니다.',
        setup: {
          black: ['P4', 'Q5', 'Q3'],
          white: ['Q4', 'R5', 'R3', 'S4'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['Q4'], immediate: true },
        explanation: 'R4로 백 한 점을 따내는 패입니다. CHAPTER 1을 통과했습니다!',
      }),
    ],
  }),
];
