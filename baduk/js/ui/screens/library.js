/** 공식 도감 · 용어사전 · 수읽기 훈련 · 내 대국 문제 · 오늘의 복습 (요구사항 69·70·71·72). */

import { el, setChildren, button, card, section, rich, toast, badge } from '../ui.js';
import { topbar, } from './menu.js';
import { formulaCard } from './stage.js';
import { BoardView } from '../boardview.js';
import { setup, fromLabel, toLabel, BLACK, EMPTY, COLOR_NAME } from '../../engine/board.js';
import { ProblemSession, VERDICT } from '../../game/problem.js';
import { codexEntries, entriesByCategory, findEntry, CATEGORIES } from '../../content/codex.js';
import { GLOSSARY, searchGlossary } from '../../content/glossary.js';
import { generateLadderProblem, verifySequence, LEVELS as READ_LEVELS } from '../../game/reading.js';
import { getLevel, LEVELS } from '../../content/curriculum.js';

/* ------------------------------------------------------------------ *
 * 공식 도감
 * ------------------------------------------------------------------ */

export function codexScreen(app) {
  const groups = entriesByCategory();
  return el('div', {}, topbar(app, '바둑 공식 도감'), el('div', { class: 'wrap wide' },
    el('div', { class: 'notice' }, rich(
      '바둑의 형태와 격언을 **절대 법칙으로 외우지 않도록** 각 항목에 "언제 유효한가"와 "언제 예외가 생기는가"를 함께 적었습니다.',
    )),
    ...groups.map((g) => section(g.label,
      el('div', { class: 'list-grid' },
        ...g.entries.map((e) => el('button', {
          class: `entry-tile ${e.ready ? '' : 'soon'}`.trim(),
          onclick: () => app.go(`/codex/${encodeURIComponent(e.name)}`),
        },
          el('div', { class: 'row between' },
            el('span', { class: 'nm', text: e.name }),
            badge(e.kind.label, e.kind.key),
          ),
          el('div', { class: 'faint', text: e.definition.slice(0, 46) + (e.definition.length > 46 ? '…' : '') }),
          e.ready ? el('div', { class: 'faint', text: `LEVEL ${e.level}` }) : badge('준비 중', 'soon'),
        )),
      ),
    )),
  ));
}

export function codexEntryScreen(app, params) {
  const name = decodeURIComponent(params[0]);
  const e = findEntry(name);
  if (!e) { app.go('/codex'); return el('div'); }

  const diagram = e.diagram ? diagramView(e.diagram) : null;

  return el('div', {}, topbar(app, e.name), el('div', { class: 'wrap' },
    card(
      el('div', { class: 'row' },
        el('h2', { text: e.name, style: { margin: 0 } }),
        badge(e.kind.label, e.kind.key),
        e.ready ? null : badge('준비 중', 'soon'),
      ),
      el('p', { class: 'faint', text: e.kind.hint }),
      el('h3', { text: '정의' }),
      el('p', {}, rich(e.definition)),
    ),

    diagram ? card(el('h3', { text: '기본 그림' }), diagram) : null,

    e.ready ? el('div', { class: 'card formula-card' },
      el('dl', {},
        el('dt', { text: '핵심 원리' }), el('dd', {}, rich(e.principle)),
        el('dt', { text: '언제 사용하는가' }), el('dd', {}, rich(e.when)),
        e.pros.length ? el('dt', { text: '장점' }) : null,
        e.pros.length ? el('dd', {}, el('ul', {}, ...e.pros.map((p) => el('li', {}, rich(p))))) : null,
        e.mistakes.length ? el('dt', { text: '흔한 실수 · 주의점' }) : null,
        e.mistakes.length ? el('dd', {}, el('ul', {}, ...e.mistakes.map((p) => el('li', {}, rich(p))))) : null,
        el('dt', { text: '예외' }), el('dd', {}, rich(e.exception)),
      ),
    ) : el('div', { class: 'notice' }, rich(
      `이 항목은 **LEVEL ${e.level}** 에서 자세히 다룰 예정입니다. 지금은 정의만 제공합니다.`,
    )),

    e.related && e.related.length ? card(
      el('h3', { text: '관련 항목' }),
      el('div', { class: 'row' }, ...e.related.map((r) => button(r, () => {
        if (findEntry(r)) app.go(`/codex/${encodeURIComponent(r)}`);
        else toast('아직 도감에 없는 항목입니다.');
      }, { class: 'btn-sm' }))),
    ) : null,

    e.problem ? card(
      el('h3', { text: '직접 풀어보기' }),
      el('p', { class: 'faint', text: `LEVEL ${e.level} · ${e.levelTitle}` }),
      el('div', { class: 'row' },
        button('이 문제 풀기', () => app.go('/myproblems', { singleProblem: e.problem, singleTitle: `${e.name} 연습` }), { variant: 'primary' }),
        button(`LEVEL ${e.level} 열기`, () => app.go(`/stage/${e.level}`)),
      ),
    ) : null,
  ));
}

function diagramView(diagram) {
  const size = 19;
  const board = setup({ size, ...(diagram.setup || {}) });
  for (const m of diagram.moves || []) {
    const i = fromLabel(m.at, size);
    if (i >= 0 && board.cells[i] === EMPTY && m.color) board.play(m.color, i);
  }
  const canvas = el('canvas', { class: 'board locked', style: { maxWidth: '360px' } });
  const view = new BoardView(canvas, { size, showCoordinates: false });
  view.setBoard(board).setView('auto').setInteractive(false);
  requestAnimationFrame(() => view.render());
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => view.render()).observe(canvas);
  return el('div', { class: 'board-wrap' }, canvas);
}

/* ------------------------------------------------------------------ *
 * 용어사전
 * ------------------------------------------------------------------ */

export function glossaryScreen(app) {
  const listBox = el('div', {});
  const render = (q) => {
    const items = searchGlossary(q);
    setChildren(listBox, 
      items.length === 0
        ? el('p', { class: 'muted', text: '검색 결과가 없습니다.' })
        : el('div', {}, ...items.map((g) => el('div', { class: 'term' },
            el('div', { class: 't', text: g.term }),
            el('div', { class: 'muted', text: g.desc }),
          ))),
    );
  };
  render('');
  return el('div', {}, topbar(app, '바둑 용어사전'), el('div', { class: 'wrap' },
    card(
      el('input', {
        type: 'text', placeholder: '용어 검색 (예: 활로, 축, 팻감)',
        style: { width: '100%' },
        oninput: (e) => render(e.target.value),
      }),
      el('p', { class: 'faint', text: `${GLOSSARY.length}개 용어` }),
    ),
    card(listBox),
  ));
}

/* ------------------------------------------------------------------ *
 * 수읽기 훈련
 * ------------------------------------------------------------------ */

export function readingScreen(app) {
  const host = el('div', { class: 'wrap wide' });
  const root = el('div', {}, topbar(app, '수읽기 훈련'), host);

  function chooser() {
    setChildren(host, 
      card(
        el('h2', { text: '난이도를 고르세요' }),
        el('p', {}, rich('돌을 바로 놓지 말고 **머릿속으로 수순을 끝까지 읽은 뒤** 순서대로 찍어 제출합니다.')),
        el('div', { class: 'row' },
          ...Object.values(READ_LEVELS).map((l) => button(
            `${l.label} (${l.moves[1] === 99 ? `${l.moves[0]}수 이상` : `${l.moves[0]}~${l.moves[1]}수`})`,
            () => start(l.key), { variant: l.key === 'beginner' ? 'primary' : '' },
          )),
        ),
      ),
      card(
        el('h3', { text: '어떻게 만들어지나요?' }),
        el('p', { class: 'faint' }, rich(
          '문제를 미리 만들어 두지 않고, 규칙 엔진이 축 모양을 생성한 뒤 실제 수순 길이를 재서 난이도에 맞는 것만 골라냅니다. 그래서 **매번 새로운 문제**가 나옵니다.',
        )),
      ),
    );
  }

  function start(difficulty) {
    const gen = generateLadderProblem(difficulty, Date.now());
    if (!gen) { toast('문제를 만들지 못했습니다. 다시 시도해 주세요.', 'bad'); return; }
    const problem = gen.problem;
    const size = problem.size || 19;
    const board = setup({ size, ...problem.setup });
    const picks = [];

    const canvas = el('canvas', { class: 'board' });
    const view = new BoardView(canvas, {
      size,
      onClick: (idx) => {
        if (board.cells[idx] !== EMPTY) return;
        if (picks.includes(idx)) { picks.splice(picks.indexOf(idx), 1); }
        else picks.push(idx);
        redraw();
      },
    });
    view.setBoard(board).setView('auto').setGhostColor(BLACK);
    requestAnimationFrame(() => view.render());
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => view.render()).observe(canvas);

    const result = el('div', {});

    function redraw() {
      view.setMarkers(picks.map((p, i) => ({ at: p, type: 'label', text: String(i + 1), color: '#1a4fa0' })));
      view.render();
      countLabel.textContent = `${picks.length}수 입력됨 (예상 ${gen.expectedMoves}수)`;
    }

    const countLabel = el('span', { class: 'faint' });

    setChildren(host, 
      el('div', { class: 'play-layout' },
        el('div', { class: 'board-wrap' }, canvas),
        el('div', { class: 'side' },
          card(
            el('h2', { text: problem.title }),
            el('p', {}, rich(problem.prompt)),
            el('p', { class: 'faint', text: '빈 점을 순서대로 누르면 번호가 붙습니다. 같은 점을 다시 누르면 취소됩니다.' }),
            countLabel,
          ),
          el('div', { class: 'row' },
            button('제출', () => {
              if (picks.length === 0) { toast('먼저 수순을 입력하세요.', 'bad'); return; }
              const v = verifySequence(problem, picks);
              app.progress.recordProblem({ correct: v.ok, firstTry: v.ok });
              setChildren(result, el('div', { class: `feedback ${v.ok ? 'good' : 'bad'}` },
                el('div', { class: 'head', text: v.ok ? '정확합니다!' : '수순이 어긋났습니다' }),
                rich(v.message),
                v.ok ? null : el('p', { class: 'faint' }, rich(problem.explanation)),
                el('div', { class: 'row', style: { marginTop: '10px' } },
                  button('새 문제', () => start(difficulty), { variant: 'primary', class: 'btn-sm' }),
                  button('난이도 바꾸기', chooser, { class: 'btn-sm', variant: 'ghost' }),
                ),
              ));
            }, { variant: 'primary' }),
            button('지우기', () => { picks.length = 0; redraw(); setChildren(result, ); }),
            button('새 문제', () => start(difficulty), { variant: 'ghost' }),
          ),
          result,
        ),
      ),
    );
    redraw();
  }

  chooser();
  return root;
}

/* ------------------------------------------------------------------ *
 * 내 대국에서 나온 문제 / 단일 문제 풀이
 * ------------------------------------------------------------------ */

export function myProblemsScreen(app) {
  const single = app.transfer.singleProblem;
  if (single) {
    app.transfer.singleProblem = null;
    return el('div', {},
      topbar(app, app.transfer.singleTitle || '연습 문제'),
      el('div', { class: 'wrap wide' }, soloProblem(app, single, () => app.back())),
    );
  }

  const list = app.progress.state.myProblems;
  const host = el('div', { class: 'wrap wide' });
  const root = el('div', {}, topbar(app, '내 대국에서 나온 문제'), host);

  function draw() {
    setChildren(host, 
      el('div', { class: 'notice' }, rich(
        '자유대국 복기에서 **실수한 장면이 그대로 문제가 되어** 여기에 쌓입니다. 내가 실제로 틀린 자리만 골라 반복하는 것이 가장 빠른 학습법입니다.',
      )),
      list.length === 0
        ? card(
            el('p', { text: '아직 저장된 문제가 없습니다.' }),
            el('p', { class: 'faint', text: '자유대국을 한 판 두고 복기에서 "중요 장면 저장"을 눌러 보세요.' }),
            button('자유대국 하러 가기', () => app.go('/play'), { variant: 'primary' }),
          )
        : el('div', { class: 'list-grid' }, ...list.map((p) => el('button', {
            class: 'entry-tile',
            onclick: () => open(p),
          },
            el('div', { class: 'row between' },
              el('span', { class: 'nm', text: p.title || '내 문제' }),
              p.solved ? badge('완료') : null,
            ),
            el('div', { class: 'faint', text: p.source ? `${p.source.moveNumber}수 · 둔 수 ${p.source.played}` : '' }),
          ))),
    );
  }

  function open(p) {
    setChildren(host, 
      button('← 목록', draw, { class: 'btn-sm', variant: 'ghost' }),
      soloProblem(app, p, () => { app.progress.markMyProblemSolved(p.id); draw(); }),
    );
  }

  draw();
  return root;
}

/** 한 문제만 푸는 작은 화면. 도감·내 문제·복습이 함께 쓴다. */
export function soloProblem(app, problem, onSolved) {
  const size = problem.size || 19;
  const session = new ProblemSession(problem);
  let firstTry = true;

  const feedback = el('div', { class: 'feedback' }, rich(problem.prompt));
  const canvas = el('canvas', { class: 'board' });
  const view = new BoardView(canvas, { size, onClick: (idx) => onClick(idx) });
  view.setBoard(session.board).setView('auto').setGhostColor(session.userColor);
  requestAnimationFrame(() => view.render());
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => view.render()).observe(canvas);

  function refresh() {
    view.setBoard(session.board).setView('auto');
    const last = session.moves[session.moves.length - 1];
    view.setLastMove(last ? last.idx : -1);
    view.render();
  }

  function onClick(idx) {
    if (session.solved) return;
    const res = session.play(idx);
    refresh();
    if (res.verdict === VERDICT.ILLEGAL) {
      feedback.className = 'feedback rule';
      setChildren(feedback, el('div', { class: 'head', text: '둘 수 없는 자리입니다' }), rich(res.message));
      return;
    }
    if (res.verdict === VERDICT.CORRECT && res.done) {
      app.progress.recordProblem({ correct: true, firstTry });
      app.progress.recordReview(problem.id, firstTry);
      view.setInteractive(false);
      feedback.className = 'feedback good';
      setChildren(feedback, 
        el('div', { class: 'head', text: res.message || '정답입니다!' }),
        rich(problem.explanation || ''),
        el('div', { class: 'row', style: { marginTop: '10px' } }, button('완료', () => onSolved?.(), { variant: 'primary' })),
      );
      return;
    }
    if (res.verdict === VERDICT.CORRECT) {
      feedback.className = 'feedback good';
      setChildren(feedback, el('div', { class: 'head', text: res.message }));
      return;
    }
    firstTry = false;
    app.progress.recordProblem({ correct: false, firstTry: false });
    app.progress.recordReview(problem.id, false);
    feedback.className = 'feedback bad';
    setChildren(feedback, 
      el('div', { class: 'head', text: res.message }),
      res.detail ? rich(res.detail) : null,
      el('div', { class: 'row', style: { marginTop: '10px' } },
        button('한 수 물리기', () => { session.undo(); refresh(); }, { class: 'btn-sm' })),
    );
  }

  return el('div', { class: 'play-layout' },
    el('div', { class: 'board-wrap' }, canvas),
    el('div', { class: 'side' },
      card(
        el('h2', { text: problem.title || '문제' }),
        el('p', {}, rich(problem.prompt)),
        el('p', { class: 'faint', text: `${COLOR_NAME[session.userColor]} 차례입니다.` }),
      ),
      feedback,
      el('div', { class: 'row' },
        button('힌트', () => {
          const h = session.hint();
          feedback.className = 'feedback';
          setChildren(feedback, el('div', { class: 'head', text: `힌트 ${h.level}` }), rich(h.text));
        }),
        button('정답 보기', () => {
          const r = session.reveal();
          view.setMarkers(r.moves.map((l) => ({ at: fromLabel(l, size), type: 'highlight', fill: '#4ec988' })));
          view.render();
          feedback.className = 'feedback rule';
          setChildren(feedback, 
            el('div', { class: 'head', text: `정답: ${r.moves.join(' · ')}` }),
            rich(r.explanation),
            el('div', { class: 'row', style: { marginTop: '10px' } }, button('완료', () => onSolved?.())),
          );
        }, { variant: 'ghost' }),
        button('다시 풀기', () => { session.reset(); refresh(); feedback.className = 'feedback'; setChildren(feedback, rich(problem.prompt)); }, { variant: 'ghost' }),
      ),
    ),
  );
}

/* ------------------------------------------------------------------ *
 * 오늘의 복습
 * ------------------------------------------------------------------ */

export function dailyReviewScreen(app) {
  const dueIds = new Set(app.progress.dueReviews());
  const pool = [];
  for (const lv of LEVELS) {
    for (const step of lv.steps) {
      if (step.problem && dueIds.has(step.problem.id)) pool.push({ problem: step.problem, level: lv });
    }
  }
  for (const p of app.progress.state.myProblems) {
    if (dueIds.has(p.id)) pool.push({ problem: p, level: null });
  }

  const host = el('div', { class: 'wrap wide' });
  const root = el('div', {}, topbar(app, '오늘의 복습'), host);
  let i = 0;

  function draw() {
    if (pool.length === 0) {
      setChildren(host, card(
        el('h2', { text: '오늘 복습할 문제가 없습니다' }),
        el('p', { class: 'faint' }, rich('문제를 풀면 일정 간격을 두고 다시 나타납니다. 틀린 문제는 더 자주, 맞힌 문제는 점점 뜸하게 나옵니다.')),
        button('스테이지로', () => app.go('/map'), { variant: 'primary' }),
      ));
      return;
    }
    if (i >= pool.length) {
      setChildren(host, card(
        el('h2', { text: '복습 완료!' }),
        el('p', { text: `${pool.length}문제를 다시 풀었습니다.` }),
        button('메인으로', () => app.go('/menu'), { variant: 'primary' }),
      ));
      return;
    }
    const { problem, level } = pool[i];
    setChildren(host, 
      el('div', { class: 'row between', style: { marginBottom: '10px' } },
        el('strong', { text: `${i + 1} / ${pool.length}` }),
        level ? el('span', { class: 'faint', text: `LEVEL ${level.id} · ${level.title}` }) : badge('내 대국 문제'),
      ),
      soloProblem(app, problem, () => { i += 1; draw(); }),
      el('div', { class: 'row', style: { marginTop: '10px' } },
        button('건너뛰기', () => { i += 1; draw(); }, { variant: 'ghost', class: 'btn-sm' })),
    );
  }

  draw();
  return root;
}
