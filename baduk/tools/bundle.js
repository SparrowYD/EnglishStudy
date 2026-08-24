#!/usr/bin/env node
/**
 * 한 파일짜리 바둑 100 만들기.
 *
 *   node tools/bundle.js            → dist/baduk100.html   (더블클릭으로 열리는 한 파일)
 *   node tools/bundle.js --fragment → dist/baduk100.frag.html (본문만 — 아티팩트용)
 *
 * 왜 필요한가.
 *   이 게임은 ES 모듈로 되어 있어서 `file://`로 열면 브라우저가 모듈을 못 읽는다.
 *   그래서 평소에는 tools/serve.js로 띄우는데, **아무 설치 없이 파일 하나만 열어 보고 싶은**
 *   사람에게는 그것마저 장벽이다. 이 도구는 모든 모듈과 CSS를 한 파일에 넣어 그 장벽을 없앤다.
 *
 * 어떻게.
 *   모듈을 blob:이나 data: URL로 바꾸는 방법은 페이지 정책(CSP)에 막히는 곳이 많다.
 *   그래서 **모듈을 그냥 함수로 감싸서** 아주 작은 등록기(registry)에 넣는다.
 *   인라인 <script> 하나만 남으므로 어디서 열어도 동작한다.
 *
 *   그 <script>에는 type="module"을 반드시 붙인다. 인라인이라 CSP에 걸리지 않으면서
 *   **원래와 같은 지연 실행(defer)**을 얻기 때문이다. 이것을 빼면 스크립트가 레이아웃보다
 *   먼저 돌아서 바둑판 캔버스가 1×1로 만들어진다(실제로 그렇게 한 번 틀렸다).
 *
 * 이 저장소의 모듈은 형태가 단순하다(이름 있는 import/export만 쓰고, 동적 import가 없다).
 * 그 전제가 깨지면 아래 assert가 소리를 낸다 — 조용히 잘못 묶이는 일은 없다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAGMENT = process.argv.includes('--fragment');
const ENTRY = 'js/app.js';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** './x.js' 같은 상대 경로를 저장소 기준 경로로 바꾼다. */
function resolveSpec(fromRel, spec) {
  if (!spec.startsWith('.')) throw new Error(`상대 경로가 아닌 import는 묶을 수 없습니다: ${spec} (${fromRel})`);
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
}

const IMPORT_RE = /^import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(async\s+function|function|class|const|let)\s+([A-Za-z0-9_$]+)/gm;
const EXPORT_LIST_RE = /^export\s*\{([^}]*)\}\s*;?[ \t]*$/gm;

function transform(rel, deps) {
  let src = read(rel);

  // 묶을 수 없는 형태를 먼저 걸러 낸다 — 조용히 틀리게 묶느니 여기서 멈춘다.
  for (const bad of [/^import\s+[^{\s]/m, /^export\s+default/m, /^export\s*\*/m, /\bimport\s*\(/]) {
    if (bad.test(src)) throw new Error(`${rel}: 번들러가 다루지 않는 import/export 형태가 있습니다 (${bad}).`);
  }

  const names = new Set();
  src = src.replace(IMPORT_RE, (_m, list, spec) => {
    const dep = resolveSpec(rel, spec);
    deps.push(dep);
    const bindings = list.split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ': '));
    return `const { ${bindings.join(', ')} } = __req(${JSON.stringify(dep)});`;
  });
  src = src.replace(EXPORT_DECL_RE, (_m, kind, name) => { names.add(name); return `${kind} ${name}`; });
  src = src.replace(EXPORT_LIST_RE, (_m, list) => {
    for (const n of list.split(',').map((s) => s.trim()).filter(Boolean)) names.add(n);
    return '';
  });

  const tail = [...names].map((n) => `  __exports[${JSON.stringify(n)}] = ${n};`).join('\n');
  return `__def(${JSON.stringify(rel)}, function (__exports, __req) {\n${src}\n${tail}\n});`;
}

/* 진입점에서 시작해 넓이 우선으로 모아 온다. */
const order = [];
const seen = new Set();
const queue = [ENTRY];
while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);
  const deps = [];
  const code = transform(rel, deps);
  order.push(code);
  for (const d of deps) if (!seen.has(d)) queue.push(d);
}

const RUNTIME = `
(function () {
  var __defs = {}, __mods = {};
  function __def(id, fn) { __defs[id] = fn; }
  function __req(id) {
    if (__mods[id]) return __mods[id];
    var fn = __defs[id];
    if (!fn) throw new Error('모듈을 찾을 수 없습니다: ' + id);
    var m = __mods[id] = {};
    fn(m, __req);
    return m;
  }
`;

const css = read('css/style.css');
const html = read('index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .trim();
// 조각(아티팩트)에서는 제목을 **이름만** 남긴다. 갤러리에서는 제목이 곧 이름이라,
// 줄표 뒤의 설명은 붙이지 않는 편이 알아보기 쉽다. 설명은 발행할 때 따로 넣는다.
const fullTitle = (html.match(/<title>([\s\S]*?)<\/title>/) || [, '바둑 100'])[1];
const title = FRAGMENT ? fullTitle.split(/\s+[—-]\s+/)[0].trim() : fullTitle;
// 파비콘은 data: URI 안에 '>'가 들어 있다(인라인 SVG). [^>]*로 잡으면 태그가 중간에서 잘리고,
// 잘린 <link>가 뒤따르는 <style>을 통째로 삼켜 **CSS가 하나도 적용되지 않는다**(실제로 그렇게 틀렸다).
// 그래서 태그가 한 줄에 있다는 사실을 이용해 줄 단위로 가져온다.
const icon = (html.match(/^.*<link rel="icon".*$/m) || [''])[0].trim();

const script = `${RUNTIME}\n${order.join('\n')}\n  __req(${JSON.stringify(ENTRY)});\n})();`;
const head = `<title>${title}</title>\n${FRAGMENT ? '' : icon + '\n'}<style>\n${css}\n</style>`;
const out = FRAGMENT
  ? `${head}\n${body}\n<script type="module">\n${script}\n</script>\n`
  : `<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n`
    + `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n`
    + `<meta name="color-scheme" content="dark">\n${head}\n</head>\n<body>\n${body}\n`
    + `<script type="module">\n${script}\n</script>\n</body>\n</html>\n`;

/* 스스로 검사한다. 번들은 눈으로 보고 알 수 없으므로, 깨졌으면 여기서 멈춰야 한다. */
for (const [what, ok] of [
  ['CSS가 통째로 빠졌다', out.includes('canvas.board {') && out.includes('--wood:')],
  // 아티팩트용 조각에는 파비콘을 넣지 않는다. 넣은 경우에만 태그가 온전한지 본다.
  ['파비콘 태그가 중간에서 잘렸다', FRAGMENT || !icon || out.includes('</svg>')],
  ['진입점 호출이 없다', out.includes(`__req(${JSON.stringify(ENTRY)})`)],
  ['모듈 수가 너무 적다', order.length >= 20],
  ['type="module"이 아니다', out.includes('<script type="module">')],
]) {
  if (!ok) throw new Error(`번들이 깨졌습니다: ${what}`);
}

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const file = path.join(ROOT, 'dist', FRAGMENT ? 'baduk100.frag.html' : 'baduk100.html');
fs.writeFileSync(file, out);
console.log(`${path.relative(ROOT, file)} — 모듈 ${order.length}개, ${(out.length / 1024).toFixed(0)}KB`);
