/**
 * 실제 브라우저로 LEVEL을 처음부터 끝까지 플레이해 보는 통합 테스트.
 *   node tools/playthrough.js [기본주소] [끝 LEVEL]
 *
 * 개념 → 따라 두기 → 문제 → BOSS 를 전부 통과해 별을 받고 다음 LEVEL이 열리는지까지 확인한다.
 * 정답 좌표는 규칙 엔진에서 직접 구하므로 테스트에 정답을 적어 두지 않는다.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8099';
const LAST = Number(process.argv[3] || 20);

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

/**
 * 브라우저 안에서 규칙 엔진에 물어 **지금 진행 중인** 문제의 정답 좌표를 구한다.
 * 축처럼 여러 수에 걸친 문제는 매 수 국면이 달라지므로, 화면에 살아 있는
 * 세션의 현재 반면을 그대로 읽어야 한다.
 */
async function solutionsFor() {
  return page.evaluate(async () => {
    const cv = document.querySelector('canvas.board');
    const s = cv && cv.__problemSession;
    if (!s) return null;
    const { findSolutions } = await import('/js/game/problem.js');
    return findSolutions(s.problem, s.board, s.userColor, s.size);
  });
}

async function clickPoint(idx) {
  const pos = await page.evaluate((i) => {
    const cv = document.querySelector('canvas.board');
    const v = cv && cv.__boardview;
    if (!v) return null;
    return v.centerOf(i);
  }, idx);
  if (!pos) throw new Error(`좌표 ${idx}를 화면에서 찾지 못했습니다`);
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(90);
}

async function currentStepType(levelId) {
  return page.evaluate(async ([id]) => {
    const { getLevel } = await import('/js/content/curriculum.js');
    const lv = getLevel(id);
    const chips = [...document.querySelectorAll('.step-chip')];
    const activeIndex = chips.findIndex((c) => c.classList.contains('active'));
    return { index: activeIndex, type: lv.steps[activeIndex]?.type || null, total: lv.steps.length };
  }, [levelId]);
}

const failures = [];
let played = 0;

for (let id = 1; id <= LAST; id++) {
  await page.goto(`${BASE}/#/stage/${id}`, { waitUntil: 'load' });
  await page.waitForTimeout(250);

  const title = await page.textContent('.topbar h1');
  if (!title || !title.includes(`LEVEL ${id}`)) {
    failures.push(`LEVEL ${id}: 열리지 않음 (${title})`);
    continue;
  }

  let guard = 0;
  while (guard++ < 40) {
    const st = await currentStepType(id);
    if (st.index < 0) break; // 스테이지 종료 화면

    if (st.type === 'concept') {
      await page.getByRole('button', { name: '다음 →' }).click();
    } else if (st.type === 'follow') {
      // 강조된 자리를 순서대로 누른다
      const seq = await page.evaluate(async ([lid, si]) => {
        const { getLevel } = await import('/js/content/curriculum.js');
        const { fromLabel } = await import('/js/engine/board.js');
        const step = getLevel(lid).steps[si];
        return step.sequence.map((s) => fromLabel(s.at, step.size || 19));
      }, [id, st.index]);
      for (const idx of seq) await clickPoint(idx);
      await page.waitForTimeout(700);
    } else if (st.type === 'quiz') {
      const answer = await page.evaluate(async ([lid, si]) => {
        const { getLevel } = await import('/js/content/curriculum.js');
        return getLevel(lid).steps[si].answer;
      }, [id, st.index]);
      await page.locator('.quiz-option').nth(answer).click();
      await page.waitForTimeout(150);
      await page.getByRole('button', { name: '다음 →' }).click();
    } else {
      const sols = await solutionsFor();
      if (!sols || sols.length === 0) { failures.push(`LEVEL ${id} 단계 ${st.index}: 정답 없음`); break; }
      await clickPoint(sols[0]);
      await page.waitForTimeout(200);
      const nextBtn = page.getByRole('button', { name: '다음 →' });
      if (await nextBtn.count()) {
        await nextBtn.first().click();
      } else {
        // 여러 수짜리 문제 — 남은 수를 이어서 둔다
        for (let k = 0; k < 30; k++) {
          const more = await solutionsFor();
          if (await page.getByRole('button', { name: '다음 →' }).count()) break;
          if (!more || !more.length) break;
          await clickPoint(more[0]);
          await page.waitForTimeout(120);
        }
        const btn = page.getByRole('button', { name: '다음 →' });
        if (await btn.count()) await btn.first().click();
        else { failures.push(`LEVEL ${id} 단계 ${st.index}: 문제를 끝내지 못함`); break; }
      }
    }
    await page.waitForTimeout(180);
  }

  // 스테이지 결과 확인
  const body = await page.textContent('.wrap');
  const starCount = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('div')].filter((d) => /^[★☆]{3}$/.test(d.textContent.trim()));
    return nodes.length ? nodes[0].textContent.trim() : null;
  });
  const cleared = await page.evaluate((lid) => window.baduk.progress.levelRecord(lid), id);
  if (!cleared || !cleared.cleared) {
    failures.push(`LEVEL ${id}: 통과하지 못함 (별 ${starCount || '?'})`);
  } else {
    played++;
    console.log(`  ok  LEVEL ${String(id).padStart(2)} 통과 — ${starCount || ''} ${cleared.stars}별`);
  }
}

const unlocked = await page.evaluate((last) => {
  let n = 0;
  for (let i = 1; i <= last; i++) if (window.baduk.progress.isUnlocked(i)) n++;
  return n;
}, LAST);
console.log(`\n통과한 LEVEL ${played}/${LAST}, 열린 LEVEL ${unlocked}/${LAST}`);
if (errors.length) {
  console.log('콘솔 오류:');
  for (const e of [...new Set(errors)].slice(0, 10)) console.log('  ! ' + e.slice(0, 200));
}
for (const f of failures) console.log('FAIL ' + f);

await browser.close();
process.exit(failures.length || errors.length ? 1 : 0);
