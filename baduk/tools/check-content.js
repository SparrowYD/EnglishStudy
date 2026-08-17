// 콘텐츠 진단 CLI: node tools/check-content.js
import { CHAPTER1 } from '../js/content/ch1.js';
import { validateAll } from '../js/content/validate.js';

let chapters = [CHAPTER1];
for (const f of ['ch2','ch3','ch4','ch5']) {
  try { const m = await import(`../js/content/${f}.js`); chapters.push(Object.values(m)[0]); } catch {}
}

let bad = 0, total = 0;
for (const levels of chapters) {
  for (const r of validateAll(levels)) {
    if (r.errors.length) { bad++; console.log(`LEVEL ${r.id} ${r.title}: ${r.errors.join(' | ')}`); }
    for (const p of r.problems) {
      total++;
      if (!p.ok) { bad++; console.log(`  [${p.ctx}] ${p.id}: ${p.errors.join(' | ')}`); }
      else console.log(`  ok ${p.id.padEnd(10)} 정답 ${p.solutions.length}개: ${p.solutions.slice(0,8).join(' ')}${p.solutions.length>8?' …':''}`);
    }
  }
}
console.log(`\n문제 ${total}개, 문제 있는 항목 ${bad}개`);
