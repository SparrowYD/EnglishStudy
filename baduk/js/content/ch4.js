/**
 * CHAPTER 4 — 돌을 잡는 전술 공식 (LEVEL 31~35 구현, 36~40 준비 중)
 *
 * 이 챕터는 규칙 엔진의 수읽기가 그대로 채점기가 된다.
 * 축은 readLadder가 끝까지 읽고, 장문은 국지 포획 탐색이 판정한다.
 * 그래서 "정답 좌표"를 적어 두지 않고도 축이 성립하는지/무산되는지를 그때그때 계산한다.
 */

import {
  level, concept, follow, quiz, basic, variant, practice, boss, formula, KIND, BLACK, WHITE,
} from './authoring.js';

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
];
