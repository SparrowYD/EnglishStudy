#!/usr/bin/env node
/**
 * KataGo 중계 서버 (요구사항 59·60).
 *
 * 브라우저는 프로세스를 띄울 수 없다. 그래서 이 작은 서버가
 *   브라우저(js/ai/KataGoAdapter.js)  ⇄  HTTP/JSON  ⇄  이 서버  ⇄  GTP 프로세스
 * 사이를 중계한다. 의존성은 없다(node 표준 모듈만 쓴다).
 *
 * 실행 예
 *   node tools/gtp-bridge.js --katago /경로/katago --model /경로/model.bin.gz
 *   node tools/gtp-bridge.js --port 8181            # 환경변수 KATAGO_BIN/MODEL/CONFIG 사용
 *   node tools/gtp-bridge.js --engine <아무 GTP 엔진과 인자들>
 *   node tools/gtp-bridge.js --engine node tools/gtp-engine.js   # 내장 AI를 GTP로 (KataGo 없이 확인용)
 *
 * 브라우저 쪽 설정
 *   localStorage['baduk100.katago.endpoint'] = 'http://localhost:8181'
 *
 * 설계 원칙(요구사항 59): **연결되지 않으면 정직하게 이유를 말한다.**
 * 엔진이 없거나 죽으면 status가 {ready:false, reason}을 돌려주고,
 * 어댑터는 그 이유를 그대로 보여 준 뒤 내장 AI로 내려간다. 자유대국은 어떤 환경에서도 된다.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

/* ------------------------------------------------------------------ 설정 */

const argv = process.argv.slice(2);
function flag(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}
function engineCommand() {
  const i = argv.indexOf('--engine');
  if (i >= 0) {
    const rest = argv.slice(i + 1);
    if (rest.length === 0) throw new Error('--engine 뒤에 실행할 명령을 적어 주세요.');
    return rest;
  }
  if (process.env.BADUK_GTP_ENGINE) return process.env.BADUK_GTP_ENGINE.split(/\s+/).filter(Boolean);
  const bin = flag('--katago', process.env.KATAGO_BIN || 'katago');
  const model = flag('--model', process.env.KATAGO_MODEL);
  const config = flag('--config', process.env.KATAGO_CONFIG);
  const cmd = [bin, 'gtp'];
  if (model) cmd.push('-model', model);
  if (config) cmd.push('-config', config);
  return cmd;
}

const PORT = Number(flag('--port', process.env.PORT || 8181));
const MAX_SESSIONS = Number(flag('--max-sessions', 2));
const IDLE_MS = Number(flag('--idle-ms', 10 * 60 * 1000));
const COMMAND = engineCommand();

/* ------------------------------------------------ GTP 프로세스 감싸기 */

class GtpProcess {
  constructor(command) {
    this.command = command;
    this.proc = null;
    this.buffer = '';
    this.pending = [];        // {resolve, reject}
    this.queue = Promise.resolve();
    this.dead = null;         // 죽은 이유(문자열)
    this.stderr = '';
    this.commands = new Set();
    this.info = { name: 'unknown', version: '' };
  }

  start() {
    const [bin, ...args] = this.command;
    this.proc = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk) => this._onData(chunk));
    this.proc.stderr.setEncoding('utf8');
    this.proc.stderr.on('data', (chunk) => {
      this.stderr = (this.stderr + chunk).slice(-4000);
    });
    this.proc.on('error', (e) => this._die(`엔진을 실행할 수 없습니다: ${bin} (${e.code || e.message})`));
    this.proc.on('exit', (code, signal) => this._die(`엔진이 종료되었습니다 (code ${code}${signal ? ', ' + signal : ''}).`));
  }

  _die(reason) {
    if (!this.dead) this.dead = reason;
    const err = new Error(this.dead + (this.stderr ? `\n${this.stderr.trim().split('\n').slice(-4).join('\n')}` : ''));
    while (this.pending.length) this.pending.shift().reject(err);
  }

  _onData(chunk) {
    this.buffer += chunk.replace(/\r/g, '');
    // GTP 응답은 빈 줄 하나로 끝난다.
    let at;
    while ((at = this.buffer.indexOf('\n\n')) >= 0) {
      const raw = this.buffer.slice(0, at);
      this.buffer = this.buffer.slice(at + 2);
      const waiter = this.pending.shift();
      if (!waiter) continue;
      const trimmed = raw.replace(/^\n+/, '');
      if (trimmed.startsWith('?')) waiter.reject(new Error(trimmed.replace(/^\?\d*\s*/, '') || 'GTP 오류'));
      else waiter.resolve(trimmed.replace(/^=\d*\s?/, ''));
    }
  }

  /** 한 번에 한 명령씩 보낸다(GTP는 파이프라이닝을 가정하지 않는다). */
  send(command, timeout = 120000) {
    const run = () => new Promise((resolve, reject) => {
      if (this.dead) { reject(new Error(this.dead)); return; }
      const timer = setTimeout(() => {
        reject(new Error(`엔진이 ${Math.round(timeout / 1000)}초 안에 "${command}"에 응답하지 않았습니다.`));
      }, timeout);
      const done = (fn) => (v) => { clearTimeout(timer); fn(v); };
      this.pending.push({ resolve: done(resolve), reject: done(reject) });
      this.proc.stdin.write(command + '\n');
    });
    this.queue = this.queue.then(run, run);
    return this.queue;
  }

  async handshake() {
    this.info.name = (await this.send('name', 10000)).trim();
    this.info.version = (await this.send('version', 10000)).trim().split('\n')[0];
    try {
      const list = await this.send('list_commands', 10000);
      for (const c of list.split('\n')) if (c.trim()) this.commands.add(c.trim());
    } catch { /* list_commands가 없는 엔진도 있다 */ }
  }

  close() {
    if (!this.proc || this.dead) return;
    try { this.proc.stdin.write('quit\n'); } catch { /* 이미 닫힘 */ }
    setTimeout(() => { try { this.proc.kill(); } catch { /* 이미 죽음 */ } }, 500).unref?.();
  }
}

/* ------------------------------------------------------- 세션 관리 */

const sessions = new Map();   // id -> {engine, touched}

function touch(id) {
  const s = sessions.get(id);
  if (s) s.touched = Date.now();
  return s;
}

function evictIfNeeded() {
  const now = Date.now();
  for (const [id, s] of [...sessions]) {
    if (now - s.touched > IDLE_MS) { s.engine.close(); sessions.delete(id); }
  }
  while (sessions.size >= MAX_SESSIONS) {
    let oldest = null;
    for (const [id, s] of sessions) if (!oldest || s.touched < oldest[1].touched) oldest = [id, s];
    if (!oldest) break;
    oldest[1].engine.close();
    sessions.delete(oldest[0]);
  }
}

async function engineFor(sessionId) {
  const known = sessionId && touch(sessionId);
  if (known && !known.engine.dead) return { id: sessionId, engine: known.engine };
  if (known) { sessions.delete(sessionId); }   // 죽은 엔진은 버리고 새로 띄운다
  evictIfNeeded();
  const engine = new GtpProcess(COMMAND);
  engine.start();
  await engine.handshake();
  const id = sessionId || randomUUID();
  sessions.set(id, { engine, touched: Date.now() });
  return { id, engine };
}

/* --------------------------------------------------------- 기력 조절 */

/**
 * 어댑터는 급수가 아니라 **탐색량**을 보낸다(요구사항 60의 조절 수단).
 * KataGo에는 그대로 넘기고, 급수로 조절하는 엔진(내장 GTP 엔진)에는 되돌려 계산해 준다.
 * visitsForKyu(kyu) = 2 * (300)^((18-kyu)/17) 의 역함수다.
 */
export function kyuForVisits(visits) {
  const v = Math.max(2, Number(visits) || 2);
  const kyu = 18 - 17 * (Math.log(v / 2) / Math.log(300));
  return Math.min(18, Math.max(1, Math.round(kyu)));
}

async function applyStrength(engine, params) {
  const visits = Math.max(1, Math.round(Number(params.maxVisits) || 100));
  if (engine.commands.has('baduk-set-kyu')) {
    await engine.send(`baduk-set-kyu ${kyuForVisits(visits)}`);
    return;
  }
  if (engine.commands.has('kata-set-param')) {
    try { await engine.send(`kata-set-param maxVisits ${visits}`); } catch { /* 파라미터 이름이 다른 엔진 */ }
  }
}

/* ------------------------------------------------------------- RPC */

function parseAnalyze(text, count) {
  const moves = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('info ')) continue;
    const tok = line.split(/\s+/);
    const get = (key) => {
      const i = tok.indexOf(key);
      return i >= 0 ? tok[i + 1] : null;
    };
    const vertex = get('move');
    if (!vertex) continue;
    moves.push({
      vertex,
      winrate: Number(get('winrate')) || 0,
      visits: Number(get('visits')) || 0,
    });
  }
  moves.sort((a, b) => b.visits - a.visits || b.winrate - a.winrate);
  return moves.slice(0, Math.max(1, Number(count) || 3));
}

const METHODS = {
  async status(engine) {
    return {
      ready: !engine.dead,
      reason: engine.dead || undefined,
      name: engine.info.name,
      version: engine.info.version,
      // 내장 GTP 엔진의 winrate는 진짜 승률이 아니라 자체 평가의 상대 선호도다.
      winrateIsProbability: engine.commands.has('kata-set-param') && !engine.commands.has('baduk-set-kyu'),
      analysis: engine.commands.has('kata-genmove_analyze'),
    };
  },

  async setup(engine, params) {
    const size = Number(params.size) || 19;
    await engine.send(`boardsize ${size}`);
    await engine.send('clear_board');
    if (params.komi != null) await engine.send(`komi ${Number(params.komi)}`);
    const handicap = Number(params.handicap) || 0;
    if (handicap >= 2) await engine.send(`fixed_handicap ${handicap}`);
    for (const m of params.moves || []) {
      const color = m.color === 'B' ? 'B' : 'W';
      const vertex = String(m.vertex || '').toUpperCase();
      if (!/^(PASS|RESIGN|[A-HJ-T]\d{1,2})$/.test(vertex)) throw new Error(`좌표를 알 수 없습니다: ${m.vertex}`);
      if (vertex === 'RESIGN') continue;
      await engine.send(`play ${color} ${vertex}`);
    }
    return { ok: true, moves: (params.moves || []).length };
  },

  async genmove(engine, params) {
    const color = params.color === 'B' ? 'B' : 'W';
    await applyStrength(engine, params);
    const out = (await engine.send(`genmove ${color}`)).trim();
    return { vertex: out.toLowerCase() === 'pass' ? 'pass' : out.toLowerCase() === 'resign' ? 'resign' : out.toUpperCase() };
  },

  async analyze(engine, params) {
    if (!engine.commands.has('kata-genmove_analyze')) {
      throw new Error(`이 엔진(${engine.info.name})은 분석(kata-genmove_analyze)을 지원하지 않습니다.`);
    }
    const color = params.color === 'B' ? 'B' : 'W';
    await applyStrength(engine, params);
    const text = await engine.send(`kata-genmove_analyze ${color} 100`);
    return { moves: parseAnalyze(text, params.count) };
  },

  async close(engine, params, sessionId) {
    engine.close();
    sessions.delete(sessionId);
    return { ok: true };
  },
};

/* ------------------------------------------------------------ 서버 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function send(res, code, body) {
  const text = JSON.stringify(body);
  res.writeHead(code, { ...CORS, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(text);
}

export function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
    const url = (req.url || '/').split('?')[0];

    if (req.method === 'GET' && (url === '/' || url === '/status')) {
      handleRpc({ method: 'status', params: {} })
        .then((out) => send(res, 200, out))
        .catch((e) => send(res, 200, { result: { ready: false, reason: e.message } }));
      return;
    }
    if (req.method !== 'POST' || url !== '/rpc') { send(res, 404, { error: '없는 경로입니다.' }); return; }

    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 1_000_000) { req.destroy(); }
    });
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body || '{}'); } catch { send(res, 400, { error: 'JSON을 읽을 수 없습니다.' }); return; }
      handleRpc(payload)
        .then((out) => send(res, 200, out))
        .catch((e) => send(res, 200, { error: e.message }));
    });
  });
}

async function handleRpc(payload) {
  const method = String(payload.method || '');
  if (!Object.prototype.hasOwnProperty.call(METHODS, method)) {
    return { error: `알 수 없는 method: ${method}` };
  }
  let id;
  let engine;
  try {
    ({ id, engine } = await engineFor(payload.session));
  } catch (e) {
    // 엔진을 띄우지 못했다 — status만은 이유를 담아 정상 응답한다(요구사항 59).
    if (method === 'status') return { result: { ready: false, reason: e.message } };
    return { error: e.message };
  }
  try {
    const result = await METHODS[method](engine, payload.params || {}, id);
    return { result, session: id };
  } catch (e) {
    if (method === 'status') return { result: { ready: false, reason: e.message }, session: id };
    return { error: e.message, session: id };
  }
}

/* 직접 실행했을 때만 서버를 연다(테스트에서는 createServer만 가져다 쓴다). */
if (process.argv[1] && process.argv[1].endsWith('gtp-bridge.js')) {
  const server = createServer();
  server.listen(PORT, () => {
    const port = server.address().port;
    console.log(`GTP-BRIDGE-PORT ${port}`);          // 테스트·스크립트가 읽는 줄
    console.log(`GTP 중계 서버 — http://localhost:${port}`);
    console.log(`  엔진: ${COMMAND.join(' ')}`);
    console.log('  브라우저 설정: localStorage["baduk100.katago.endpoint"] = ' + JSON.stringify(`http://localhost:${port}`));
  });
  process.on('SIGINT', () => {
    for (const s of sessions.values()) s.engine.close();
    process.exit(0);
  });
}
