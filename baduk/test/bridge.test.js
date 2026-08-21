/**
 * 중계 서버 왕복 테스트 (요구사항 59·60).
 *
 * 브라우저가 쓰는 KataGoAdapter를 **그대로** 써서
 *   어댑터 → HTTP → tools/gtp-bridge.js → GTP 프로세스(tools/gtp-engine.js)
 * 전 경로를 실제로 통과시킨다. KataGo가 없는 환경에서도 중계 경로가
 * "만들어만 놓고 한 번도 안 눌러 본 버튼"이 되지 않도록 하는 것이 목적이다(요구사항 79).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { KataGoAdapter, visitsForKyu } from '../js/ai/KataGoAdapter.js';
import { kyuForVisits } from '../tools/gtp-bridge.js';
import { Game, PASS } from '../js/engine/game.js';
import { BLACK, WHITE, fromLabel, toLabel } from '../js/engine/board.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 브리지를 임의 포트로 띄우고, 실제로 열린 주소를 돌려준다. */
function startBridge(engineCmd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'tools/gtp-bridge.js'), '--port', '0'], {
      cwd: ROOT,
      env: { ...process.env, BADUK_GTP_ENGINE: engineCmd },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    const timer = setTimeout(() => reject(new Error('브리지가 뜨지 않았습니다: ' + out)), 15000);
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (c) => {
      out += c;
      const m = out.match(/GTP-BRIDGE-PORT (\d+)/);
      if (m) { clearTimeout(timer); resolve({ proc, endpoint: `http://127.0.0.1:${m[1]}` }); }
    });
    proc.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

const LOCAL_ENGINE = `${process.execPath} ${path.join(ROOT, 'tools/gtp-engine.js')}`;

test('중계 서버: 어댑터가 내장 GTP 엔진과 실제로 대국한다', async () => {
  const { proc, endpoint } = await startBridge(LOCAL_ENGINE);
  try {
    const ai = new KataGoAdapter({ endpoint, kyu: 8 });

    const av = await ai.available();
    assert.equal(av.ok, true, av.reason || '');

    const game = new Game({ size: 9, komi: 6.5 });
    game.play(fromLabel('D4', 9), BLACK);

    // 백 차례 — 어댑터가 setup + genmove를 왕복한다
    const res = await ai.genMove(game, WHITE);
    assert.ok(res.move >= 0, `착점을 받지 못했습니다: ${JSON.stringify(res)}`);
    assert.equal(game.board.cells[res.move], 0, '엔진이 빈 자리를 골라야 합니다.');
    assert.ok(game.play(res.move, WHITE).ok, `엔진의 수가 합법이어야 합니다: ${toLabel(res.move, 9)}`);

    // 실제로 몇 수 더 주고받아도 어긋나지 않는지 확인한다(setup 동기화 검증)
    for (let i = 0; i < 4; i++) {
      const r = await ai.genMove(game, game.turn);
      assert.ok(r.move === PASS || r.move >= 0);
      assert.ok(game.play(r.move, game.turn).ok, '주고받는 동안 국면이 어긋나면 안 됩니다.');
    }

    const top = await ai.topMoves(game, game.turn, 3);
    assert.ok(top.length > 0, '분석 결과가 비어 있습니다.');
    for (const m of top) {
      assert.ok(m.move >= 0 && game.board.cells[m.move] === 0, '후보수는 빈 자리여야 합니다.');
      assert.ok(typeof m.reason === 'string' && m.reason.length > 0);
    }

    await ai.dispose();
  } finally {
    proc.kill();
  }
});

test('중계 서버: 치수 대국도 동기화된다', async () => {
  const { proc, endpoint } = await startBridge(LOCAL_ENGINE);
  try {
    const ai = new KataGoAdapter({ endpoint, kyu: 5 });
    assert.equal((await ai.available()).ok, true);

    const game = new Game({ size: 19, handicap: 4, komi: 0.5 });
    assert.equal(game.turn, WHITE, '4점 접바둑은 백부터 둔다.');

    const res = await ai.genMove(game, WHITE);
    assert.ok(res.move >= 0);
    assert.equal(game.board.cells[res.move], 0, '치석 위에 두면 동기화가 깨진 것이다.');
    await ai.dispose();
  } finally {
    proc.kill();
  }
});

test('중계 서버: 엔진이 없으면 정직하게 이유를 말한다', async () => {
  const { proc, endpoint } = await startBridge('/nonexistent/katago-binary gtp');
  try {
    const ai = new KataGoAdapter({ endpoint });
    const av = await ai.available();
    assert.equal(av.ok, false);
    assert.ok(/실행할 수 없|없습니다|ENOENT/.test(av.reason), av.reason);
  } finally {
    proc.kill();
  }
});

test('중계 서버 주소가 없으면 어댑터는 바로 사용 불가를 알린다', async () => {
  const ai = new KataGoAdapter({});
  const av = await ai.available();
  assert.equal(av.ok, false);
  assert.match(av.reason, /중계 서버/);
});

test('탐색량 ↔ 급수 환산이 서로의 역함수다', () => {
  for (let kyu = 1; kyu <= 18; kyu++) {
    assert.equal(kyuForVisits(visitsForKyu(kyu)), kyu, `${kyu}급 환산이 어긋납니다.`);
  }
});
