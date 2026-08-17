/** 100단계 스테이지 지도와 스테이지 플레이 (요구사항 52·53·54). */

import { el, setChildren, button, card, section, stars, rich, toast, badge, progressBar, confirmDialog } from '../ui.js';
import { topbar } from './menu.js';
import { BoardView } from '../boardview.js';
import { setup, BLACK, WHITE, EMPTY, fromLabel, toLabel, opposite, COLOR_NAME } from '../../engine/board.js';
import { ProblemSession, VERDICT, buildPosition } from '../../game/problem.js';
import { StageSession, STEP, STEP_LABEL, hintsAllowed, isExamLevel, unlockRequirementText, EXAM_PASS_STARS } from '../../game/stage.js';
import { levelMap, getLevel, CHAPTERS, TOTAL_LEVELS } from '../../content/curriculum.js';

/* ------------------------------------------------------------------ *
 * 스테이지 지도
 * ------------------------------------------------------------------ */

export function stageMapScreen(app) {
  const p = app.progress;
  const map = levelMap();

  const chapters = CHAPTERS.map((ch) => {
    const tiles = map.filter((m) => m.chapter === ch.id).map((m) => {
      const rec = p.levelRecord(m.id);
      const unlocked = m.ready && p.isUnlocked(m.id);
      return el('button', {
        class: `level-tile ${rec.cleared ? 'cleared' : ''} ${m.exam ? 'exam' : ''}`.trim(),
        disabled: !unlocked,
        title: !m.ready ? '준비 중입니다' : (!unlocked ? '앞 LEVEL을 먼저 통과하세요' : ''),
        onclick: () => app.go(`/stage/${m.id}`),
      },
        el('div', { class: 'n' }, `LEVEL ${m.id}`, m.exam ? ' · 종합시험' : ''),
        el('div', { class: 't', text: m.title }),
        m.ready
          ? el('div', { class: 'stars', text: stars(rec.stars) })
          : el('div', {}, badge('준비 중', 'soon')),
      );
    });

    const readyCount = map.filter((m) => m.chapter === ch.id && m.ready).length;
    const chapterTotal = ch.range[1] - ch.range[0] + 1;
    return el('div', { class: 'chapter' },
      el('div', { class: 'chapter-head' },
        el('h2', { text: `CHAPTER ${ch.id} · ${ch.title}` }),
        el('span', { class: 'n', text: `LEVEL ${ch.range[0]}~${ch.range[1]}` }),
        readyCount === 0 ? badge('준비 중', 'soon')
          : readyCount < chapterTotal ? badge(`${readyCount}/${chapterTotal} 구현`, 'soon')
            : null,
      ),
      el('p', { class: 'faint', text: ch.summary }),
      el('div', { class: 'level-grid' }, ...tiles),
    );
  });

  return el('div', {}, topbar(app, '100단계 스테이지'), el('div', { class: 'wrap wide' },
    card(
      el('div', { class: 'row between' },
        el('div', {},
          el('strong', { text: `LEVEL ${p.clearedCount()} / ${TOTAL_LEVELS} 완료` }),
          el('div', { class: 'faint', text: `총 별 ${p.totalStars()} / ${TOTAL_LEVELS * 3}` }),
        ),
        button('이어서 학습', () => app.go(`/stage/${p.nextLevelId(TOTAL_LEVELS)}`), { variant: 'primary' }),
      ),
      progressBar(p.clearedCount() / TOTAL_LEVELS),
    ),
    el('div', { class: 'notice' }, rich(
      'LEVEL 1~40을 지금 플레이할 수 있습니다. 나머지 단계는 커리큘럼 지도만 먼저 공개되어 있고 **아직 준비 중**이며, 눌러도 열리지 않습니다.',
    )),
    ...chapters,
  ));
}

/* ------------------------------------------------------------------ *
 * 스테이지 플레이
 * ------------------------------------------------------------------ */

export function stageScreen(app, params) {
  const idParam = params[0];

  // 승급전은 문제 묶음만 넘겨받아 같은 화면을 재사용한다
  if (idParam === 'exam' || location.hash.includes('/stage/exam')) {
    const set = app.transfer.examSet;
    if (!set) { app.go('/menu'); return el('div'); }
    return examRunner(app, set);
  }

  const id = Number(idParam);
  const level = getLevel(id);
  if (!level) {
    return el('div', {}, topbar(app, `LEVEL ${id}`), el('div', { class: 'wrap' },
      card(
        el('h2', { text: '아직 준비 중인 LEVEL입니다' }),
        el('p', {}, rich('이 단계의 콘텐츠는 아직 만들어지지 않았습니다. 지금은 **LEVEL 1~40**을 플레이할 수 있습니다.')),
        button('스테이지 지도로', () => app.go('/map'), { variant: 'primary' }),
      ),
    ));
  }
  if (!app.progress.isUnlocked(id)) {
    return el('div', {}, topbar(app, `LEVEL ${id}`), el('div', { class: 'wrap' },
      card(
        el('h2', { text: '아직 열리지 않았습니다' }),
        el('p', { text: unlockRequirementText(id - 1) }),
        button('스테이지 지도로', () => app.go('/map'), { variant: 'primary' }),
      ),
    ));
  }

  const stage = new StageSession(level);
  const host = el('div', { class: 'wrap wide' });
  const bar = el('div', { class: 'stepbar' });
  const root = el('div', {},
    topbar(app, `LEVEL ${id} · ${level.title}`, isExamLevel(id) ? badge('종합시험', 'exam') : null),
    host,
  );

  function renderBar() {
    setChildren(bar, ...stage.steps.map((s, i) => el('span', {
      class: `step-chip ${i === stage.index ? 'active' : ''} ${stage.records[i].done ? 'done' : ''}`.trim(),
      text: STEP_LABEL[s.type] || s.type,
    })));
  }

  function next() {
    stage.next();
    draw();
  }

  function finish() {
    const summary = stage.summary();
    app.progress.completeLevel(id, summary);
    const passed = summary.stars > 0;
    const examOk = !isExamLevel(id) || summary.stars >= EXAM_PASS_STARS;
    setChildren(host, 
      card(
        el('h2', { text: passed ? 'LEVEL 통과!' : '아직 통과하지 못했습니다' }),
        el('div', { style: { fontSize: '2rem', color: 'var(--gold)', letterSpacing: '.15em' }, text: stars(summary.stars) }),
        el('dl', { class: 'kv', style: { marginTop: '10px' } },
          el('dt', { text: '푼 문제' }), el('dd', { text: `${summary.solved} / ${summary.total}` }),
          el('dt', { text: '쓴 힌트' }), el('dd', { text: `${summary.hints}회` }),
          el('dt', { text: '오답' }), el('dd', { text: `${summary.wrong}회` }),
          el('dt', { text: '걸린 시간' }), el('dd', { text: `${Math.floor(summary.seconds / 60)}분 ${summary.seconds % 60}초` }),
        ),
        isExamLevel(id) && !examOk
          ? el('div', { class: 'notice', style: { marginTop: '10px' } },
              rich('종합시험은 **★★ 이상**이어야 다음 챕터가 열립니다. 다시 도전해 보세요.'))
          : null,
        el('div', { class: 'row', style: { marginTop: '14px' } },
          getLevel(id + 1) && examOk && passed
            ? button(`다음 LEVEL ${id + 1} →`, () => app.go(`/stage/${id + 1}`), { variant: 'primary' })
            : null,
          button('다시 하기', () => app.go(`/stage/${id}`)),
          button('스테이지 지도', () => app.go('/map'), { variant: 'ghost' }),
        ),
      ),
      level.formula ? formulaCard(level.formula) : null,
    );
  }

  function draw() {
    renderBar();
    if (stage.finished) { finish(); return; }
    const step = stage.current;
    const body = stepView(app, stage, step, {
      onDone: () => { stage.markDone(); next(); },
      onSkip: () => next(),
      level,
    });
    setChildren(host, bar, body);
  }

  draw();
  return root;
}

/* ------------------------------------------------------------------ */

function stepView(app, stage, step, handlers) {
  switch (step.type) {
    case STEP.CONCEPT: return conceptView(app, step, handlers);
    case STEP.FOLLOW: return followView(app, step, handlers);
    case STEP.QUIZ: return quizView(app, stage, step, handlers);
    default: return problemView(app, stage, step, handlers);
  }
}

export function formulaCard(f) {
  return el('div', { class: 'card formula-card' },
    el('div', { class: 'row', style: { marginBottom: '6px' } },
      el('h3', { text: `공식 · ${f.name}`, style: { margin: 0 } }),
      badge(f.kind.label, f.kind.key),
    ),
    el('p', { class: 'faint', text: f.kind.hint }),
    el('dl', {},
      el('dt', { text: '① 공식' }), el('dd', {}, rich(f.statement)),
      el('dt', { text: '② 왜 그런가?' }), el('dd', {}, rich(f.why)),
      el('dt', { text: '③ 언제 유효한가?' }), el('dd', {}, rich(f.when)),
      el('dt', { text: '④ 언제 예외가 생기는가?' }), el('dd', {}, rich(f.exception)),
    ),
  );
}

/** 자동으로 잡은 화면 범위를 사방으로 조금 넓힌다(정답 자리가 잘려 보이지 않도록). */
function expandView(v, size, pad = 2) {
  if (!v) return null;
  return {
    left: Math.max(0, v.left - pad),
    top: Math.max(0, v.top - pad),
    right: Math.min(size - 1, v.right + pad),
    bottom: Math.min(size - 1, v.bottom + pad),
  };
}

function makeBoardPanel(opts = {}) {
  const canvas = el('canvas', { class: `board ${opts.locked ? 'locked' : ''}`.trim() });
  const wrap = el('div', { class: 'board-wrap' }, canvas);
  const view = new BoardView(canvas, {
    size: opts.size || 19,
    onClick: opts.onClick,
    showCoordinates: opts.showCoordinates !== false,
  });
  // 캔버스가 레이아웃에 들어간 뒤에 크기가 정해지므로 다음 프레임에 그린다
  requestAnimationFrame(() => view.render());
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => view.render()) : null;
  if (ro) ro.observe(canvas);
  return { wrap, view, canvas };
}

/* ---------------- 개념 배우기 ---------------- */

function conceptView(app, step, handlers) {
  const demo = step.demo;
  const size = 19;
  const panel = makeBoardPanel({ size, locked: true });
  panel.view.setInteractive(false);

  const note = el('p', { class: 'faint', style: { minHeight: '1.6em' } });
  let timer = null;

  // 시연이 끝난 국면을 기준으로 화면 범위를 한 번만 정한다.
  // 수마다 다시 잡으면 돌이 놓일 때마다 판이 확대·축소되어 어지럽다.
  const fixedView = (() => {
    const end = setup({ size, ...(demo?.setup || {}) });
    for (const m of demo?.moves || []) {
      const i = fromLabel(m.at, size);
      if (i >= 0 && end.cells[i] === EMPTY && m.color) end.play(m.color, i);
    }
    panel.view.setBoard(end);
    return panel.view.autoView();
  })();

  function reset() {
    if (timer) { clearTimeout(timer); timer = null; }
    const board = setup({ size, ...(demo?.setup || {}) });
    panel.view.setBoard(board).setView(fixedView).setMarkers([]).setLiberties(null).setLastMove(-1);
    panel.view.render();
    note.textContent = '';
    return board;
  }

  function playDemo() {
    const board = reset();
    const moves = demo?.moves || [];
    let i = 0;
    const stepOnce = () => {
      if (i >= moves.length) return;
      const m = moves[i++];
      const idx = fromLabel(m.at, size);
      if (idx >= 0 && board.cells[idx] === EMPTY) board.play(m.color, idx);
      panel.view.setBoard(board).setLastMove(idx).setView(fixedView);
      if (m.showLiberties && idx >= 0 && board.cells[idx] !== EMPTY) {
        panel.view.setLiberties(board.group(idx).liberties);
      } else {
        panel.view.setLiberties(null);
      }
      panel.view.render();
      note.textContent = m.note || '';
      timer = setTimeout(stepOnce, 1300);
    };
    stepOnce();
  }

  if (demo) { requestAnimationFrame(playDemo); }

  return el('div', { class: 'play-layout' },
    el('div', {},
      demo ? panel.wrap : null,
      demo ? el('div', { class: 'row center', style: { marginTop: '10px', justifyContent: 'center' } },
        button('▶ 다시 보기', playDemo, { class: 'btn-sm' }),
        note,
      ) : null,
    ),
    el('div', { class: 'side' },
      card(
        el('h2', { text: step.title }),
        ...(step.body || []).map((t) => el('p', {}, rich(t))),
      ),
      step.formula ? formulaCard(step.formula) : null,
      button('다음 →', () => { if (timer) clearTimeout(timer); handlers.onDone(); }, { variant: 'primary' }),
    ),
  );
}

/* ---------------- 따라 두기 ---------------- */

function followView(app, step, handlers) {
  const size = step.size || 19;
  const board = setup({ size, ...(step.setup || {}) });
  const seq = step.sequence || [];
  let i = 0;

  const feedback = el('div', { class: 'feedback' });
  const panel = makeBoardPanel({
    size,
    onClick: (idx) => onClick(idx),
  });
  // 화면 범위는 수순 전체를 담도록 처음에 한 번만 정한다.
  // 매 수마다 다시 잡으면 다음에 눌러야 할 자리가 화면 밖으로 밀려날 수 있다.
  const fixedView = (() => {
    const end = setup({ size, ...(step.setup || {}) });
    for (const s of seq) {
      const i2 = fromLabel(s.at, size);
      if (i2 >= 0 && end.cells[i2] === EMPTY) end.play(s.color ?? BLACK, i2);
    }
    panel.view.setBoard(end);
    return panel.view.autoView();
  })();
  panel.view.setBoard(board).setView(fixedView);

  function target() { return seq[i] ? fromLabel(seq[i].at, size) : -1; }

  function refresh() {
    const t = target();
    panel.view.setBoard(board).setView(fixedView);
    panel.view.setMarkers(t >= 0 ? [{ at: t, type: 'highlight', fill: '#6ea8fe' }] : []);
    panel.view.setGhostColor(seq[i]?.color ?? BLACK);
    panel.view.render();
    setChildren(feedback, 
      el('div', { class: 'head', text: i < seq.length ? `${i + 1} / ${seq.length}` : '완료!' }),
      rich(i < seq.length ? seq[i].say : '수순을 모두 두었습니다.'),
    );
  }

  function onClick(idx) {
    const t = target();
    if (t < 0) return;
    if (idx !== t) {
      feedback.className = 'feedback bad';
      setChildren(feedback, 
        el('div', { class: 'head', text: '그 자리가 아닙니다' }),
        rich(`파란색으로 표시된 **${toLabel(t, size)}** 에 놓아 보세요.`),
      );
      return;
    }
    const color = seq[i].color ?? BLACK;
    const res = board.play(color, idx);
    if (!res.ok) { toast(res.message, 'bad'); return; }
    i += 1;
    feedback.className = 'feedback';
    refresh();
    if (i >= seq.length) {
      feedback.className = 'feedback good';
      setTimeout(() => handlers.onDone(), 600);
    }
  }

  refresh();

  return el('div', { class: 'play-layout' },
    el('div', {}, panel.wrap),
    el('div', { class: 'side' },
      card(el('h2', { text: step.title }), ...(step.body || []).map((t) => el('p', {}, rich(t)))),
      feedback,
      button('건너뛰기', () => handlers.onSkip(), { variant: 'ghost', class: 'btn-sm' }),
    ),
  );
}

/* ---------------- 퀴즈 ---------------- */

function quizView(app, stage, step, handlers) {
  const feedback = el('div', {});
  const buttons = [];
  let answered = false;

  const options = (step.options || []).map((text, idx) => {
    const b = el('button', {
      class: 'quiz-option',
      onclick: () => {
        if (answered) return;
        answered = true;
        const correct = idx === step.answer;
        b.classList.add(correct ? 'correct' : 'wrong');
        if (!correct) {
          buttons[step.answer].classList.add('correct');
          stage.recordWrong();
        }
        buttons.forEach((x) => { x.disabled = true; });
        app.progress.recordProblem({ correct, firstTry: correct });
        setChildren(feedback, el('div', { class: `feedback ${correct ? 'good' : 'bad'}` },
          el('div', { class: 'head', text: correct ? '맞았습니다' : '다시 생각해 봅시다' }),
          rich(step.explain),
        ));
        feedback.appendChild(el('div', { class: 'row', style: { marginTop: '12px' } },
          button('다음 →', () => handlers.onDone(), { variant: 'primary' })));
      },
    }, text);
    buttons.push(b);
    return b;
  });

  return el('div', { class: 'wrap' },
    card(
      el('h2', { text: step.title || '개념 확인' }),
      el('p', {}, rich(step.question)),
      ...options,
    ),
    feedback,
  );
}

/* ---------------- 문제 ---------------- */

function problemView(app, stage, step, handlers) {
  const problem = step.problem;
  const isBoss = step.type === STEP.BOSS;
  const session = new ProblemSession(problem, { allowHints: !isBoss });
  const size = problem.size || 19;
  let firstTry = true;

  const feedback = el('div', { class: 'feedback' });
  const panel = makeBoardPanel({ size, onClick: (idx) => onClick(idx) });
  panel.view.setBoard(session.board).setView('auto').setGhostColor(session.userColor);
  // 자동화 테스트가 진행 중인 문제 상태를 읽을 수 있게 해 두는 연결고리
  panel.canvas.__problemSession = session;
  // 문제를 푸는 동안 판이 흔들리지 않도록 화면 범위를 고정한다.
  // 정답 자리가 시작 국면 바깥일 수 있으므로 여유를 넉넉히 둔다.
  const fixedView = expandView(panel.view.autoView(), size, 2);

  const hintBtn = button('힌트', () => {
    const h = session.hint();
    stage.recordHint();
    feedback.className = 'feedback';
    setChildren(feedback, el('div', { class: 'head', text: `힌트 ${h.level}` }), rich(h.text));
  }, { disabled: isBoss, title: isBoss ? 'BOSS 문제에서는 힌트를 쓸 수 없습니다' : '' });

  const revealBtn = button('정답 보기', () => {
    const r = session.reveal();
    stage.recordReveal();
    panel.view.setMarkers(r.moves.map((l) => ({ at: fromLabel(l, size), type: 'highlight', fill: '#4ec988' })));
    panel.view.render();
    feedback.className = 'feedback rule';
    setChildren(feedback, 
      el('div', { class: 'head', text: `정답: ${r.moves.join(' · ')}` }),
      rich(r.explanation),
      el('div', { class: 'row', style: { marginTop: '10px' } },
        button('다음 →', () => { stage.markDone(); handlers.onDone(); }, { variant: 'primary' })),
    );
  }, { disabled: isBoss, variant: 'ghost' });

  const retryBtn = button('다시 풀기', () => {
    session.reset();
    refresh();
    feedback.className = 'feedback';
    setChildren(feedback, rich(problem.prompt));
  }, { variant: 'ghost' });

  function refresh() {
    panel.view.setBoard(session.board).setView(fixedView);
    const last = session.moves[session.moves.length - 1];
    panel.view.setLastMove(last ? last.idx : -1);
    panel.view.setMarkers([]);
    panel.view.render();
  }

  function onClick(idx) {
    if (session.solved) return;
    const res = session.play(idx);
    refresh();

    if (res.verdict === VERDICT.ILLEGAL) {
      feedback.className = 'feedback rule';
      setChildren(feedback, el('div', { class: 'head', text: '규칙상 둘 수 없는 자리입니다' }), rich(res.message));
      return;
    }
    if (res.verdict === VERDICT.CORRECT) {
      if (res.done) {
        app.progress.recordProblem({ correct: true, firstTry });
        app.progress.recordReview(problem.id, firstTry);
        stage.markDone();
        panel.view.setInteractive(false);
        feedback.className = 'feedback good';
        setChildren(feedback, 
          el('div', { class: 'head', text: res.message || '정답입니다!' }),
          problem.explanation ? rich(problem.explanation) : null,
          el('div', { class: 'row', style: { marginTop: '12px' } },
            button('다음 →', () => handlers.onDone(), { variant: 'primary' })),
        );
      } else {
        feedback.className = 'feedback good';
        setChildren(feedback, el('div', { class: 'head', text: res.message }), rich('계속 이어서 두세요.'));
      }
      return;
    }
    // 오답 — 반드시 이유를 보여 준다
    firstTry = false;
    stage.recordWrong();
    app.progress.recordProblem({ correct: false, firstTry: false });
    feedback.className = 'feedback bad';
    setChildren(feedback, 
      el('div', { class: 'head', text: res.message }),
      res.detail ? rich(res.detail) : null,
      el('div', { class: 'row', style: { marginTop: '10px' } },
        button('한 수 물리기', () => { session.undo(); refresh(); }, { class: 'btn-sm' })),
    );
  }

  setChildren(feedback, rich(problem.prompt));

  return el('div', { class: 'play-layout' },
    el('div', {}, panel.wrap),
    el('div', { class: 'side' },
      card(
        el('div', { class: 'row', style: { marginBottom: '4px' } },
          el('h2', { text: problem.title || STEP_LABEL[step.type], style: { margin: 0 } }),
          isBoss ? badge('BOSS', 'exam') : null,
        ),
        el('p', {}, rich(problem.prompt)),
        el('p', { class: 'faint', text: `${COLOR_NAME[session.userColor]} 차례입니다.` }),
      ),
      feedback,
      el('div', { class: 'row' }, hintBtn, revealBtn, retryBtn),
      isBoss ? el('p', { class: 'faint', text: 'BOSS 문제는 힌트 없이 풀어야 합니다.' }) : null,
    ),
  );
}

/* ------------------------------------------------------------------ *
 * 승급전 실행기 — 문제 묶음을 순서대로 푼다
 * ------------------------------------------------------------------ */

function examRunner(app, set) {
  const host = el('div', { class: 'wrap wide' });
  const root = el('div', {}, topbar(app, set.title), host);
  let i = 0;
  let correct = 0;
  let revealed = false;

  function draw() {
    if (i >= set.problems.length) {
      const rate = correct / set.problems.length;
      const passed = rate >= 0.8 && !revealed;
      set.onFinish?.(passed);
      setChildren(host, card(
        el('h2', { text: passed ? '합격!' : '불합격' }),
        el('p', { text: `${set.problems.length}문제 중 ${correct}문제 정답 (${Math.round(rate * 100)}%)` }),
        revealed ? el('p', { class: 'faint', text: '정답 보기를 사용해 불합격 처리되었습니다.' }) : null,
        el('div', { class: 'row' },
          button('메인으로', () => app.go('/menu'), { variant: 'primary' })),
      ));
      return;
    }
    const fakeStage = {
      recordHint() {}, recordWrong() {}, recordReveal() { revealed = true; }, markDone() {},
    };
    const problem = set.problems[i];
    let counted = false;
    const view = problemView(app, fakeStage, { type: STEP.BOSS, problem }, {
      onDone: () => { if (!counted) { counted = true; correct += 1; } i += 1; draw(); },
      onSkip: () => { i += 1; draw(); },
    });
    setChildren(host, 
      el('div', { class: 'row between', style: { marginBottom: '10px' } },
        el('strong', { text: `${i + 1} / ${set.problems.length}` }),
        button('이 문제 포기', () => { i += 1; draw(); }, { variant: 'ghost', class: 'btn-sm' }),
      ),
      view,
    );
  }

  draw();
  return root;
}
