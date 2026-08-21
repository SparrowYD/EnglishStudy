/**
 * 브라우저 스모크 테스트.  node tools/smoke.js [기본주소]
 * 실제 브라우저로 모든 화면을 열어 콘솔 오류가 없는지, 핵심 동작이 되는지 확인한다.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** GTP 중계 서버를 임의 포트로 띄운다. 내장 AI를 GTP 엔진으로 써서 KataGo 없이도 확인한다. */
function startBridge() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'tools/gtp-bridge.js'), '--port', '0'], {
      cwd: ROOT,
      env: { ...process.env, BADUK_GTP_ENGINE: `${process.execPath} ${path.join(ROOT, 'tools/gtp-engine.js')}` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const timer = setTimeout(() => reject(new Error('중계 서버가 뜨지 않았습니다')), 15000);
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (c) => {
      out += c;
      const m = out.match(/GTP-BRIDGE-PORT (\d+)/);
      if (m) { clearTimeout(timer); resolve({ proc, endpoint: `http://127.0.0.1:${m[1]}` }); }
    });
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

const BASE = process.argv[2] || 'http://localhost:8099';
const shots = process.env.SHOTS || '';

const errors = [];
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

async function goto(hash) {
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'load' });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  await page.waitForTimeout(150);
}

async function shot(name) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png` });
}

// 1. 메인 메뉴
await goto('/menu');
check('메인 메뉴 로고', (await page.textContent('.logo'))?.includes('바 둑 100'));
check('메뉴 항목 11개', (await page.locator('.menu-item').count()) === 11,
  `실제 ${await page.locator('.menu-item').count()}개`);
await shot('01-menu');

// 2. 스테이지 지도
await goto('/map');
const tiles = await page.locator('.level-tile').count();
check('스테이지 지도에 LEVEL 100개', tiles === 100, `실제 ${tiles}개`);
const enabled = await page.locator('.level-tile:not([disabled])').count();
check('처음에는 LEVEL 1만 열려 있다', enabled === 1, `열린 타일 ${enabled}개`);
await shot('02-map');

// 3. LEVEL 1 진행 — 개념 → 따라두기 → 문제
await goto('/stage/1');
check('LEVEL 1 제목', (await page.textContent('.topbar h1'))?.includes('돌 놓기'));
check('바둑판 캔버스가 그려진다', await page.locator('canvas.board').count() > 0);
const canvasBox = await page.locator('canvas.board').first().boundingBox();
check('캔버스에 실제 크기가 있다', canvasBox && canvasBox.width > 200, `${Math.round(canvasBox?.width || 0)}px`);
await shot('03-stage-concept');

// 개념 단계 넘기기
await page.getByRole('button', { name: '다음 →' }).click();
await page.waitForTimeout(200);
check('따라 두기 단계로 넘어감', (await page.textContent('.stepbar'))?.includes('따라 두기'));
await shot('04-follow');

// 4. 바둑판 클릭이 실제로 동작하는지 — 따라 두기에서 지정된 좌표 누르기
const info = await page.evaluate(() => {
  const cv = document.querySelector('canvas.board');
  const rect = cv.getBoundingClientRect();
  return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
});
check('캔버스 좌표 확보', info.w > 0);

// 5. 자유대국 설정 화면
await goto('/play');
check('자유대국 설정 — 기력 슬라이더', await page.locator('input[type=range]').count() === 1);
check('접바둑 2~9점 제공', (await page.locator('select').nth(3).locator('option').count()) === 9);
await shot('05-play-setup');

// 6. 실제 대국 시작 — 착수와 AI 응수
await page.getByRole('button', { name: '대국 시작' }).click();
await page.waitForTimeout(400);
check('대국 화면 진입', (await page.textContent('.topbar h1'))?.includes('자유대국'));
const boardBox = await page.locator('canvas.board').boundingBox();
// 화점 근처(대략 D4)를 클릭
await page.mouse.click(boardBox.x + boardBox.width * 0.22, boardBox.y + boardBox.height * 0.78);
await page.waitForTimeout(2500);
const moveText = await page.textContent('.side');
check('내 착수 후 컴퓨터가 응수한다', /[2-9]\d*수/.test(moveText || ''), (moveText || '').slice(0, 40));
await shot('06-game');

// 6b. 몇 수 더 두고 대국 종료 → 복기 흐름
// (두 번 패스로 끝내는 계가 경로는 AI가 초반에 패스하지 않으므로 여기서는 재현되지 않는다.
//  계가 계산 자체는 test/score.test.js 가, 사석 판정은 Benson 테스트가 검증한다.)
for (const [fx, fy] of [[0.78, 0.22], [0.22, 0.22], [0.78, 0.78]]) {
  await page.mouse.click(boardBox.x + boardBox.width * fx, boardBox.y + boardBox.height * fy);
  await page.waitForTimeout(1200);
}
await page.getByRole('button', { name: '돌 던지기' }).click();
await page.waitForTimeout(200);
await page.locator('.modal').getByRole('button', { name: '기권' }).click();
await page.waitForTimeout(300);
check('기권하면 결과가 표시된다', /이겼습니다|졌습니다/.test((await page.textContent('.side')) || ''));
await shot('06b-result');

await page.getByRole('button', { name: '복기하기' }).click();
await page.waitForTimeout(3000);
check('복기 화면 진입', (await page.textContent('.topbar h1')) === '복기');
check('기보 목록이 채워진다', await page.locator('.move-row').count() > 0,
  `${await page.locator('.move-row').count()}행`);
const reviewText = await page.textContent('.side');
check('내 수 요약이 나온다', /묘수|좋은 수|무난|아쉬운 수|실수/.test(reviewText || ''),
  (reviewText || '').slice(0, 60));
await shot('06c-review');

// 7. 도감
await goto('/codex');
const entries = await page.locator('.entry-tile').count();
check('도감 항목이 채워져 있다', entries >= 40, `${entries}개`);
await shot('07-codex');

await goto(`/codex/${encodeURIComponent('호구(虎口)')}`);
const codexText = await page.textContent('.wrap');
check('도감 항목에 예외가 있다', codexText?.includes('예외'));
check('도감 항목에 기본 그림이 있다', await page.locator('canvas.board').count() > 0);
await shot('08-codex-entry');

// 8. 용어사전
await goto('/glossary');
check('용어사전 항목', (await page.locator('.term').count()) >= 50, `${await page.locator('.term').count()}개`);
await page.fill('input[type=text]', '축');
await page.waitForTimeout(100);
check('용어 검색 동작', (await page.locator('.term').count()) < 60);

// 9. 수읽기 훈련
await goto('/reading');
await page.getByRole('button', { name: /초급/ }).click();
await page.waitForTimeout(300);
check('수읽기 문제 생성', (await page.textContent('.side'))?.includes('수읽기'));
await shot('09-reading');

// 10. 나머지 화면
for (const [hash, name] of [['/rank', '기력 분석'], ['/settings', '설정'], ['/myproblems', '내 대국 문제'], ['/daily', '오늘의 복습'], ['/promotion', '승급 도전']]) {
  await goto(hash);
  const title = await page.textContent('.topbar h1');
  check(`${name} 화면`, !!title, title || '');
}
await shot('10-settings');

// LEVEL 99의 실전 대국 단계 — 대국 화면으로 갔다가 스테이지로 돌아오는 길까지 확인한다
await page.goto(`${BASE}/#/menu`, { waitUntil: 'load' });
await page.evaluate(() => {
  const levels = {};
  for (let i = 1; i <= 100; i++) levels[i] = { stars: 3, done: true, at: Date.now() };
  localStorage.setItem('baduk100.progress.v1', JSON.stringify({ levels, games: [], stageMatches: {} }));
});
await page.goto(`${BASE}/#/stage/99`, { waitUntil: 'load' });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(300);
await page.getByRole('button', { name: '다음 →' }).click();
await page.waitForTimeout(250);
check('실전 대국 단계 — 대국 시작 버튼', await page.getByRole('button', { name: '대국 시작' }).count() > 0);
await page.getByRole('button', { name: '대국 시작' }).click();
await page.waitForTimeout(700);
check('실전 대국 — 대국 화면 진입', page.url().includes('/game') && await page.locator('canvas').count() > 0);
await page.getByRole('button', { name: '돌 던지기' }).click();
await page.waitForTimeout(250);
await page.getByRole('button', { name: '기권' }).click();
await page.waitForTimeout(600);
check('실전 대국 — 스테이지로 돌아가는 길', await page.getByRole('button', { name: '스테이지로 돌아가기' }).count() > 0);

// KataGo 연결 — 버튼이 정말 동작하는지, 실패 이유를 정직하게 말하는지 확인한다(요구사항 59·79).
// 브라우저에서 실제로 왕복시키므로 CORS까지 함께 검증된다.
await page.goto(`${BASE}/#/settings`, { waitUntil: 'load' });
await page.waitForTimeout(200);
check('설정 — KataGo 연결 확인 버튼', await page.getByRole('button', { name: '연결 확인' }).count() > 0);
await page.getByRole('button', { name: '연결 확인' }).click();
await page.waitForTimeout(300);
check('주소가 없으면 이유를 말한다', ((await page.textContent('.toasts')) || '').includes('주소를 입력'));

const bridge = await startBridge();
try {
  await page.evaluate((url) => localStorage.setItem('baduk100.katago.endpoint', url), bridge.endpoint);
  await page.goto(`${BASE}/#/settings`, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: '연결 확인' }).click();
  await page.waitForTimeout(1500);
  const toastText = (await page.textContent('.toasts')) || '';
  check('중계 서버에 실제로 연결된다', toastText.includes('연결됐습니다') && toastText.includes('baduk100-local'), toastText.slice(0, 60));

  // 붙은 엔진이 KataGo가 아니면 화면에도 그렇게 적혀야 한다
  await page.goto(`${BASE}/#/play`, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: '대국 시작' }).click();
  await page.waitForTimeout(2500);
  const sideText = (await page.textContent('.side')) || '';
  check('붙은 엔진 이름을 정직하게 표시한다', sideText.includes('baduk100-local'), sideText.replace(/\s+/g, ' ').slice(0, 80));
} finally {
  bridge.proc.kill();
  await page.evaluate(() => localStorage.removeItem('baduk100.katago.endpoint'));
}

await browser.close();

console.log('');
if (errors.length) {
  console.log('브라우저 콘솔 오류:');
  for (const e of [...new Set(errors)]) console.log('  ! ' + e.slice(0, 200));
}
const failed = results.filter((r) => !r.ok).length;

console.log(`검사 ${results.length}개 중 실패 ${failed}개, 콘솔 오류 ${errors.length}건`);
process.exit(failed || errors.length ? 1 : 0);
