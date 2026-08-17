/**
 * CHAPTER 4 — 돌을 잡는 전술 공식 (LEVEL 31~40)
 *
 * 이 챕터는 규칙 엔진의 수읽기가 그대로 채점기가 된다.
 * 축은 readLadder가 끝까지 읽고, 장문은 국지 포획 탐색이 판정한다.
 * 그래서 "정답 좌표"를 적어 두지 않고도 축이 성립하는지/무산되는지를 그때그때 계산한다.
 */

import {
  level, concept, follow, quiz, basic, variant, practice, boss, formula, KIND, BLACK, WHITE,
} from './authoring.js';

/** 아래 변 문제들이 공유하는 흑 울타리. 같은 좌표를 반복해 적지 않기 위한 것이다. */
const EDGE_WALL = ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'F1', 'F2'];

export const CHAPTER4 = [

  /* ============================ LEVEL 31 ============================ */
  level({
    id: 31, chapter: 4,
    title: '양단수',
    subtitle: '한 수로 두 곳을 동시에 단수',
    formula: formula({
      name: '양단수',
      kind: KIND.TESUJI,
      statement: '한 수로 상대의 두 무리를 동시에 단수로 만드는 수. 상대는 한쪽만 살릴 수 있으므로 반드시 한쪽을 잡는다.',
      why: '단수를 당한 쪽은 한 수로 한 곳만 지킬 수 있다. 두 곳이 동시에 단수라면 나머지 한 곳은 다음 수에 그냥 잡힌다. 상대의 응수를 기다릴 필요가 없는 확정 이득이다.',
      when: '상대의 두 무리가 각각 활로 2개이고, 그 활로가 한 점에서 겹칠 때. 끊긴 상대 돌들이 얽혀 있는 곳에서 자주 생긴다.',
      exception: '양단수라도 **잡는 돌이 작으면 이득이 작다.** 상대가 한쪽을 버리고 그 대가로 더 큰 것을 얻으면 오히려 손해다. 또 양단수를 서두르다 내 돌의 약점을 방치하는 일이 흔하다 — 두기 전에 내 돌부터 확인한다(LEVEL 79 아생연후살타).',
      related: ['단수(斷手)', '끊음', '축'],
    }),
    steps: [
      concept({
        title: '양단수 — 상대는 한쪽만 살린다',
        body: [
          '한 수로 **두 무리를 동시에 단수**로 만드는 수를 양단수라고 합니다.',
          '상대는 한 수로 한 곳만 지킬 수 있습니다. 그러니 나머지 한쪽은 반드시 잡힙니다.',
          '상대의 응수를 볼 필요도 없는 **확정 이득**입니다.',
          '조건은 분명합니다. 상대의 두 무리가 각각 활로 2개이고, 그 활로가 **한 점에서 겹쳐야** 합니다.',
        ],
        demo: {
          setup: { black: ['C4', 'D5', 'E2', 'F3'], white: ['D4', 'E3'] },
          moves: [{ at: 'E4', color: BLACK, note: '백 D4와 E3이 한꺼번에 단수 — 양단수' }],
        },
      }),

      basic({
        id: 'L31-b1',
        title: '양단수를 찾아라',
        prompt: '백 D4와 E3을 **동시에 단수**로 만드세요.',
        setup: { black: ['C4', 'D5', 'E2', 'F3'], white: ['D4', 'E3'] },
        toPlay: BLACK,
        goal: { type: 'double-atari', count: 2 },
        successMessage: '양단수! 백은 한쪽만 살릴 수 있습니다.',
        explanation: '백 D4의 활로는 D3·E4, 백 E3의 활로도 D3·E4입니다. 두 무리의 활로가 겹치는 D3 또는 E4에 두면 양쪽이 동시에 단수가 됩니다.',
        hints: ['백 두 무리의 활로를 각각 적어 보고, 겹치는 점을 찾으세요.'],
      }),

      variant({
        id: 'L31-b2',
        title: '겹치는 점을 찾아라',
        prompt: '위치가 바뀌었습니다. 백 두 무리를 동시에 단수로 만드세요.',
        setup: { black: ['P16', 'Q17', 'R14', 'S15'], white: ['Q16', 'R15'] },
        toPlay: BLACK,
        goal: { type: 'double-atari', count: 2 },
        explanation: '백 Q16의 활로는 Q15·R16, 백 R15의 활로도 Q15·R16입니다. 겹치는 두 점 중 어디에 두어도 양단수입니다.',
        hints: ['두 백돌은 대각선으로 놓여 있습니다. 그 사이 두 점을 보세요.'],
      }),

      practice({
        id: 'L31-b3',
        title: '양단수 뒤에는 잡는다',
        prompt: '백이 한쪽을 이어 살렸습니다. 이제 **남은 쪽을 잡으세요.**',
        setup: { black: ['C4', 'D5', 'E2', 'F3', 'E4', 'C3'], white: ['D4', 'E3', 'D3'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['D4'], immediate: true },
        explanation: '백이 D3으로 이어 D4·D3·E3이 한 덩어리가 되었습니다. 남은 활로는 D2 하나뿐이므로, D2를 메우면 세 점이 한꺼번에 들려 나갑니다. 양단수는 이렇게 확실한 이득으로 바뀝니다.',
        hints: ['이어진 백 세 점의 활로를 세어 보세요.'],
      }),

      quiz({
        title: '원칙의 한계',
        question: '양단수가 보이면 언제나 바로 두는 것이 좋을까요?',
        options: [
          '그렇다 — 확정 이득이니 무조건 둔다',
          '아니다 — 잡는 돌이 작고 내 돌이 더 급하면 먼저 내 돌을 지켜야 한다',
          '초반에만 좋다',
        ],
        answer: 1,
        explain: '양단수로 얻는 것이 한두 점인데 내 대마가 위험하다면 순서가 뒤바뀐 것입니다. 이득의 **크기를 비교하는 습관**이 필요합니다. 게다가 양단수 자리는 대개 없어지지 않으니 급할 이유도 없습니다.',
      }),

      boss({
        id: 'L31-boss',
        title: 'BOSS — 양단수',
        prompt: '백 두 무리를 동시에 단수로 만드세요. 힌트는 없습니다.',
        setup: { black: ['C10', 'D11', 'E8', 'F9'], white: ['D10', 'E9'] },
        toPlay: BLACK,
        goal: { type: 'double-atari', count: 2 },
        explanation: '두 백돌의 활로가 겹치는 D9 또는 E10이 양단수 자리입니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 32 ============================ */
  level({
    id: 32, chapter: 4,
    title: '축의 원리',
    subtitle: '어느 쪽에서 몰아야 하는가',
    formula: formula({
      name: '축(蓄)',
      kind: KIND.TESUJI,
      statement: '활로 2개인 돌을 계속 단수로 몰아 반상 끝까지 끌고 가 잡는 기술.',
      why: '단수를 당한 돌이 뻗어도 활로가 다시 2개뿐이면, 또 단수를 칠 수 있다. 이 과정이 반복되면 상대는 결국 반상 가장자리에 몰려 활로를 잃는다. 달아나면 달아날수록 잡히는 돌만 늘어난다.',
      when: '상대 돌의 활로가 2개이고, 한쪽을 막으면 상대가 뻗어도 활로가 2개에 머무를 때. **어느 쪽에서 모는지가 전부다** — 방향이 틀리면 상대는 활로 3개를 얻어 달아난다.',
      exception: '축은 **진행로에 상대 돌이 하나만 있어도 무산된다**(축머리, LEVEL 34). 그리고 무산된 축을 억지로 몰면 내 돌만 약해지고 상대는 두터워진다. 축을 시작하기 전에 **끝까지 읽고 판 전체를 확인**해야 한다.',
      related: ['단수(斷手)', '축머리', '장문'],
    }),
    steps: [
      concept({
        title: '축 — 계속 몰아서 잡는다',
        body: [
          '활로가 2개인 돌을 **계속 단수로 몰아** 반상 끝까지 끌고 가 잡는 것이 축입니다.',
          '단수당한 돌이 뻗어도 활로가 다시 2개뿐이면, 또 단수를 칠 수 있습니다. 이 과정이 반복됩니다.',
          '결국 상대는 가장자리에 몰려 더 뻗을 곳이 없어집니다. **달아나면 달아날수록 잡히는 돌만 늘어납니다.**',
          '가장 중요한 것은 **방향**입니다. 잘못된 쪽에서 몰면 상대는 활로 3개를 얻어 그냥 달아납니다.',
        ],
        demo: {
          setup: { black: ['Q3', 'R4', 'S4'], white: ['R3'] },
          moves: [
            { at: 'R2', color: BLACK, note: '아래에서 몰면 백은 오른쪽으로만 갈 수 있다' },
            { at: 'S3', color: WHITE, note: '백이 뻗었지만 활로는 다시 2개' },
            { at: 'S2', color: BLACK, note: '또 단수 — 이것이 축이다' },
          ],
        },
      }),

      basic({
        id: 'L32-b1',
        title: '축으로 몰아 잡기',
        prompt: '백 R3을 **축으로 잡으세요.** 매 수마다 백을 단수로 몰아야 합니다. 방향을 틀리면 백이 달아납니다.',
        setup: { black: ['Q3', 'R4', 'S4'], white: ['R3'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['R3'], immediate: true },
        moveGoal: { type: 'atari', targets: ['R3'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'R3' },
        maxMoves: 8,
        explanation: 'R2로 몰면 백은 S3으로 뻗을 수밖에 없고, 다시 S2로 몰면 T3, T2… 결국 귀에서 잡힙니다. S3 쪽에서 몰면 백이 R2로 뻗어 활로 3개를 얻어 달아납니다.',
        hints: [
          '백 R3의 활로는 두 곳입니다. 어느 쪽을 막아야 백이 뻗은 뒤에도 활로가 2개에 머무를까요?',
          '백이 넓은 쪽으로 달아나지 못하게 막아야 합니다.',
        ],
      }),

      variant({
        id: 'L32-b2',
        title: '반대쪽에서 몰면',
        prompt: '이번에는 백이 왼쪽 아래에 있습니다. 축으로 잡으세요.',
        setup: { black: ['D3', 'C4', 'B4'], white: ['C3'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['C3'], immediate: true },
        moveGoal: { type: 'atari', targets: ['C3'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'C3' },
        maxMoves: 8,
        explanation: '좌우가 뒤집혀도 원리는 같습니다. 백이 넓은 쪽으로 뻗지 못하게 모는 방향을 고르면 됩니다.',
        hints: ['백의 활로 두 곳 중 어느 쪽을 막아야 백이 좁은 쪽으로 밀리는지 생각해 보세요.'],
      }),

      quiz({
        title: '개념 확인',
        question: '축으로 몰린 돌이 계속 달아나면 어떻게 될까요?',
        options: [
          '언젠가 활로가 늘어 살아난다',
          '잡히는 돌만 늘어나고 결국 가장자리에서 통째로 잡힌다',
          '무승부가 된다',
        ],
        answer: 1,
        explain: '축에 걸린 돌은 뻗을 때마다 잡힐 돌이 하나씩 늘어납니다. 한 점 잡히는 것으로 끝날 일을 열 점 잡히는 일로 키우는 셈입니다. **살릴 수 없는 돌은 일찍 버리는 것**이 정답입니다(LEVEL 6·46).',
      }),

      boss({
        id: 'L32-boss',
        title: 'BOSS — 축으로 잡아라',
        prompt: '백 한 점을 축으로 잡으세요. 힌트는 없습니다.',
        setup: { black: ['D17', 'C16', 'B16'], white: ['C17'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['C17'], immediate: true },
        moveGoal: { type: 'atari', targets: ['C17'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'C17' },
        maxMoves: 8,
        explanation: '왼쪽 위 귀에서도 같습니다. C18로 몰기 시작하면 백은 왼쪽 위 귀로 밀려가 잡힙니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 33 ============================ */
  level({
    id: 33, chapter: 4,
    title: '축으로 잡기',
    subtitle: '끝까지 읽어야 잡는다',
    steps: [
      concept({
        title: '더 긴 축',
        body: [
          '축은 짧으면 두세 수, 길면 스무 수 넘게 이어집니다.',
          '중요한 것은 **두기 전에 끝까지 읽는 것**입니다. 축이 성립하는지 확인하지 않고 몰기 시작하면, 도중에 상대가 달아나 버려 내 돌만 흩어집니다.',
          '이 LEVEL에서는 조금 더 긴 축을 직접 끝까지 몰아 봅니다. 매 수마다 백이 단수인지 확인하세요.',
        ],
        demo: {
          setup: { black: ['P4', 'Q5', 'R5'], white: ['Q4'] },
          moves: [
            { at: 'Q3', color: BLACK, note: '아래에서 몰기 시작한다' },
            { at: 'R4', color: WHITE, note: '' },
            { at: 'S4', color: BLACK, note: '오른쪽 아래 귀를 향해 몰려 간다' },
          ],
        },
      }),

      basic({
        id: 'L33-b1',
        title: '긴 축',
        prompt: '백 Q4를 축으로 잡으세요. 여섯 수쯤 걸립니다.',
        setup: { black: ['P4', 'Q5', 'R5'], white: ['Q4'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['Q4'], immediate: true },
        moveGoal: { type: 'atari', targets: ['Q4'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'Q4' },
        maxMoves: 12,
        explanation: 'Q3부터 몰면 백은 오른쪽 아래 귀로 계속 밀려가 결국 잡힙니다. 매 수 단수를 유지하는 방향으로만 몰아야 합니다.',
        hints: ['백이 뻗은 뒤 활로가 2개에 머무르는 쪽으로 몰아야 합니다.', '귀를 향해 몰아가는 것이 축의 방향입니다.'],
      }),

      variant({
        id: 'L33-b2',
        title: '위쪽으로 향하는 축',
        prompt: '이번 축은 위쪽 귀로 향합니다. 백을 잡으세요.',
        setup: { black: ['P16', 'Q15', 'R15'], white: ['Q16'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['Q16'], immediate: true },
        moveGoal: { type: 'atari', targets: ['Q16'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'Q16' },
        maxMoves: 12,
        explanation: '방향만 바뀌었을 뿐 원리는 같습니다. 축은 늘 반상 가장자리를 향해 진행합니다.',
        hints: ['백이 좁은 쪽으로 밀리도록 모는 방향을 고르세요.'],
      }),

      practice({
        id: 'L33-b3',
        title: '두 곳 중 축이 되는 쪽',
        prompt: '백돌이 두 곳에 있습니다. **축으로 잡을 수 있는 쪽**을 잡으세요.',
        setup: {
          black: ['Q3', 'R4', 'S4', 'D16'],
          white: ['R3', 'C16'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['R3'], immediate: true },
        moveGoal: { type: 'atari', targets: ['R3'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'R3' },
        maxMoves: 8,
        explanation: '왼쪽 위 백 C16은 흑 D16 하나뿐이라 활로가 3개여서 축이 성립하지 않습니다. 오른쪽 아래 백 R3만 축으로 잡힙니다. **활로가 2개인지부터 확인하는 것**이 순서입니다.',
        hints: ['축은 활로가 2개인 돌에만 성립합니다. 두 백돌의 활로를 각각 세어 보세요.'],
      }),

      boss({
        id: 'L33-boss',
        title: 'BOSS — 끝까지 몰아라',
        prompt: '백을 축으로 잡으세요. 힌트는 없습니다.',
        setup: { black: ['D4', 'C5', 'B5'], white: ['C4'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['C4'], immediate: true },
        moveGoal: { type: 'atari', targets: ['C4'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'C4' },
        maxMoves: 10,
        explanation: '왼쪽 아래 귀를 향해 몰아 갑니다. 매 수 단수를 유지하세요.',
      }),
    ],
  }),

  /* ============================ LEVEL 34 ============================ */
  level({
    id: 34, chapter: 4,
    title: '축머리와 축의 유불리',
    subtitle: '축은 판 전체를 보고 시작한다',
    formula: formula({
      name: '축머리',
      kind: KIND.TESUJI,
      statement: '축의 진행로에 놓인 상대 돌. 단 한 점이라도 있으면 축은 무산된다.',
      why: '축은 매 수 상대를 단수로 몰아야 성립한다. 진행로에 상대 돌이 있으면 몰린 돌이 그 돌과 이어져 활로가 3개 이상으로 늘어난다. 그 순간 축은 끝난다.',
      when: '축을 시작하기 전에 **진행로를 끝까지 따라가 보고** 상대 돌이 있는지 확인해야 한다. 축은 반상 끝까지 이어지므로 진행로가 판의 절반을 지나갈 수도 있다.',
      exception: '축머리가 있어도 **그 돌이 이미 잡혀 있거나 쓸모없는 돌이라면** 축이 성립할 수 있다. 반대로 상대가 축머리 자리에 두는 것 자체를 노려(축머리 활용) 다른 이득을 챙기는 고급 전술도 있다. 축은 국지 문제가 아니라 판 전체의 문제다.',
      related: ['축', '장문', '수읽기'],
    }),
    steps: [
      concept({
        title: '축머리 — 한 점이 축을 무산시킨다',
        body: [
          '축의 **진행로에 상대 돌이 하나만 있어도** 축은 무산됩니다. 그 돌을 축머리라고 합니다.',
          '몰린 돌이 축머리와 이어지면 활로가 3개 이상으로 늘어나 더는 단수로 몰 수 없습니다.',
          '그래서 축은 **국지 문제가 아니라 판 전체의 문제**입니다. 축은 반상 끝까지 이어지므로 진행로가 판의 절반을 지나갈 수도 있습니다.',
          '**축을 시작하기 전에 진행로를 끝까지 따라가 보세요.** 이것이 수읽기의 첫 훈련입니다.',
        ],
        demo: {
          setup: { black: ['P4', 'Q5', 'R5'], white: ['Q4', 'R3'] },
          moves: [{ at: 'Q3', color: BLACK, note: '몰아 보아도 백 R3이 기다리고 있어 축이 되지 않는다' }],
        },
      }),

      quiz({
        title: '축머리 확인',
        question: '축의 진행로에 상대 돌이 한 점 있으면 어떻게 될까요?',
        options: [
          '축은 그대로 성립한다',
          '몰린 돌이 그 돌과 이어져 활로가 늘어나 축이 무산된다',
          '한 점뿐이면 상관없다',
        ],
        answer: 1,
        explain: '축은 매 수 단수를 유지해야 성립합니다. 진행로의 돌과 이어지는 순간 활로가 3개 이상이 되어 더는 몰 수 없습니다. 그래서 축을 시작하기 전에 **끝까지 읽어야** 합니다.',
      }),

      basic({
        id: 'L34-b1',
        title: '축이 되는 쪽만 몰아라',
        prompt: '백돌이 두 곳에 있습니다. 한쪽은 진행로에 백 축머리가 있어 축이 되지 않습니다. **축이 성립하는 쪽**을 잡으세요.',
        setup: {
          black: ['Q3', 'R4', 'S4', 'D3', 'C4', 'B4'],
          white: ['R3', 'C3', 'B2'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['R3'], immediate: true },
        moveGoal: { type: 'atari', targets: ['R3'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'R3' },
        maxMoves: 8,
        explanation: '왼쪽 아래 백 C3은 축 진행로에 백 B2가 있어 몰아도 이어져 버립니다. 오른쪽 아래 백 R3만 축으로 잡힙니다.',
        hints: ['두 곳의 축 진행로를 각각 따라가 보고, 도중에 백돌을 만나는 쪽을 빼세요.'],
      }),

      practice({
        id: 'L34-b2',
        title: '축머리가 있으면 몰지 않는다',
        prompt: '이 백돌은 축머리(백 R3) 때문에 축으로 잡히지 않습니다. 대신 **백 C3을 축으로** 잡으세요.',
        setup: {
          black: ['P4', 'Q5', 'R5', 'D3', 'C4', 'B4'],
          white: ['Q4', 'R3', 'C3'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['C3'], immediate: true },
        moveGoal: { type: 'atari', targets: ['C3'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'C3' },
        maxMoves: 10,
        explanation: '오른쪽 백 Q4를 몰면 백 R3과 이어져 축이 무산됩니다. 왼쪽 아래 백 C3은 진행로가 깨끗하므로 축으로 잡힙니다. **몰기 전에 확인하는 습관**이 실력입니다.',
        hints: ['오른쪽 축의 진행로에 무엇이 있는지 먼저 보세요.'],
      }),

      boss({
        id: 'L34-boss',
        title: 'BOSS — 진행로를 확인하라',
        prompt: '축으로 잡을 수 있는 백돌을 잡으세요. 힌트는 없습니다.',
        setup: {
          black: ['D17', 'C16', 'B16', 'Q3', 'R4', 'S4'],
          white: ['C17', 'B18', 'R3'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['R3'], immediate: true },
        moveGoal: { type: 'atari', targets: ['R3'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'R3' },
        maxMoves: 8,
        explanation: '왼쪽 위 백 C17은 진행로에 백 B18이 있어 축이 무산됩니다. 오른쪽 아래 백 R3만 축으로 잡힙니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 35 ============================ */
  level({
    id: 35, chapter: 4,
    title: '장문',
    subtitle: '축이 안 될 때 그물을 씌운다',
    formula: formula({
      name: '장문',
      kind: KIND.TESUJI,
      statement: '상대 돌에 붙지 않고 한 칸 떨어진 자리에서 그물처럼 씌워 잡는 수.',
      why: '축은 매 수 단수로 몰아야 하므로 진행로에 상대 돌이 있으면 무산된다. 장문은 단수로 몰지 않고 **달아날 길 자체를 미리 막는다.** 그래서 축머리에 영향을 받지 않는다.',
      when: '상대 돌의 활로가 2~3개이고 도망갈 방향이 좁을 때. 특히 축이 무산되어 다른 수단이 필요할 때.',
      exception: '장문은 **활로가 넉넉한 돌에는 통하지 않는다.** 그물을 씌워도 상대가 여러 방향으로 나갈 수 있으면 오히려 내 돌이 얇아진다. 또 장문으로 잡은 모양은 축보다 느슨해서 나중에 상대가 활용할 여지가 남기도 한다.',
      related: ['축', '축머리', '모자'],
    }),
    steps: [
      concept({
        title: '장문 — 붙지 않고 씌운다',
        body: [
          '축이 무산되었을 때 쓰는 또 하나의 포획 기술이 장문입니다.',
          '축은 매 수 단수로 몰지만, 장문은 **한 칸 떨어진 곳에 그물을 씌워 달아날 길을 미리 막습니다.**',
          '단수로 몰지 않으므로 **축머리에 영향을 받지 않습니다.** 축이 안 되는 곳에서 장문이 통하는 이유입니다.',
          '다만 활로가 넉넉한 돌에는 통하지 않습니다. 씌운 뒤 정말 달아날 길이 없는지 끝까지 읽어야 합니다.',
        ],
        demo: {
          setup: { black: ['D5', 'D4', 'D3', 'F3'], white: ['E4'] },
          moves: [{ at: 'F5', color: BLACK, note: '붙이지 않고 한 칸 떨어져 씌운다 — 장문' }],
        },
      }),

      basic({
        id: 'L35-b1',
        title: '그물을 씌워라',
        prompt: '백 E4를 잡으세요. 붙여서 모는 수로는 잡히지 않습니다.',
        setup: { black: ['D5', 'D4', 'D3', 'F3'], white: ['E4'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['E4'], depth: 8, maxNodes: 40000 },
        comments: {
          E5: '붙여서 막는 수입니다. 백이 F4로 뻗으면 활로가 늘어 달아납니다.',
          F4: '붙여서 막는 수입니다. 백이 E3으로 뻗으면 달아납니다.',
          E3: '붙여서 막는 수입니다. 백이 F4로 뻗으면 달아납니다.',
        },
        successMessage: '장문! 백은 어디로도 나갈 수 없습니다.',
        explanation: 'F5가 장문입니다. 백 E4에 붙지 않고 한 칸 떨어져 씌우면, 백이 E3·F4·E5 어디로 뻗어도 결국 활로가 늘지 않아 잡힙니다. 붙여서 막으면 오히려 백이 반대쪽으로 달아납니다.',
        hints: [
          '백에 붙이지 마세요. 백이 달아날 방향을 미리 막는 자리를 찾으세요.',
          '백돌에서 대각선으로 한 칸 떨어진 자리를 살펴보세요.',
        ],
      }),

      variant({
        id: 'L35-b2',
        title: '반대 방향 장문',
        prompt: '배치가 뒤집혔습니다. 백 E4를 장문으로 잡으세요.',
        setup: { black: ['D5', 'E5', 'F5', 'F3'], white: ['E4'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['E4'], depth: 8, maxNodes: 40000 },
        explanation: 'D3이 장문 자리입니다. 위쪽 흑 벽과 오른쪽 아래 흑 F3이 있으므로, 왼쪽 아래를 막으면 백은 나갈 곳이 없습니다.',
        hints: ['백이 아직 나갈 수 있는 방향이 어디인지 보고, 그쪽을 미리 막으세요.'],
      }),

      practice({
        id: 'L35-b3',
        title: '축이 안 되면 장문',
        prompt: '이 백돌은 축으로는 잡히지 않습니다. **장문으로** 잡으세요.',
        setup: { black: ['D5', 'E5', 'F5', 'D3'], white: ['E4'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['E4'], depth: 8, maxNodes: 40000 },
        explanation: 'F3이 장문입니다. 백 E4는 활로가 3개나 되어 단수로 몰 수 없지만, 나갈 방향을 미리 막으면 잡힙니다. **축이 안 될 때 장문을 떠올리는 것**이 이 LEVEL의 핵심입니다.',
        hints: ['백의 활로가 3개이므로 단수로 몰 수는 없습니다. 달아날 길을 막는 쪽으로 생각하세요.'],
      }),

      quiz({
        title: '축과 장문의 차이',
        question: '축과 장문의 가장 큰 차이는 무엇일까요?',
        options: [
          '장문이 언제나 더 강하다',
          '축은 매 수 단수로 몰지만 장문은 달아날 길을 미리 막는다 — 그래서 장문은 축머리에 영향을 받지 않는다',
          '축은 초반에, 장문은 후반에 쓴다',
        ],
        answer: 1,
        explain: '축은 단수의 연속이라 진행로에 상대 돌이 하나만 있어도 무산됩니다. 장문은 단수로 몰지 않으므로 그 영향을 받지 않습니다. 대신 활로가 넉넉한 돌에는 통하지 않습니다. **둘 다 조건이 맞아야 성립하는 기술**입니다.',
      }),

      boss({
        id: 'L35-boss',
        title: 'BOSS — 씌워서 잡아라',
        prompt: '백 한 점을 잡으세요. 붙이는 수로는 잡히지 않습니다. 힌트는 없습니다.',
        setup: { black: ['Q11', 'Q10', 'Q9', 'S9'], white: ['R10'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['R10'], depth: 8, maxNodes: 40000 },
        explanation: 'S11 또는 R11이 장문입니다. 왼쪽 흑 벽과 아래 흑 S9가 있으므로 오른쪽 위를 씌우면 백은 나갈 곳이 없습니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 36 ============================ */
  level({
    id: 36, chapter: 4,
    title: '촉촉수',
    subtitle: '연속 단수로 몰아 잡는다',
    formula: formula({
      name: '촉촉수(연단수)',
      kind: KIND.TESUJI,
      statement: '상대를 단수로 몰면 상대가 잇는데, 이은 돌이 또 단수가 되는 것이 반복되어 결국 통째로 잡히는 수법.',
      why: '상대가 잇는 수가 오히려 자기 활로를 메우기 때문이다. 좁은 곳에서는 이을수록 돌만 늘고 활로는 그대로여서, 잇는 것이 곧 자충이 된다.',
      when: '상대 돌이 가장자리나 내 돌 사이의 좁은 공간에 있어, 이어 나가도 새 활로가 거의 생기지 않을 때.',
      exception: '**연속 단수가 늘 통하는 것은 아니다.** 상대가 이어 나가다 넓은 곳으로 빠져나가거나 내 돌을 되잡으면 거기서 끝난다. 몰기 전에 마지막까지 단수가 이어지는지 읽어야 한다. 또 잡히는 돌이 작다면 상대가 그냥 버리고 다른 큰 곳을 둘 수도 있다.',
      related: ['축(蓄)', '단수(斷手)', '자충(自充)과 자살수'],
    }),
    steps: [
      concept({
        title: '이을수록 죽는다',
        body: [
          '단수를 치면 상대는 잇습니다. 그런데 **이은 돌이 또 단수**가 되는 모양이 있습니다.',
          '이것이 반복되면 상대는 이을수록 잡히는 돌만 늘어납니다. 이런 수법을 촉촉수(연단수)라고 합니다.',
          '가장자리처럼 좁은 곳에서 자주 나옵니다. 이어도 새 활로가 생기지 않기 때문입니다.',
          '축과 원리가 같습니다. 다만 축은 대각선으로 몰아가고, 촉촉수는 좁은 공간을 따라 몰아갑니다.',
        ],
        demo: {
          setup: { black: EDGE_WALL, white: ['A1', 'C1', 'A2'] },
          moves: [
            { at: 'B2', color: BLACK, note: '단수' },
            { at: 'B1', color: WHITE, note: '백이 이었지만…' },
            { at: 'C2', color: BLACK, note: '또 단수 — 이것이 촉촉수다' },
          ],
        },
      }),

      basic({
        id: 'L36-b1',
        title: '연속 단수',
        prompt: '백 두 점을 잡으세요. 백이 이을 때마다 **다시 단수**로 몰면 됩니다.',
        setup: { black: EDGE_WALL, white: ['A1', 'C1', 'A2'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A1'], immediate: true },
        moveGoal: { type: 'atari', targets: ['A1'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['A1'], depth: 8 },
        maxMoves: 10,
        explanation: 'B2로 단수를 치면 백은 B1로 이을 수밖에 없고, 다시 C2로 몰면 D1, 또 D2로 몰면 E1… 가장자리를 따라 끝까지 몰려 결국 잡힙니다. 이을수록 손해가 커지는 것이 촉촉수입니다.',
        hints: ['백 두 점의 활로를 세고, 그중 한 곳을 메워 단수로 만드세요.', '백이 이으면 새로 생긴 무리의 활로를 다시 세어 보세요.'],
      }),

      variant({
        id: 'L36-b2',
        title: '위쪽 가장자리에서',
        prompt: '방향이 바뀌었습니다. 백을 연속 단수로 몰아 잡으세요.',
        setup: {
          black: ['A17', 'B17', 'C17', 'D17', 'E17', 'F17', 'F19', 'F18'],
          white: ['A19', 'C19', 'A18'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A19'], immediate: true },
        moveGoal: { type: 'atari', targets: ['A19'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['A19'], depth: 8 },
        maxMoves: 10,
        explanation: '위아래가 뒤집혔을 뿐 원리는 같습니다. 단수 → 상대가 이음 → 다시 단수를 반복합니다.',
        hints: ['백 두 점의 활로 중 한 곳을 메워 보세요.'],
      }),

      practice({
        id: 'L36-b3',
        title: '오른쪽 아래에서',
        prompt: '백을 연속 단수로 몰아 잡으세요.',
        setup: {
          black: ['T3', 'S3', 'R3', 'Q3', 'P3', 'O3', 'O1', 'O2'],
          white: ['T1', 'R1', 'T2'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['T1'], immediate: true },
        moveGoal: { type: 'atari', targets: ['T1'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['T1'], depth: 8 },
        maxMoves: 10,
        explanation: '가장자리를 따라 왼쪽으로 몰아갑니다. 백이 이을 때마다 활로가 하나뿐인 상태가 이어집니다.',
        hints: ['백 두 점의 활로를 먼저 세어 보세요.'],
      }),

      quiz({
        title: '원칙의 한계',
        question: '단수를 계속 치면 언제나 촉촉수가 될까요?',
        options: [
          '그렇다 — 단수를 반복하면 결국 잡힌다',
          '아니다 — 상대가 이어 나가다 넓은 곳으로 빠지거나 내 돌을 되잡으면 거기서 끝난다',
          '가장자리에서만 안 된다',
        ],
        answer: 1,
        explain: '몰기 전에 **마지막까지 단수가 이어지는지** 읽어야 합니다. 도중에 끊기면 상대만 튼튼해지고 내 돌은 흩어집니다. 축과 똑같은 주의사항입니다.',
      }),

      boss({
        id: 'L36-boss',
        title: 'BOSS — 세로로 몰아라',
        prompt: '백을 연속 단수로 몰아 잡으세요. 힌트는 없습니다.',
        setup: {
          black: ['C19', 'C18', 'C17', 'C16', 'C15', 'C14', 'A14', 'B14'],
          white: ['A19', 'A17', 'B19'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A19'], immediate: true },
        moveGoal: { type: 'atari', targets: ['A19'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['A19'], depth: 8 },
        maxMoves: 10,
        explanation: '이번에는 세로 방향입니다. 방향이 어떻든 "이으면 또 단수"가 이어지는지만 확인하면 됩니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 37 ============================ */
  level({
    id: 37, chapter: 4,
    title: '환격',
    subtitle: '한 점을 주고 여러 점을 되잡는다',
    formula: formula({
      name: '환격(還擊)',
      kind: KIND.TESUJI,
      statement: '내 돌 한 점을 일부러 잡히게 던져 넣은 뒤, 상대가 따내면 그 자리를 다시 두어 상대 돌 전체를 되잡는 수법.',
      why: '상대가 내 돌을 따내는 순간 **상대 돌들이 자기 공간을 스스로 메우게** 되기 때문이다. 따낸 뒤에도 상대의 활로는 하나뿐이라, 나는 방금 잡힌 그 자리에 다시 두어 전부 되잡는다.',
      when: '상대가 감싼 빈 공간이 두 점뿐이고, 그 두 점이 서로 붙어 있을 때. 한 점을 던지면 상대는 따낼 수밖에 없고, 따내는 순간 무너진다.',
      exception: '**공간이 세 점 이상이면 환격이 되지 않는다.** 상대가 따낸 뒤에도 활로가 남아 있기 때문이다. 또 던진 돌을 상대가 따내지 않고 그냥 이어 버리면 다른 수단을 찾아야 한다 — 던지기 전에 상대의 선택지를 모두 읽어야 한다.',
      related: ['먹여치기', '자충(自充)과 자살수', '촉촉수(연단수)'],
    }),
    steps: [
      concept({
        title: '한 점을 주고 여섯 점을 잡는다',
        body: [
          '백이 감싼 빈 공간이 **딱 두 점**이면, 흑은 그 안에 한 점을 던져 넣습니다.',
          '던진 돌은 활로가 하나뿐이라 곧 잡힙니다. 그런데 백이 그 돌을 따내는 순간, 백은 **자기 공간을 스스로 메운** 셈이 됩니다.',
          '따낸 뒤 백의 활로는 하나뿐입니다. 흑은 방금 잡힌 그 자리에 다시 두어 백 전체를 되잡습니다.',
          '한 점을 주고 여러 점을 되잡는다 — 이것이 환격입니다.',
        ],
        demo: {
          setup: {
            black: ['A3', 'B3', 'C3', 'D3', 'E1', 'E2', 'E3'],
            white: ['A1', 'A2', 'B2', 'C2', 'D2', 'D1'],
          },
          moves: [
            { at: 'B1', color: BLACK, note: '두 점짜리 공간에 던져 넣는다' },
            { at: 'C1', color: WHITE, note: '백이 따냈지만 이제 백의 활로는 하나뿐' },
            { at: 'B1', color: BLACK, note: '같은 자리에 다시 — 백 여섯 점을 되잡는다' },
          ],
        },
      }),

      basic({
        id: 'L37-b1',
        title: '던지고 되잡기',
        prompt: '백 여섯 점을 잡으세요. 백이 감싼 공간은 두 점뿐입니다.',
        setup: {
          black: ['A3', 'B3', 'C3', 'D3', 'E1', 'E2', 'E3'],
          white: ['A1', 'A2', 'B2', 'C2', 'D2', 'D1'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A1'], immediate: true },
        moveGoal: { type: 'atari', targets: ['A1'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['A1'], depth: 8 },
        maxMoves: 8,
        successMessage: '환격! 한 점을 주고 여섯 점을 잡았습니다.',
        explanation: 'B1(또는 C1)에 던져 넣으면 백은 그 돌을 따낼 수밖에 없고, 따내는 순간 백의 활로가 하나뿐이 되어 같은 자리에 다시 두면 여섯 점이 통째로 들려 나갑니다.',
        hints: ['백이 감싼 빈 점 두 곳 중 한 곳에 두어 보세요.', '내 돌이 잡히는 것을 두려워하지 마세요. 잡힌 뒤가 중요합니다.'],
      }),

      variant({
        id: 'L37-b2',
        title: '오른쪽 아래에서',
        prompt: '같은 모양이 오른쪽 아래에 있습니다. 백을 잡으세요.',
        setup: {
          black: ['T3', 'S3', 'R3', 'Q3', 'P1', 'P2', 'P3'],
          white: ['T1', 'T2', 'S2', 'R2', 'Q2', 'Q1'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['T1'], immediate: true },
        moveGoal: { type: 'atari', targets: ['T1'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['T1'], depth: 8 },
        maxMoves: 8,
        explanation: '위치만 바뀌었을 뿐 같은 환격입니다. 두 점짜리 공간에 던져 넣으세요.',
        hints: ['백 안쪽의 빈 점이 몇 곳인지 세어 보세요.'],
      }),

      practice({
        id: 'L37-b3',
        title: '위쪽에서',
        prompt: '백을 잡으세요.',
        setup: {
          black: ['A17', 'B17', 'C17', 'D17', 'E19', 'E18', 'E17'],
          white: ['A19', 'A18', 'B18', 'C18', 'D18', 'D19'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A19'], immediate: true },
        moveGoal: { type: 'atari', targets: ['A19'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['A19'], depth: 8 },
        maxMoves: 8,
        explanation: '두 점짜리 공간에 던져 넣는 것이 전부입니다. 백은 따내도 죽고 안 따내도 죽습니다.',
      }),

      quiz({
        title: '원칙의 한계',
        question: '백이 감싼 공간이 **세 점**이라면 환격이 될까요?',
        options: [
          '된다 — 던져 넣으면 언제나 통한다',
          '안 된다 — 따낸 뒤에도 백에게 활로가 남아 무너지지 않는다',
          '흑이 먼저 두면 된다',
        ],
        answer: 1,
        explain: '환격은 **공간이 딱 두 점**일 때 성립합니다. 세 점이면 백이 따낸 뒤에도 여유가 남습니다. 세 점짜리 공간은 다른 방법(급소에 두는 치중, LEVEL 43)이 필요합니다.',
      }),

      boss({
        id: 'L37-boss',
        title: 'BOSS — 환격',
        prompt: '백을 잡으세요. 힌트는 없습니다.',
        setup: {
          black: ['T17', 'S17', 'R17', 'Q17', 'P19', 'P18', 'P17'],
          white: ['T19', 'T18', 'S18', 'R18', 'Q18', 'Q19'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['T19'], immediate: true },
        moveGoal: { type: 'atari', targets: ['T19'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['T19'], depth: 8 },
        maxMoves: 8,
        explanation: '오른쪽 위에서도 같습니다. 두 점짜리 공간에 던져 넣으세요.',
      }),
    ],
  }),

  /* ============================ LEVEL 38 ============================ */
  level({
    id: 38, chapter: 4,
    title: '먹여치기',
    subtitle: '활로를 줄이려고 던져 넣는다',
    formula: formula({
      name: '먹여치기',
      kind: KIND.TESUJI,
      statement: '상대에게 잡힐 것을 알면서도 돌을 던져 넣어, 상대의 활로나 궁도를 줄이는 수.',
      why: '상대가 그 돌을 따내려면 자기 돌로 그 자리를 메워야 한다. 결국 상대는 스스로 자기 활로를 하나 줄이게 된다. 한 점을 주고 상대의 숨통을 조이는 거래다.',
      when: '상대 돌의 활로를 한 수로 줄여야 하는데 바깥에서는 더 줄일 수 없을 때. 수상전이나 사활에서 결정적인 한 수가 되는 일이 많다.',
      exception: '**아무 데나 던지면 그냥 한 점 손해다.** 던진 뒤 상대의 활로가 실제로 줄어드는지, 그래서 내가 이기는지 끝까지 계산해야 한다. 상대가 따내지 않고 무시해도 이득이 남는지도 확인해야 한다.',
      related: ['환격(還擊)', '자충(自充)과 자살수', '촉촉수(연단수)'],
    }),
    steps: [
      concept({
        title: '잡히려고 두는 수',
        body: [
          '바깥에서 아무리 둘러싸도 활로가 줄지 않을 때가 있습니다. 이럴 때 **상대 안쪽에 한 점을 던져 넣습니다.**',
          '그 돌은 잡힙니다. 하지만 상대가 그 돌을 따내려면 **자기 돌로 그 자리를 메워야** 하고, 그러면 상대의 활로가 오히려 하나 줄어듭니다.',
          '한 점을 주고 상대의 숨통을 조이는 거래입니다. 환격도 먹여치기의 한 종류입니다.',
          '단, 아무 데나 던지면 그냥 한 점 손해입니다. **던진 뒤를 끝까지 계산**해야 합니다.',
        ],
        demo: {
          setup: { black: [...EDGE_WALL, 'C1'], white: ['D1', 'E1', 'A2', 'B2', 'C2'] },
          moves: [
            { at: 'B1', color: BLACK, note: '활로 3개짜리 백에게 던져 넣는다' },
            { at: 'A1', color: WHITE, note: '백이 따냈지만 스스로 활로를 메운 꼴' },
          ],
        },
      }),

      basic({
        id: 'L38-b1',
        title: '던져 넣어 조이기',
        prompt: '백 세 점의 활로는 아직 3개입니다. **던져 넣어** 활로를 줄이고 결국 잡으세요.',
        setup: { black: [...EDGE_WALL, 'C1'], white: ['D1', 'E1', 'A2', 'B2', 'C2'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A2'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A2'] },
        progressGoal: { type: 'capturable', targets: ['A2'], depth: 8 },
        maxMoves: 10,
        explanation: 'B1에 던져 넣는 것이 시작입니다. 백이 A1으로 따내도 그 자리가 백돌로 메워져 활로가 줄어듭니다. 바깥에서만 두어서는 백을 잡을 수 없습니다.',
        hints: ['백 세 점의 활로 세 곳을 먼저 찾아보세요.', '바깥에서 줄일 수 없다면 안쪽을 보세요. 잡힐 각오로 던지는 것입니다.'],
      }),

      variant({
        id: 'L38-b2',
        title: '백 다섯 점',
        prompt: '이번에는 백이 다섯 점입니다. 던져 넣어 잡으세요.',
        setup: { black: [...EDGE_WALL, 'A1', 'E1'], white: ['D1', 'A2', 'B2', 'C2', 'D2'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A2'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A2'] },
        progressGoal: { type: 'capturable', targets: ['A2'], depth: 8 },
        maxMoves: 10,
        explanation: '돌 수가 늘어도 원리는 같습니다. 안쪽 빈 점에 던져 백이 스스로 메우게 만듭니다.',
        hints: ['백 무리 전체의 활로를 세어 보세요.'],
      }),

      practice({
        id: 'L38-b3',
        title: '백 여섯 점',
        prompt: '백 여섯 점을 잡으세요.',
        setup: { black: [...EDGE_WALL, 'C1'], white: ['D1', 'E1', 'A2', 'B2', 'C2', 'D2'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A2'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A2'] },
        progressGoal: { type: 'capturable', targets: ['A2'], depth: 8 },
        maxMoves: 10,
        explanation: '큰 무리일수록 던져 넣기의 효과가 큽니다. 한 점을 주고 여섯 점을 잡습니다.',
      }),

      boss({
        id: 'L38-boss',
        title: 'BOSS — 먹여치기',
        prompt: '백을 잡으세요. 힌트는 없습니다.',
        setup: { black: [...EDGE_WALL, 'A1', 'E2'], white: ['D1', 'E1', 'A2', 'B2', 'C2'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A2'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A2'] },
        progressGoal: { type: 'capturable', targets: ['A2'], depth: 8 },
        maxMoves: 10,
        explanation: '백의 활로를 하나씩 줄여 가되, 바깥에서 줄일 수 없는 곳은 안쪽에 던져 넣어 해결합니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 39 ============================ */
  level({
    id: 39, chapter: 4,
    title: '자충 유도',
    subtitle: '상대가 스스로 활로를 메우게 만든다',
    formula: formula({
      name: '자충 유도',
      kind: KIND.TESUJI,
      statement: '상대가 응수할 수밖에 없게 만들되, 그 응수가 곧 자기 활로를 메우는 꼴이 되도록 유도하는 기술.',
      why: 'LEVEL 36~38에서 배운 촉촉수·환격·먹여치기는 이름만 다를 뿐 **모두 같은 원리**다. 상대가 이으면 활로가 줄고(촉촉수), 따내면 자기 공간을 메우고(환격), 던진 돌을 처리하려면 자기 돌로 메워야 한다(먹여치기).',
      when: '상대 돌이 좁은 곳에 있어 응수할 자리가 제한될 때. 특히 가장자리와 귀에서 자주 성립한다.',
      exception: '상대에게 **손을 뺄 여유가 있으면** 성립하지 않는다. 상대가 그 돌을 버리고 더 큰 곳을 두면 나만 수를 낭비한 셈이다. 자충을 노리기 전에 "상대가 정말 받아야 하는가"를 먼저 확인해야 한다.',
      related: ['촉촉수(연단수)', '환격(還擊)', '먹여치기'],
    }),
    steps: [
      concept({
        title: '세 가지 기술, 하나의 원리',
        body: [
          'LEVEL 36부터 38까지 배운 세 가지는 이름만 다를 뿐 **원리가 같습니다.**',
          '**촉촉수** — 상대가 이으면 활로가 줄어든다.',
          '**환격** — 상대가 따내면 자기 공간을 메우게 된다.',
          '**먹여치기** — 던진 돌을 처리하려면 자기 돌로 그 자리를 메워야 한다.',
          '셋 다 **상대가 스스로 자기 숨통을 조이게 만드는 것**입니다. 이것을 자충 유도라고 합니다.',
          '그래서 좁은 곳에서 상대 돌을 만나면 먼저 이렇게 물어보세요. **"상대가 응수하면 활로가 늘어날까, 줄어들까?"**',
        ],
      }),

      basic({
        id: 'L39-b1',
        title: '응수하면 줄어든다',
        prompt: '백을 잡으세요. 백이 어떻게 응수해도 활로가 늘지 않습니다.',
        setup: {
          black: ['A17', 'B17', 'C17', 'D17', 'E17', 'F17', 'F19', 'F18', 'C19'],
          white: ['D19', 'E19', 'A18', 'B18', 'C18'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A18'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A18'] },
        progressGoal: { type: 'capturable', targets: ['A18'], depth: 8 },
        maxMoves: 10,
        explanation: 'B19에 던져 넣습니다. 백이 따내면 그 자리가 백돌로 메워지고, 안 따내면 그대로 활로가 줄어듭니다. 어느 쪽이든 백은 손해입니다.',
        hints: ['백 무리의 활로를 세고, 바깥에서 줄일 수 없는 곳이 어디인지 보세요.'],
      }),

      variant({
        id: 'L39-b2',
        title: '백 다섯 점',
        prompt: '백 다섯 점이 스스로 무너지게 만드세요.',
        setup: {
          black: ['A17', 'B17', 'C17', 'D17', 'E17', 'F17', 'F19', 'F18', 'A19', 'E19'],
          white: ['D19', 'A18', 'B18', 'C18', 'D18'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A18'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A18'] },
        progressGoal: { type: 'capturable', targets: ['A18'], depth: 8 },
        maxMoves: 10,
        explanation: '안쪽 빈 점에 던져 넣어 백이 스스로 메우게 만듭니다.',
        hints: ['바깥에서 줄일 수 없다면 안쪽입니다.'],
      }),

      practice({
        id: 'L39-b3',
        title: '백 여섯 점',
        prompt: '백 여섯 점을 잡으세요.',
        setup: {
          black: ['A17', 'B17', 'C17', 'D17', 'E17', 'F17', 'F19', 'F18', 'C19'],
          white: ['D19', 'E19', 'A18', 'B18', 'C18', 'D18'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A18'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A18'] },
        progressGoal: { type: 'capturable', targets: ['A18'], depth: 8 },
        maxMoves: 10,
        explanation: '큰 무리도 자충 앞에서는 똑같이 무너집니다.',
      }),

      quiz({
        title: '원칙의 한계',
        question: '자충을 유도하는 수는 언제나 통할까요?',
        options: [
          '그렇다 — 상대는 반드시 받아야 한다',
          '아니다 — 상대가 그 돌을 버리고 더 큰 곳을 두면 나만 수를 낭비한 것이다',
          '가장자리에서만 통한다',
        ],
        answer: 1,
        explain: '자충 유도는 **상대가 받을 수밖에 없을 때**만 성립합니다. 상대에게 손을 뺄 여유가 있으면 내가 던진 돌만 손해입니다. 두기 전에 "상대가 정말 받아야 하는가"를 확인하세요.',
      }),

      boss({
        id: 'L39-boss',
        title: 'BOSS — 자충을 유도하라',
        prompt: '백을 잡으세요. 힌트는 없습니다.',
        setup: {
          black: ['A17', 'B17', 'C17', 'D17', 'E17', 'F17', 'F19', 'F18', 'A19', 'E18'],
          white: ['D19', 'E19', 'A18', 'B18', 'C18'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A18'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A18'] },
        progressGoal: { type: 'capturable', targets: ['A18'], depth: 8 },
        maxMoves: 10,
        explanation: '백의 활로를 하나씩 줄이되, 바깥에서 줄일 수 없는 곳은 안쪽에 던져 해결합니다.',
      }),
    ],
  }),

  /* ============================ LEVEL 40 ============================ */
  level({
    id: 40, chapter: 4,
    title: '포획 전술 종합시험',
    subtitle: 'CHAPTER 4 — 양단수·축·장문·촉촉수·환격·먹여치기',
    steps: [
      concept({
        title: '종합시험 안내',
        body: [
          'CHAPTER 4에서 배운 포획 전술을 모두 확인합니다. **★★ 이상**을 받아야 다음 챕터가 열립니다.',
          '이 챕터의 핵심은 두 가지입니다.',
          '**첫째, 두기 전에 끝까지 읽는다.** 축은 진행로를, 촉촉수는 마지막 단수까지, 먹여치기는 던진 뒤를 읽어야 합니다.',
          '**둘째, 잡는 방법은 하나가 아니다.** 축이 안 되면 장문, 바깥이 안 되면 안쪽에 던지기 — 조건에 맞는 수단을 고르는 것이 실력입니다.',
        ],
      }),

      basic({
        id: 'L40-1',
        title: '1 — 양단수',
        prompt: '백 두 무리를 동시에 단수로 만드세요.',
        setup: { black: ['C14', 'D15', 'E12', 'F13'], white: ['D14', 'E13'] },
        toPlay: BLACK,
        goal: { type: 'double-atari', count: 2 },
        explanation: '두 백돌의 활로가 겹치는 D13 또는 E14가 양단수 자리입니다.',
      }),

      variant({
        id: 'L40-2',
        title: '2 — 축',
        prompt: '백 한 점을 축으로 잡으세요.',
        setup: { black: ['Q17', 'R16', 'S16'], white: ['R17'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['R17'], immediate: true },
        moveGoal: { type: 'atari', targets: ['R17'], byFilling: true },
        progressGoal: { type: 'ladder', target: 'R17' },
        maxMoves: 8,
        explanation: '백이 넓은 쪽으로 달아나지 못하게 모는 방향을 고르면 오른쪽 위 귀에서 잡힙니다.',
      }),

      practice({
        id: 'L40-3',
        title: '3 — 장문',
        prompt: '백 한 점을 잡으세요. 붙여서 막는 수로는 잡히지 않습니다.',
        setup: { black: ['D15', 'D14', 'D13', 'F13'], white: ['E14'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['E14'], depth: 8, maxNodes: 40000 },
        explanation: 'F15로 씌우면 백은 어디로도 나갈 수 없습니다. 붙여서 막으면 반대쪽으로 달아납니다.',
      }),

      practice({
        id: 'L40-4',
        title: '4 — 환격',
        prompt: '백이 감싼 공간이 두 점뿐입니다. 백을 잡으세요.',
        setup: {
          black: ['C19', 'C18', 'C17', 'C16', 'A15', 'B15', 'C15'],
          white: ['A19', 'B19', 'B18', 'B17', 'B16', 'A16'],
        },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A19'], immediate: true },
        moveGoal: { type: 'atari', targets: ['A19'], byFilling: true },
        progressGoal: { type: 'capturable', targets: ['A19'], depth: 8 },
        maxMoves: 8,
        explanation: '두 점짜리 공간에 던져 넣으면 백은 따내도 죽고 안 따내도 죽습니다.',
      }),

      boss({
        id: 'L40-boss',
        title: 'BOSS — 먹여치기',
        prompt: '백을 잡으세요. 바깥에서만 두어서는 잡히지 않습니다. 힌트는 없습니다.',
        setup: { black: [...EDGE_WALL, 'C1'], white: ['D1', 'E1', 'A2', 'B2', 'C2'] },
        toPlay: BLACK,
        goal: { type: 'capture', targets: ['A2'], immediate: true },
        moveGoal: { type: 'reduce', targets: ['A2'] },
        progressGoal: { type: 'capturable', targets: ['A2'], depth: 8 },
        maxMoves: 10,
        explanation: '안쪽에 던져 넣어 백이 스스로 메우게 만듭니다. CHAPTER 4를 통과했습니다!',
      }),
    ],
  }),
];
