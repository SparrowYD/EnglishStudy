/** 자유대국 · 계가 · 복기 (요구사항 55·56·61·64·65·66·67·68·69). */

import { el, setChildren, button, card, section, rich, toast, badge, confirmDialog, progressBar } from '../ui.js';
import { topbar } from './menu.js';
import { BoardView } from '../boardview.js';
import { BLACK, WHITE, EMPTY, opposite, toLabel, fromLabel, COLOR_NAME } from '../../engine/board.js';
import { Game, PASS, RESIGN, handicapPoints } from '../../engine/game.js';
import { score, estimateDeadStones, quickEstimate } from '../../engine/score.js';
import { EngineRegistry } from '../../ai/AIEngine.js';
import { LocalBasicAI } from '../../ai/LocalBasicAI.js';
import { KataGoAdapter } from '../../ai/KataGoAdapter.js';
import { KYU_LIST, RANK_NOTES, RANK_DISCLAIMER, rankConfig } from '../../ai/ranks.js';
import { analyzeGame, keyMoments, toProblem, summarize, MARKS } from '../../game/review.js';

const registry = new EngineRegistry()
  .register('katago', (o) => new KataGoAdapter(o), { label: 'KataGo' })
  .register('local', (o) => new LocalBasicAI(o), { label: '내장 AI' });

/* ------------------------------------------------------------------ *
 * 자유대국 설정
 * ------------------------------------------------------------------ */

export function freePlaySetupScreen(app) {
  const s = app.progress.settings;
  const cfgState = {
    size: 19,
    myColor: 'black',
    aiKyu: s.aiKyu || 12,
    komi: 'auto',
    komiValue: 6.5,
    handicap: 0,
    time: 0,
    review: true,
    teacher: false,
  };

  const kyuLabel = el('strong', { text: `${cfgState.aiKyu}급` });
  const kyuNote = el('p', { class: 'faint', text: RANK_NOTES[cfgState.aiKyu] || '' });
  const slider = el('input', {
    type: 'range', min: '1', max: '18', value: String(19 - cfgState.aiKyu),
    oninput: (e) => { setKyu(19 - Number(e.target.value)); },
  });
  const dropdown = el('select', {
    onchange: (e) => setKyu(Number(e.target.value)),
  }, ...KYU_LIST.map((k) => el('option', { value: String(k), selected: k === cfgState.aiKyu }, `${k}급`)));

  function setKyu(k) {
    cfgState.aiKyu = k;
    kyuLabel.textContent = `${k}급`;
    kyuNote.textContent = RANK_NOTES[k] || '';
    slider.value = String(19 - k);
    dropdown.value = String(k);
    app.progress.setSetting('aiKyu', k);
  }

  const sug = app.progress.difficultySuggestion();

  const field = (label, node, hint) => el('label', { class: 'field', style: { marginBottom: '12px' } },
    label, node, hint ? el('span', { class: 'faint', text: hint }) : null);

  const komiInput = el('input', { type: 'number', step: '0.5', value: '6.5', disabled: true });

  return el('div', {}, topbar(app, '컴퓨터와 자유대국'), el('div', { class: 'wrap' },
    card(
      el('h2', { text: '컴퓨터 기력' }),
      el('div', { class: 'slider-row' },
        el('span', { class: 'faint', text: '18급' }),
        slider,
        el('span', { class: 'faint', text: '1급' }),
      ),
      el('div', { class: 'row between' },
        el('div', {}, '현재: ', kyuLabel),
        dropdown,
      ),
      kyuNote,
      sug.suggest && s.autoAdjustPrompt
        ? el('div', { class: 'notice', style: { marginTop: '8px' } },
            el('div', {}, rich(`최근 ${sug.sample}판 승률 ${Math.round(sug.winRate * 100)}%. ${sug.text}`)),
            el('div', { class: 'row', style: { marginTop: '6px' } },
              button(sug.suggest === 'up' ? '한 단계 올리기' : '한 단계 낮추기', () => {
                setKyu(Math.max(1, Math.min(18, cfgState.aiKyu + (sug.suggest === 'up' ? -1 : 1))));
                toast('기력을 조정했습니다.');
              }, { class: 'btn-sm' }),
              button('그대로 두기', () => toast('그대로 진행합니다.'), { class: 'btn-sm', variant: 'ghost' }),
            ))
        : null,
      el('p', { class: 'faint' }, rich(RANK_DISCLAIMER)),
    ),

    card(
      el('h2', { text: '대국 설정' }),
      field('바둑판', el('select', { disabled: true }, el('option', {}, '19 × 19 (정규)'))),
      field('내 돌', el('select', { onchange: (e) => { cfgState.myColor = e.target.value; } },
        el('option', { value: 'black' }, '흑 (먼저 둠)'),
        el('option', { value: 'white' }, '백'),
        el('option', { value: 'random' }, '랜덤'),
      )),
      field('접바둑', el('select', {
        onchange: (e) => {
          cfgState.handicap = Number(e.target.value);
          if (cfgState.handicap >= 2) { cfgState.myColor = 'black'; }
        },
      },
        el('option', { value: '0' }, '없음'),
        ...[2, 3, 4, 5, 6, 7, 8, 9].map((h) => el('option', { value: String(h) }, `${h}점`)),
      ), '접바둑을 두면 내가 흑을 잡고 화점에 미리 놓은 뒤 백부터 시작합니다.'),
      field('덤', el('select', {
        onchange: (e) => {
          cfgState.komi = e.target.value;
          komiInput.disabled = e.target.value !== 'custom';
        },
      },
        el('option', { value: 'auto' }, '자동 (맞바둑 6.5집 / 접바둑 0.5집)'),
        el('option', { value: 'custom' }, '직접 입력'),
      )),
      el('div', { style: { marginBottom: '12px' } }, komiInput),
      field('착수 시간', el('select', { onchange: (e) => { cfgState.time = Number(e.target.value); } },
        el('option', { value: '0' }, '무제한'),
        el('option', { value: '10' }, '10분'),
        el('option', { value: '20' }, '20분'),
        el('option', { value: '30' }, '30분'),
      )),
      el('label', { class: 'check', style: { marginBottom: '10px' } },
        el('input', { type: 'checkbox', checked: true, onchange: (e) => { cfgState.review = e.target.checked; } }),
        '대국 후 복기하기',
      ),
      el('label', { class: 'check' },
        el('input', { type: 'checkbox', onchange: (e) => { cfgState.teacher = e.target.checked; } }),
        el('span', {},
          el('div', { text: '선생님 대국 (힌트 사용)' }),
          el('div', { class: 'faint', text: '힌트를 누르면 후보수 3개를 별점과 함께 보여 줍니다. 먼저 스스로 고른 뒤 설명을 봅니다.' }),
        ),
      ),
    ),

    el('div', { class: 'row' },
      button('대국 시작', () => {
        const komi = cfgState.komi === 'custom' ? Number(komiInput.value) : null;
        let myColor = cfgState.myColor;
        if (cfgState.handicap >= 2) myColor = 'black';
        if (myColor === 'random') myColor = Math.random() < 0.5 ? 'black' : 'white';
        app.go('/game', {
          gameConfig: {
            ...cfgState,
            komi,
            myColor: myColor === 'black' ? BLACK : WHITE,
          },
        });
      }, { variant: 'primary' }),
      button('취소', () => app.go('/menu'), { variant: 'ghost' }),
    ),
  ));
}

/* ------------------------------------------------------------------ *
 * 대국 화면
 * ------------------------------------------------------------------ */

export function freePlayScreen(app) {
  const cfg = app.transfer.gameConfig;
  if (!cfg) { app.go('/play'); return el('div'); }

  const game = new Game({
    size: cfg.size, handicap: cfg.handicap, rules: 'territory',
    komi: cfg.komi != null ? cfg.komi : undefined,
  });
  const myColor = cfg.myColor;
  const aiColor = opposite(myColor);

  let engine = new LocalBasicAI({ kyu: cfg.aiKyu });
  let engineLabel = '내장 AI';
  let thinking = false;
  let deadStones = null;
  let scoringMode = false;
  const clocks = { [BLACK]: cfg.time * 60, [WHITE]: cfg.time * 60 };
  let clockTimer = null;
  let pendingMove = -1;

  const status = el('div', {});
  const infoBox = el('div', {});
  const hintBox = el('div', {});
  const controls = el('div', { class: 'row' });

  const canvas = el('canvas', { class: 'board' });
  const view = new BoardView(canvas, {
    size: cfg.size,
    showCoordinates: app.progress.settings.showCoordinates !== false,
    onClick: (idx) => onBoardClick(idx),
  });
  view.setBoard(game.board).setGhostColor(myColor);
  requestAnimationFrame(() => view.render());
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => view.render()) : null;
  if (ro) ro.observe(canvas);

  // 엔진 준비 — KataGo가 있으면 쓰고, 없으면 조용히 내장 AI로 간다
  registry.create('katago', { kyu: cfg.aiKyu }).then(({ engine: e, key, fallback, notes }) => {
    engine = e;
    engineLabel = key === 'katago' ? (e.name || 'KataGo') : '내장 AI';
    if (fallback && notes.length) {
      console.info('[바둑100] AI 엔진 선택:', notes.join(' / '));
    }
    refresh();
    maybeAIMove();
  }).catch(() => { refresh(); maybeAIMove(); });

  function startClock() {
    if (!cfg.time) return;
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      if (game.finished) { clearInterval(clockTimer); return; }
      clocks[game.turn] -= 1;
      if (clocks[game.turn] <= 0) {
        clocks[game.turn] = 0;
        clearInterval(clockTimer);
        game.finished = true;
        game.result = {
          winner: opposite(game.turn), by: 'time',
          text: `${COLOR_NAME[opposite(game.turn)]} 시간승`,
        };
        endGame();
      }
      refresh();
    }, 1000);
  }

  function fmtClock(sec) {
    if (!cfg.time) return '무제한';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function onBoardClick(idx) {
    if (scoringMode) { toggleDead(idx); return; }
    if (game.finished || thinking || game.turn !== myColor) return;

    if (app.progress.settings.confirmMove && pendingMove !== idx) {
      const chk = game.check(idx, myColor);
      if (!chk.ok) { toast(chk.message, 'bad'); return; }
      pendingMove = idx;
      view.setMarkers([{ at: idx, type: 'ghost', stone: myColor }]);
      view.render();
      return;
    }
    pendingMove = -1;
    play(idx, myColor);
  }

  function play(idx, color) {
    const res = game.play(idx, color);
    if (!res.ok) { toast(res.message, 'bad'); return; }
    view.setMarkers([]);
    refresh();
    if (game.finished) { endGame(); return; }
    maybeAIMove();
  }

  async function maybeAIMove() {
    if (game.finished || game.turn !== aiColor || thinking) return;
    thinking = true;
    refresh();
    // 화면이 먼저 갱신되도록 한 프레임 양보한다
    await new Promise((r) => setTimeout(r, 60));
    try {
      const { move } = await engine.genMove(game, aiColor);
      const res = game.play(move, aiColor);
      if (!res.ok) game.play(PASS, aiColor);
    } catch (err) {
      console.error(err);
      game.play(PASS, aiColor);
    }
    thinking = false;
    refresh();
    if (game.finished) endGame();
  }

  function refresh() {
    view.setBoard(game.board);
    const last = [...game.moves].reverse().find((m) => m.idx >= 0);
    view.setLastMove(last ? last.idx : -1);
    view.setDeadStones(deadStones);
    view.setInteractive(!game.finished || scoringMode);
    view.render();

    setChildren(status, 
      el('div', { class: 'row between' },
        el('div', {},
          el('strong', { text: `${game.moveNumber}수` }),
          el('span', { class: 'faint', text: `  ·  ${engineLabel} ${cfg.aiKyu}급` }),
        ),
        el('div', { class: 'faint', text: game.finished ? '대국 종료' : (thinking ? '컴퓨터가 생각 중…' : `${COLOR_NAME[game.turn]} 차례`) }),
      ),
      el('div', { class: 'row between', style: { marginTop: '6px' } },
        el('span', {}, `⚫ ${myColor === BLACK ? '나' : '컴퓨터'} · 잡은 돌 ${game.board.prisoners[BLACK]}`, cfg.time ? ` · ${fmtClock(clocks[BLACK])}` : ''),
        el('span', {}, `⚪ ${myColor === WHITE ? '나' : '컴퓨터'} · 잡은 돌 ${game.board.prisoners[WHITE]}`, cfg.time ? ` · ${fmtClock(clocks[WHITE])}` : ''),
      ),
    );

    setChildren(controls, 
      button('패스', () => play(PASS, myColor), { disabled: game.finished || game.turn !== myColor || thinking }),
      button('무르기', () => {
        // 내 수와 컴퓨터 수를 함께 되돌린다
        game.undo(); game.undo();
        refresh();
      }, { disabled: game.moveNumber < 2 || game.finished || thinking, variant: 'ghost' }),
      cfg.teacher
        ? button('힌트', () => showHint(), { disabled: game.finished || game.turn !== myColor || thinking })
        : null,
      button('돌 던지기', () => confirmDialog('정말 기권할까요?', '이 대국은 패배로 기록됩니다.', () => {
        game.play(RESIGN, myColor);
        endGame();
      }, '기권'), { variant: 'danger', disabled: game.finished }),
    );
  }

  /** 요구사항 66 — 바로 정답을 알려 주지 않고 먼저 고르게 한다. */
  async function showHint() {
    thinking = true;
    refresh();
    const top = await engine.topMoves(game, myColor, 3);
    thinking = false;
    if (top.length === 0) { toast('추천할 수를 찾지 못했습니다.'); refresh(); return; }
    const letters = ['A', 'B', 'C'];
    view.setMarkers(top.map((t, i) => ({ at: t.move, type: 'label', text: letters[i], color: '#1a4fa0' })));
    view.render();

    setChildren(hintBox, card(
      el('h3', { text: '어느 수가 가장 좋다고 생각하나요?' }),
      el('div', { class: 'hint-choice' },
        ...top.map((t, i) => button(
          `${letters[i]}. ${toLabel(t.move, cfg.size)}`,
          () => revealHint(top, i),
        )),
      ),
      el('p', { class: 'faint', text: '먼저 스스로 골라 보세요. 고른 뒤에 이유를 설명해 드립니다.' }),
    ));
    refresh();
  }

  function revealHint(top, chosen) {
    const rated = top.map((t, i) => ({ ...t, stars: 5 - i }));
    setChildren(hintBox, card(
      el('h3', { text: '후보수 평가' }),
      ...rated.map((t, i) => el('div', { class: 'row between', style: { padding: '4px 0' } },
        el('span', {}, `${['A', 'B', 'C'][i]}. ${toLabel(t.move, cfg.size)} `,
          el('span', { style: { color: 'var(--gold)' }, text: '★'.repeat(t.stars) + '☆'.repeat(5 - t.stars) })),
        el('span', { class: 'faint', text: t.reason }),
      )),
      el('p', {}, rich(chosen === 0
        ? '**잘 골랐습니다.** AI도 이 수를 가장 높게 봤습니다.'
        : `AI는 **${toLabel(top[0].move, cfg.size)}** 를 가장 높게 봤습니다. 이유: ${top[0].reason}`)),
      el('p', { class: 'faint' }, rich('힌트는 참고일 뿐입니다. 왜 그 수가 좋은지 스스로 설명할 수 있을 때 진짜 실력이 됩니다.')),
      el('div', { class: 'row' }, button('닫기', () => { setChildren(hintBox, ); view.setMarkers([]); view.render(); }, { class: 'btn-sm', variant: 'ghost' })),
    ));
  }

  /* ---------- 계가 ---------- */

  function toggleDead(idx) {
    if (game.board.cells[idx] === EMPTY) return;
    const g = game.board.group(idx);
    const next = new Set(deadStones || []);
    const isDead = next.has(g.stones[0]);
    for (const s of g.stones) { if (isDead) next.delete(s); else next.add(s); }
    deadStones = next;
    showScore();
  }

  function endGame() {
    if (clockTimer) clearInterval(clockTimer);
    if (game.result && game.result.by) {
      finishWith(game.result, null);
      return;
    }
    scoringMode = true;
    deadStones = estimateDeadStones(game.board);
    showScore();
  }

  function showScore() {
    const s = score(game.board, {
      komi: game.komi, rules: 'territory', dead: deadStones, prisoners: game.board.prisoners,
    });
    view.setBoard(game.board).setDeadStones(deadStones).setTerritory(s.territory).setInteractive(true);
    view.render();
    setChildren(infoBox, card(
      el('h3', { text: '계가' }),
      el('p', { class: 'faint' }, rich('죽은 돌로 보이는 돌은 흐리게 표시됩니다. **판정이 다르면 그 돌을 눌러 살았다/죽었다를 바꿀 수 있습니다.**')),
      el('dl', { class: 'kv' },
        el('dt', { text: '흑' }), el('dd', { text: `${s.black}집` }),
        el('dt', { text: '백' }), el('dd', { text: `${s.white}집 (덤 ${s.komi} 포함)` }),
      ),
      // 빅이 있으면 왜 그 자리가 집이 아닌지 그 자리에서 설명한다(요구사항 67·79).
      s.sekiGroups > 0
        ? el('p', { class: 'faint' }, rich(
          `**빅**에 걸린 무리가 ${s.sekiGroups}개 있습니다. 한국식 계가에서는 **빅 안의 빈 점을 집으로 세지 않습니다** — `
          + `서로 손댈 수 없어 남은 자리이지 둘러싸서 얻은 집이 아니기 때문입니다.`
          + (s.sekiPoints > 0 ? ` 이번 판에서는 ${s.sekiPoints}점이 빠졌습니다(반면의 빈 네모).` : ''),
        ))
        : null,
      el('h2', { text: s.text, style: { marginTop: '10px' } }),
      el('div', { class: 'row' },
        button('이 결과로 마치기', () => finishWith({
          winner: s.winner, by: 'score', text: s.text,
        }, s), { variant: 'primary' }),
      ),
    ));
    refresh();
  }

  function finishWith(result, scoreInfo) {
    scoringMode = false;
    view.setInteractive(false);
    const won = result.winner === myColor;
    app.progress.recordGame({
      aiKyu: cfg.aiKyu, myColor, handicap: cfg.handicap,
      result: { won, text: result.text }, moves: game.moveNumber, sgf: game.toSGF({
        playerBlack: myColor === BLACK ? '나' : `컴퓨터(${cfg.aiKyu}급)`,
        playerWhite: myColor === WHITE ? '나' : `컴퓨터(${cfg.aiKyu}급)`,
      }),
    });
    // 스테이지의 실전 대국 단계에서 온 대국이면 결과를 그 단계에 돌려준다(LEVEL 99).
    const stageMatch = app.transfer.stageMatch;
    if (stageMatch && won) app.progress.recordStageMatch(stageMatch.levelId);
    setChildren(infoBox, card(
      el('h2', { text: won ? '이겼습니다!' : '졌습니다' }),
      el('p', { text: result.text }),
      stageMatch
        ? el('p', { class: 'faint', text: won
          ? `LEVEL ${stageMatch.levelId}의 실전 대국을 통과했습니다.`
          : `LEVEL ${stageMatch.levelId}의 실전 대국은 아직 통과하지 못했습니다. 복기하고 다시 도전해 보세요.` })
        : null,
      el('div', { class: 'row' },
        button('복기하기', () => app.go('/review', {
          reviewGame: { game, myColor, aiKyu: cfg.aiKyu },
        }), { variant: 'primary' }),
        stageMatch
          ? button('스테이지로 돌아가기', () => {
            const id = stageMatch.levelId;
            app.transfer.stageMatch = null;
            app.go(`/stage/${id}`);
          }, {})
          : button('한 판 더', () => app.go('/play'), {}),
        button('메인으로', () => app.go('/menu'), { variant: 'ghost' }),
      ),
    ));
    refresh();
  }

  // 접바둑이면 백(컴퓨터)이 먼저 둔다
  refresh();
  startClock();
  if (game.turn === aiColor) setTimeout(() => maybeAIMove(), 300);

  return el('div', {},
    topbar(app, '자유대국', cfg.teacher ? badge('선생님 대국') : null),
    el('div', { class: 'wrap wide' },
      el('div', { class: 'play-layout' },
        el('div', { class: 'board-wrap' }, canvas),
        el('div', { class: 'side' },
          card(status),
          controls,
          hintBox,
          infoBox,
        ),
      ),
    ),
  );
}

/* ------------------------------------------------------------------ *
 * 복기
 * ------------------------------------------------------------------ */

export function reviewScreen(app) {
  const data = app.transfer.reviewGame;
  if (!data) { app.go('/menu'); return el('div'); }
  const { game, myColor, aiKyu } = data;
  const size = game.size;

  const canvas = el('canvas', { class: 'board locked' });
  const view = new BoardView(canvas, { size, showCoordinates: true });
  view.setInteractive(false);
  requestAnimationFrame(() => view.render());
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => view.render()) : null;
  if (ro) ro.observe(canvas);

  const listBox = el('div', { class: 'movelist' });
  const detail = el('div', {});
  const progressBox = el('div', {});
  let notes = [];
  let moments = [];
  let cursor = 0;

  function showAt(n) {
    cursor = Math.max(0, Math.min(n, game.moves.length));
    const board = game.boardAt(cursor);
    view.setBoard(board);
    const m = game.moves[cursor - 1];
    view.setLastMove(m && m.idx >= 0 ? m.idx : -1);
    const note = notes.find((x) => x.n === cursor);
    view.setMarkers(note && note.best && note.best.move !== note.move
      ? [{ at: note.best.move, type: 'label', text: '★', color: '#2e7d4f' }]
      : []);
    view.render();
    renderDetail(note);
    highlight();
  }

  function renderDetail(note) {
    if (!note) {
      setChildren(detail, el('p', { class: 'faint', text: cursor === 0 ? '시작 국면입니다.' : '이 수는 분석하지 않았습니다.' }));
      return;
    }
    setChildren(detail, card(
      el('div', { class: 'row between' },
        el('h3', { text: `${note.n}수 ${COLOR_NAME[note.color]} ${note.label}`, style: { margin: 0 } }),
        el('span', { style: { fontSize: '1.2rem' }, title: note.mark.label, text: note.mark.icon }),
      ),
      note.category ? badge(note.category) : null,
      note.comment ? el('p', {}, rich(note.comment)) : null,
      note.best && note.best.move !== note.move
        ? el('p', { class: 'faint' }, rich(`★ 표시가 AI 추천수 **${note.best.label}** 입니다.`))
        : null,
      note.category && note.color === myColor
        ? button('이 장면을 내 문제로 저장', () => {
            const p = toProblem(note, { size, gameId: game.moves.length, playerName: '나' });
            if (!p) { toast('이 장면은 문제로 만들 수 없습니다.', 'bad'); return; }
            const saved = app.progress.addMyProblem(p);
            toast(saved ? '"내 대국에서 나온 문제"에 저장했습니다.' : '이미 저장된 장면입니다.');
          }, { class: 'btn-sm' })
        : null,
    ));
  }

  function highlight() {
    for (const row of listBox.querySelectorAll('.move-row')) {
      row.classList.toggle('active', Number(row.dataset.n) === cursor);
    }
  }

  function renderList() {
    setChildren(listBox, ...game.moves.map((m, i) => {
      const n = i + 1;
      const note = notes.find((x) => x.n === n);
      return el('div', {
        class: 'move-row', dataset: { n: String(n) },
        onclick: () => showAt(n),
      },
        el('span', { class: 'n', text: String(n) }),
        el('span', { class: 'mk', text: note ? note.mark.icon : '' }),
        el('span', { text: `${m.color === BLACK ? '⚫' : '⚪'} ${m.idx === PASS ? '패스' : m.idx === RESIGN ? '기권' : m.label}` }),
      );
    }));
    highlight();
  }

  async function analyze() {
    const analyst = new LocalBasicAI({ kyu: Math.max(1, Math.min(3, aiKyu)), seed: 7 });
    const bar = progressBar(0, '0%');
    setChildren(progressBox, card(el('p', { text: '대국을 분석하고 있습니다…' }), bar));
    notes = await analyzeGame(game, analyst, {
      onlyColor: myColor,
      onProgress: async (i, total) => {
        const fill = bar.querySelector('.progress-fill');
        const label = bar.querySelector('.progress-label');
        if (fill) fill.style.width = `${Math.round((i / total) * 100)}%`;
        if (label) label.textContent = `${Math.round((i / total) * 100)}%`;
        if (i % 6 === 0) await new Promise((r) => setTimeout(r, 0));
      },
    });
    moments = keyMoments(notes, 8);
    const sum = summarize(notes);

    setChildren(progressBox, card(
      el('h3', { text: '내 수 요약' }),
      el('p', {}, sum.text || '분석할 수가 없습니다.'),
      el('h3', { text: '중요한 장면', style: { marginTop: '12px' } }),
      moments.length === 0
        ? el('p', { class: 'faint', text: '특별히 짚을 장면이 없습니다. 무난한 대국이었습니다.' })
        : el('div', {}, ...moments.map((m) => el('div', {
            class: 'move-row',
            onclick: () => showAt(m.n),
          },
            el('span', { class: 'mk', text: m.mark.icon }),
            el('span', {}, `${m.n}수 ${m.label} — ${m.category || m.mark.label}`),
          ))),
      moments.length
        ? button('중요 장면 모두 내 문제로 저장', () => {
            let saved = 0;
            for (const m of moments) {
              if (!m.category || m.color !== myColor) continue;
              const p = toProblem(m, { size, gameId: game.moves.length, playerName: '나' });
              if (p && app.progress.addMyProblem(p)) saved++;
            }
            toast(saved ? `${saved}개를 저장했습니다.` : '새로 저장할 장면이 없습니다.');
          }, { class: 'btn-sm', variant: 'primary' })
        : null,
    ));
    renderList();
    showAt(game.moves.length);
  }

  renderList();
  showAt(0);
  setTimeout(analyze, 50);

  return el('div', {},
    topbar(app, '복기'),
    el('div', { class: 'wrap wide' },
      el('div', { class: 'play-layout' },
        el('div', {},
          el('div', { class: 'board-wrap' }, canvas),
          el('div', { class: 'row', style: { justifyContent: 'center', marginTop: '10px' } },
            button('⏮', () => showAt(0), { class: 'btn-sm' }),
            button('◀ 10', () => showAt(cursor - 10), { class: 'btn-sm' }),
            button('◀', () => showAt(cursor - 1), { class: 'btn-sm' }),
            button('▶', () => showAt(cursor + 1), { class: 'btn-sm' }),
            button('10 ▶', () => showAt(cursor + 10), { class: 'btn-sm' }),
            button('⏭', () => showAt(game.moves.length), { class: 'btn-sm' }),
          ),
          detail,
        ),
        el('div', { class: 'side' },
          progressBox,
          card(el('h3', { text: '기보' }), listBox),
          el('div', { class: 'row' },
            button('SGF 복사', () => {
              navigator.clipboard?.writeText(game.toSGF({})).then(
                () => toast('기보를 클립보드에 복사했습니다.'),
                () => toast('복사에 실패했습니다.', 'bad'),
              );
            }, { class: 'btn-sm' }),
            button('메인으로', () => app.go('/menu'), { class: 'btn-sm', variant: 'ghost' }),
          ),
        ),
      ),
    ),
  );
}
