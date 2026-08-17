/**
 * 바둑 100 — 진입점과 라우터.
 * 화면은 해시 경로로 전환한다(#/menu, #/stage/3 …). 서버도 빌드도 필요 없다.
 */

import { Progress } from './game/progress.js';
import { el, clear, toast } from './ui/ui.js';
import { menuScreen, rankScreen, settingsScreen, promotionScreen } from './ui/screens/menu.js';
import { stageMapScreen, stageScreen } from './ui/screens/stage.js';
import { freePlaySetupScreen, freePlayScreen, reviewScreen } from './ui/screens/play.js';
import { codexScreen, codexEntryScreen, glossaryScreen, readingScreen, myProblemsScreen, dailyReviewScreen } from './ui/screens/library.js';

const ROUTES = [
  [/^\/?$|^\/menu$/, () => menuScreen],
  [/^\/map$/, () => stageMapScreen],
  [/^\/stage\/(\d+)$/, () => stageScreen],
  [/^\/play$/, () => freePlaySetupScreen],
  [/^\/game$/, () => freePlayScreen],
  [/^\/review$/, () => reviewScreen],
  [/^\/codex$/, () => codexScreen],
  [/^\/codex\/(.+)$/, () => codexEntryScreen],
  [/^\/glossary$/, () => glossaryScreen],
  [/^\/reading$/, () => readingScreen],
  [/^\/myproblems$/, () => myProblemsScreen],
  [/^\/daily$/, () => dailyReviewScreen],
  [/^\/rank$/, () => rankScreen],
  [/^\/settings$/, () => settingsScreen],
  [/^\/promotion$/, () => promotionScreen],
];

export const app = {
  progress: Progress.load(),
  root: null,
  /** 화면 간에 넘겨야 하는 값(진행 중인 대국, 복기 자료 등). */
  transfer: {},

  go(path, data) {
    if (data) this.transfer = { ...this.transfer, ...data };
    if (location.hash === `#${path}`) this.render();
    else location.hash = path;
  },

  back() { history.length > 1 ? history.back() : this.go('/menu'); },

  render() {
    const path = location.hash.replace(/^#/, '') || '/menu';
    let screen = null;
    let params = [];
    for (const [re, get] of ROUTES) {
      const m = path.match(re);
      if (m) { screen = get(); params = m.slice(1); break; }
    }
    if (!screen) { location.hash = '/menu'; return; }
    clear(this.root);
    try {
      const node = screen(this, params);
      this.root.appendChild(node);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      this.root.appendChild(el('div', { class: 'wrap' },
        el('h1', { text: '화면을 여는 중 문제가 생겼습니다' }),
        el('pre', { class: 'muted', text: String(err && err.stack || err) }),
        el('button', { class: 'btn', onclick: () => this.go('/menu') }, '메인으로'),
      ));
    }
  },
};

function boot() {
  app.root = document.getElementById('app');
  window.addEventListener('hashchange', () => app.render());
  window.addEventListener('resize', () => {
    if (app.onResize) app.onResize();
  });
  app.render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

// 개발 중 콘솔에서 상태를 들여다볼 수 있게 열어 둔다
if (typeof window !== 'undefined') window.baduk = app;
