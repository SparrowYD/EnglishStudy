/** 메인 메뉴 · 기력 분석 · 승급 도전 · 설정 (요구사항 77·62·63). */

import { el, button, card, section, stars, progressBar, rich, toast, confirmDialog, badge } from '../ui.js';
import { rankAnalysis, pointsForKyu } from '../../game/progress.js';
import { LEVELS, TOTAL_LEVELS, IMPLEMENTED } from '../../content/curriculum.js';
import { RANK_DISCLAIMER, RANK_NOTES, KYU_LIST } from '../../ai/ranks.js';
import { generateLadderProblem } from '../../game/reading.js';
import { KataGoAdapter } from '../../ai/KataGoAdapter.js';

export function topbar(app, title, extra) {
  return el('div', { class: 'topbar' },
    button('← 뒤로', () => app.go('/menu'), { variant: 'ghost', class: 'btn-sm' }),
    el('h1', { text: title }),
    el('div', { class: 'spacer' }),
    extra || null,
  );
}

export function menuScreen(app) {
  const p = app.progress;
  const nextId = p.nextLevelId(TOTAL_LEVELS);
  const totalStars = p.totalStars();
  const due = p.dueReviews().length;
  const myProblems = p.state.myProblems.filter((x) => !x.solved).length;

  const item = (icon, label, sub, path, opts = {}) => el('button', {
    class: `menu-item ${opts.primary ? 'primary' : ''}`.trim(),
    onclick: () => app.go(path),
  },
    el('span', { class: 'icon', text: icon }),
    el('span', { class: 'grow' },
      el('div', { class: 'label', text: label }),
      sub ? el('div', { class: 'sub', text: sub }) : null,
    ),
    opts.count ? badge(String(opts.count)) : null,
  );

  return el('div', { class: 'wrap' },
    el('div', { class: 'title-block' },
      el('div', { class: 'logo', text: '바 둑 100' }),
      el('div', { class: 'tagline', text: '100단계로 배우는 바둑' }),
    ),
    el('div', { class: 'rule-line' }),

    el('div', { class: 'status-strip' },
      el('div', { class: 'cell' },
        el('div', { class: 'k', text: '현재 예상 기력' }),
        el('div', { class: 'v', text: `${p.kyu}급` }),
      ),
      el('div', { class: 'cell' },
        el('div', { class: 'k', text: 'LEVEL' }),
        el('div', { class: 'v' }, `${p.clearedCount()}`, el('small', { text: ` / ${TOTAL_LEVELS}` })),
      ),
      el('div', { class: 'cell' },
        el('div', { class: 'k', text: '총 별' }),
        el('div', { class: 'v' }, `${totalStars}`, el('small', { text: ` / ${TOTAL_LEVELS * 3}` })),
      ),
    ),

    el('div', { class: 'menu-list' },
      item('▶', '이어서 학습', `LEVEL ${nextId} · ${levelTitle(nextId)}`, `/stage/${nextId}`, { primary: true }),
      item('🗺', '100단계 스테이지', `${IMPLEMENTED.size}단계 플레이 가능`, '/map'),
      item('🥋', '승급 도전', p.canTakePromotion() ? `${p.kyu}급 → ${p.kyu - 1}급 승급전을 볼 수 있습니다` : `다음 승급까지 ${Math.round(p.promotionProgress() * 100)}%`, '/promotion'),
      item('⚫', '컴퓨터와 자유대국', '19×19 · 18급~1급 · 접바둑 · 복기', '/play'),
      item('🧠', '수읽기 훈련', '머릿속으로 먼저 읽고 수순을 제출', '/reading'),
      item('🧩', '오늘의 복습', due ? `복습할 문제 ${due}개` : '간격을 두고 다시 풀어 봅니다', '/daily', { count: due || 0 }),
      item('📌', '내 대국에서 나온 문제', myProblems ? `${myProblems}개 남음` : '실전 실수가 자동으로 문제가 됩니다', '/myproblems', { count: myProblems || 0 }),
      item('📖', '바둑 공식 도감', '형태·테수지·격언을 원리와 예외까지', '/codex'),
      item('📚', '바둑 용어사전', '용어를 짧게 찾아보기', '/glossary'),
      item('📊', '나의 기력 분석', '무엇이 늘었고 무엇이 부족한가', '/rank'),
      item('⚙', '설정', '', '/settings'),
    ),

    el('p', { class: 'faint center', style: { marginTop: '18px' } },
      rich(RANK_DISCLAIMER)),
  );
}

function levelTitle(id) {
  const lv = LEVELS.find((l) => l.id === id);
  return lv ? lv.title : '준비 중';
}

/* ------------------------------------------------------------------ */

export function rankScreen(app) {
  const a = rankAnalysis(app.progress, TOTAL_LEVELS);
  const sug = app.progress.difficultySuggestion();
  const games = app.progress.recentGames(10);

  return el('div', {}, topbar(app, '나의 기력 분석'), el('div', { class: 'wrap' },
    card(
      el('div', { class: 'row between' },
        el('div', {},
          el('div', { class: 'faint', text: '현재 예상 기력' }),
          el('div', { style: { fontSize: '2.1rem', fontWeight: 800 }, text: `${a.kyu}급` }),
        ),
        el('div', { style: { maxWidth: '320px', flex: 1 } },
          el('div', { class: 'faint', text: `다음 승급까지` }),
          progressBar(a.progress, `${Math.round(a.progress * 100)}%`),
          el('div', { class: 'faint', text: `${app.progress.state.points} / ${pointsForKyu(a.kyu)}점` }),
        ),
      ),
      el('p', { class: 'faint', style: { marginTop: '10px' } }, rich(RANK_NOTES[a.kyu] || '')),
      a.canPromote
        ? el('div', { class: 'row', style: { marginTop: '10px' } },
            button('승급전 보러 가기', () => app.go('/promotion'), { variant: 'primary' }))
        : null,
    ),

    section('무엇이 반영되었나',
      card(...a.factors.map((f) => el('div', { style: { marginBottom: '10px' } },
        el('div', { class: 'row between' },
          el('span', { text: f.label }),
          el('strong', { text: f.value }),
        ),
        progressBar(f.ratio || 0),
      ))),
    ),

    section('최근 자유대국',
      card(
        games.length === 0
          ? el('p', { class: 'muted', text: '아직 자유대국 기록이 없습니다.' })
          : el('div', {}, ...games.slice().reverse().map((g) => el('div', { class: 'row between', style: { borderBottom: '1px solid var(--line)', padding: '6px 0' } },
              el('span', { text: `${g.aiKyu}급 상대 · ${g.handicap ? `${g.handicap}점 접바둑` : '맞바둑'}` }),
              el('strong', { style: { color: g.won ? 'var(--good)' : 'var(--ink-dim)' }, text: g.won ? '승' : '패' }),
            ))),
        sug.suggest
          ? el('div', { class: 'notice', style: { marginTop: '12px' } },
              rich(`최근 ${sug.sample}판 승률 ${Math.round(sug.winRate * 100)}%. ${sug.text}`))
          : null,
      ),
    ),

    el('p', { class: 'faint' }, rich(RANK_DISCLAIMER)),
  ));
}

/* ------------------------------------------------------------------ */

/**
 * 승급전 (요구사항 63).
 * 사활 3 · 맥 3 · 행마 2 · 포석 2 문제 + AI 대국 1판이 원래 구성이지만,
 * 지금은 사활·포석 LEVEL이 준비 중이므로 **있는 범위 안에서만** 출제하고
 * 빠진 분야는 화면에 그대로 밝힌다.
 */
export function promotionScreen(app) {
  const p = app.progress;
  if (!p.canTakePromotion()) {
    return el('div', {}, topbar(app, '승급 도전'), el('div', { class: 'wrap' },
      card(
        el('h2', { text: `${p.kyu}급 → ${p.kyu - 1}급` }),
        el('p', {}, rich('아직 승급전을 볼 수 없습니다. LEVEL을 진행하고 문제를 맞히면 학습 점수가 쌓입니다.')),
        progressBar(p.promotionProgress(), `${Math.round(p.promotionProgress() * 100)}%`),
        el('p', { class: 'faint', text: `${p.state.points} / ${pointsForKyu(p.kyu)}점` }),
        el('div', { class: 'row', style: { marginTop: '12px' } },
          button('스테이지로 가기', () => app.go('/map'), { variant: 'primary' }),
          button('자유대국', () => app.go('/play')),
        ),
      ),
    ));
  }

  const pool = collectExamProblems();
  const reading = generateLadderProblem('intermediate', Date.now());

  return el('div', {}, topbar(app, `${p.kyu}급 → ${p.kyu - 1}급 승급전`), el('div', { class: 'wrap' },
    card(
      el('h2', { text: '승급전 구성' }),
      el('ul', {},
        ...pool.map((s) => el('li', { text: `${s.label} ${s.items.length}문제` })),
        reading ? el('li', { text: '수읽기 1문제' }) : null,
        el('li', {}, el('span', { class: 'muted', text: '사활·포석 문제는 해당 LEVEL(51~80)이 준비되면 추가됩니다.' })),
      ),
      el('p', { class: 'faint' }, rich('한 문제라도 **정답 보기**를 쓰면 불합격입니다. 통과 기준은 80%입니다.')),
      el('div', { class: 'row' },
        button('승급전 시작', () => {
          const items = pool.flatMap((s) => s.items);
          if (reading) items.push(reading.problem);
          app.go('/stage/exam', {
            examSet: {
              title: `${p.kyu}급 → ${p.kyu - 1}급 승급전`,
              problems: items,
              onFinish: (passed) => {
                if (passed) {
                  const nk = p.promote();
                  toast(`축하합니다! ${nk}급으로 승급했습니다.`, 'good');
                } else {
                  p.failPromotion();
                  toast('아쉽습니다. 조금 더 연습한 뒤 다시 도전해 보세요.', 'bad');
                }
              },
            },
          });
        }, { variant: 'primary' }),
      ),
    ),
  ));
}

function collectExamProblems() {
  const pick = (levelIds, label, count) => {
    const items = [];
    for (const id of levelIds) {
      const lv = LEVELS.find((l) => l.id === id);
      if (!lv) continue;
      for (const s of lv.steps) {
        if (s.problem && items.length < count) items.push(s.problem);
      }
    }
    return { label, items };
  };
  return [
    pick([4, 5, 6, 8], '돌 잡기·단수', 3),
    pick([3, 14, 15, 16], '연결과 모양', 3),
    pick([12, 13, 17, 19], '행마', 2),
  ].filter((s) => s.items.length > 0);
}

/* ------------------------------------------------------------------ */

export function settingsScreen(app) {
  const p = app.progress;
  const s = p.settings;

  const toggle = (key, label, desc) => el('label', { class: 'check', style: { marginBottom: '10px' } },
    el('input', {
      type: 'checkbox',
      checked: !!s[key],
      onchange: (e) => { p.setSetting(key, e.target.checked); toast('저장했습니다.'); },
    }),
    el('span', {}, el('div', { text: label }), desc ? el('div', { class: 'faint', text: desc }) : null),
  );

  return el('div', {}, topbar(app, '설정'), el('div', { class: 'wrap' },
    section('대국',
      card(
        toggle('showCoordinates', '좌표 표시', '바둑판 가장자리에 A~T, 1~19를 표시합니다.'),
        toggle('confirmMove', '착수 전 확인', '한 번 더 눌러야 돌이 놓입니다. 실수 착수를 막아 줍니다.'),
        toggle('autoAdjustPrompt', '기력 조절 제안 받기', '최근 성적에 따라 컴퓨터 기력 조절을 제안합니다. 자동으로 바꾸지는 않습니다.'),
      ),
    ),

    section('KataGo 연결',
      card(
        el('p', { class: 'faint' }, rich('전문 엔진을 연결하면 자유대국과 복기의 정확도가 올라갑니다. 연결하지 않아도 내장 AI로 모든 기능을 쓸 수 있습니다.')),
        el('label', { class: 'field' },
          '중계 서버 주소',
          el('input', {
            type: 'text',
            placeholder: 'http://localhost:8088',
            value: readKataGo(),
            onchange: (e) => {
              const v = e.target.value.trim();
              try {
                if (v) localStorage.setItem('baduk100.katago.endpoint', v);
                else localStorage.removeItem('baduk100.katago.endpoint');
                toast(v ? '저장했습니다. 자유대국에서 연결을 시도합니다.' : '연결을 해제했습니다.');
              } catch { toast('브라우저 저장소를 쓸 수 없습니다.', 'bad'); }
            },
          }),
        ),
        el('div', { class: 'row', style: { marginTop: '10px' } },
          button('연결 확인', async (ev) => {
            const btn = ev.currentTarget;
            const endpoint = readKataGo();
            if (!endpoint) { toast('먼저 중계 서버 주소를 입력하세요.', 'bad'); return; }
            btn.disabled = true;
            const prev = btn.textContent;
            btn.textContent = '확인 중…';
            try {
              const adapter = new KataGoAdapter({ endpoint });
              const res = await adapter.available();
              // 되든 안 되든 **이유를 그대로** 보여 준다(요구사항 59·79).
              // 붙어 있는 것이 KataGo가 아니면 그 이름을 그대로 말한다.
              toast(
                res.ok ? `연결됐습니다. 자유대국에서 ${adapter.name}을(를) 씁니다.` : res.reason,
                res.ok ? 'good' : 'bad',
              );
            } finally {
              btn.disabled = false;
              btn.textContent = prev;
            }
          }),
        ),
        el('p', { class: 'faint' }, rich('중계 서버 띄우기: `node tools/gtp-bridge.js --katago <실행파일> --model <모델>`')),
        el('p', { class: 'faint' }, rich('KataGo가 없어도 중계 경로만 확인해 볼 수 있습니다: `node tools/gtp-bridge.js --engine node tools/gtp-engine.js`')),
      ),
    ),

    section('학습 기록',
      card(
        el('dl', { class: 'kv' },
          el('dt', { text: '깬 LEVEL' }), el('dd', { text: `${p.clearedCount()}개` }),
          el('dt', { text: '획득한 별' }), el('dd', { text: `${p.totalStars()}개` }),
          el('dt', { text: '푼 문제' }), el('dd', { text: `${p.state.stats.problemsAttempted}개` }),
          el('dt', { text: '자유대국' }), el('dd', { text: `${p.state.games.length}판` }),
        ),
        el('div', { class: 'row', style: { marginTop: '14px' } },
          button('학습 기록 내보내기', () => {
            const blob = JSON.stringify(p.state, null, 2);
            navigator.clipboard?.writeText(blob).then(
              () => toast('클립보드에 복사했습니다.'),
              () => toast('복사에 실패했습니다.', 'bad'),
            );
          }),
          button('모든 기록 지우기', () => confirmDialog(
            '정말 지울까요?',
            '깬 LEVEL, 별, 예상 기력, 대국 기록이 **모두 사라집니다.** 되돌릴 수 없습니다.',
            () => { p.reset(); toast('초기화했습니다.'); app.go('/menu'); },
            '지우기',
          ), { variant: 'danger' }),
        ),
      ),
    ),
  ));
}

function readKataGo() {
  try { return localStorage.getItem('baduk100.katago.endpoint') || ''; } catch { return ''; }
}
