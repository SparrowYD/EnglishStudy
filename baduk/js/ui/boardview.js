/**
 * 바둑판 렌더러 + 착수 인터랙션 (PRIORITY 2).
 *
 * 19로 전체를 그리되, 문제 국면처럼 일부만 봐야 할 때는 view 창으로 확대한다.
 * 학습에 필요한 표시(활로·번호·급소·집·마지막 수)를 모두 여기서 담당한다.
 */

import { BLACK, WHITE, EMPTY, toLabel, starPoints, COLUMNS } from '../engine/board.js';
import { SEKI } from '../engine/score.js';

const WOOD = '#e7bb74';
const WOOD_DARK = '#d9a75c';
const LINE = '#4a3418';

export class BoardView {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.size = opts.size || 19;
    this.onClick = opts.onClick || null;
    this.onHover = opts.onHover || null;
    this.showCoordinates = opts.showCoordinates !== false;
    this.board = null;
    this.view = null;            // {left, top, right, bottom} 또는 null(전체)
    this.markers = [];           // {at, type:'circle'|'triangle'|'square'|'label'|'dot', text, color}
    this.lastMove = -1;
    this.liberties = null;       // 활로를 표시할 좌표 배열
    this.territory = null;       // Int8Array
    this.ghost = -1;
    this.ghostColor = BLACK;
    this.interactive = true;
    this.deadStones = null;

    // 자동화 테스트에서 "이 좌표를 화면 어디에서 눌러야 하는가"를 알아내기 위한 연결고리
    canvas.__boardview = this;

    this._bind();
  }

  /** 반상 좌표의 화면상 중심(뷰포트 기준). 테스트와 툴팁 배치에 쓴다. */
  centerOf(idx) {
    const g = this._geometry();
    if (!g) return null;
    const x = idx % this.size;
    const y = (idx / this.size) | 0;
    if (x < g.bounds.left || x > g.bounds.right || y < g.bounds.top || y > g.bounds.bottom) return null;
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + g.originX + (x - g.bounds.left) * g.step,
      y: rect.top + g.originY + (y - g.bounds.top) * g.step,
    };
  }

  _bind() {
    const toIdx = (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      return this.pointAt(x, y);
    };
    this.canvas.addEventListener('click', (ev) => {
      if (!this.interactive || !this.onClick) return;
      const idx = toIdx(ev);
      if (idx >= 0) this.onClick(idx);
    });
    this.canvas.addEventListener('mousemove', (ev) => {
      if (!this.interactive) return;
      const idx = toIdx(ev);
      if (idx !== this.ghost) {
        this.ghost = idx;
        if (this.onHover) this.onHover(idx);
        this.render();
      }
    });
    this.canvas.addEventListener('mouseleave', () => {
      if (this.ghost !== -1) { this.ghost = -1; this.render(); }
    });
  }

  setBoard(board) { this.board = board; return this; }
  setLastMove(idx) { this.lastMove = idx == null ? -1 : idx; return this; }
  setMarkers(list) { this.markers = list || []; return this; }
  setLiberties(list) { this.liberties = list || null; return this; }
  setTerritory(t) { this.territory = t || null; return this; }
  setDeadStones(set) { this.deadStones = set || null; return this; }
  setGhostColor(c) { this.ghostColor = c; return this; }
  setInteractive(v) { this.interactive = v; return this; }

  /**
   * 보여 줄 영역. 'auto'면 돌이 있는 범위에 여백을 붙여 자동으로 잡는다.
   * 귀의 사활 문제를 19로 전체로 보여 주면 너무 작아서 보이지 않는다.
   */
  setView(v) {
    if (v === 'auto') this.view = this.autoView();
    else this.view = v;
    return this;
  }

  autoView(margin = 3) {
    const b = this.board;
    if (!b) return null;
    let minX = this.size; let minY = this.size; let maxX = -1; let maxY = -1;
    for (let i = 0; i < b.length; i++) {
      if (b.cells[i] === EMPTY) continue;
      const x = i % this.size; const y = (i / this.size) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (maxX < 0) return null;
    // 돌이 판 전체에 흩어져 있으면 확대하지 않는다
    if (maxX - minX > 12 || maxY - minY > 12) return null;
    let left = Math.max(0, minX - margin);
    let top = Math.max(0, minY - margin);
    let right = Math.min(this.size - 1, maxX + margin);
    let bottom = Math.min(this.size - 1, maxY + margin);
    // 가로 세로 비율을 맞춰 정사각형에 가깝게
    const w = right - left; const h = bottom - top;
    if (w > h) {
      const need = w - h;
      top = Math.max(0, top - Math.ceil(need / 2));
      bottom = Math.min(this.size - 1, bottom + Math.floor(need / 2));
    } else if (h > w) {
      const need = h - w;
      left = Math.max(0, left - Math.ceil(need / 2));
      right = Math.min(this.size - 1, right + Math.floor(need / 2));
    }
    return { left, top, right, bottom };
  }

  get bounds() {
    return this.view || { left: 0, top: 0, right: this.size - 1, bottom: this.size - 1 };
  }

  /** 화면 좌표 → 반상 좌표. */
  pointAt(px, py) {
    const g = this._geometry();
    if (!g) return -1;
    const x = Math.round((px - g.originX) / g.step) + g.bounds.left;
    const y = Math.round((py - g.originY) / g.step) + g.bounds.top;
    if (x < g.bounds.left || x > g.bounds.right || y < g.bounds.top || y > g.bounds.bottom) return -1;
    // 교차점에서 너무 멀면 무시(오조작 방지)
    const cx = g.originX + (x - g.bounds.left) * g.step;
    const cy = g.originY + (y - g.bounds.top) * g.step;
    if (Math.hypot(px - cx, py - cy) > g.step * 0.55) return -1;
    return y * this.size + x;
  }

  _geometry() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.canvas.width;
    const h = rect.height || this.canvas.height;
    if (!w || !h) return null;
    const bounds = this.bounds;
    const cols = bounds.right - bounds.left + 1;
    const rows = bounds.bottom - bounds.top + 1;
    const pad = this.showCoordinates ? 0.9 : 0.6;
    const step = Math.min(w / (cols + pad * 2 - 1 + 0.4), h / (rows + pad * 2 - 1 + 0.4));
    const boardW = (cols - 1) * step;
    const boardH = (rows - 1) * step;
    const originX = (w - boardW) / 2;
    const originY = (h - boardH) / 2;
    return { w, h, step, originX, originY, bounds, cols, rows };
  }

  xy(idx, g) {
    const x = idx % this.size;
    const y = (idx / this.size) | 0;
    return {
      px: g.originX + (x - g.bounds.left) * g.step,
      py: g.originY + (y - g.bounds.top) * g.step,
      x, y,
    };
  }

  render() {
    const canvas = this.canvas;
    const rect = canvas.getBoundingClientRect();
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = this._geometry();
    if (!g) return;
    ctx.clearRect(0, 0, g.w, g.h);

    this._drawWood(ctx, g);
    this._drawGrid(ctx, g);
    this._drawStars(ctx, g);
    if (this.territory) this._drawTerritory(ctx, g);
    this._drawStones(ctx, g);
    if (this.liberties) this._drawLiberties(ctx, g);
    this._drawMarkers(ctx, g);
    this._drawGhost(ctx, g);
    if (this.showCoordinates) this._drawCoordinates(ctx, g);
  }

  _drawWood(ctx, g) {
    const grad = ctx.createLinearGradient(0, 0, g.w, g.h);
    grad.addColorStop(0, WOOD);
    grad.addColorStop(1, WOOD_DARK);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, g.w, g.h);
  }

  _drawGrid(ctx, g) {
    const b = g.bounds;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = Math.max(0.6, g.step * 0.035);
    ctx.beginPath();
    for (let y = b.top; y <= b.bottom; y++) {
      const py = g.originY + (y - b.top) * g.step;
      // 판 밖으로 선이 이어지는 것처럼 보이도록, 잘린 쪽은 여백까지 그린다
      const x0 = b.left === 0 ? g.originX : g.originX - g.step * 0.5;
      const x1 = b.right === this.size - 1
        ? g.originX + (b.right - b.left) * g.step
        : g.originX + (b.right - b.left) * g.step + g.step * 0.5;
      ctx.moveTo(x0, py); ctx.lineTo(x1, py);
    }
    for (let x = b.left; x <= b.right; x++) {
      const px = g.originX + (x - b.left) * g.step;
      const y0 = b.top === 0 ? g.originY : g.originY - g.step * 0.5;
      const y1 = b.bottom === this.size - 1
        ? g.originY + (b.bottom - b.top) * g.step
        : g.originY + (b.bottom - b.top) * g.step + g.step * 0.5;
      ctx.moveTo(px, y0); ctx.lineTo(px, y1);
    }
    ctx.stroke();

    // 반상 가장자리는 굵게
    ctx.lineWidth = Math.max(1.2, g.step * 0.06);
    ctx.beginPath();
    if (b.left === 0) { ctx.moveTo(g.originX, g.originY - (b.top === 0 ? 0 : g.step * 0.5)); ctx.lineTo(g.originX, g.originY + (b.bottom - b.top) * g.step + (b.bottom === this.size - 1 ? 0 : g.step * 0.5)); }
    if (b.right === this.size - 1) { const px = g.originX + (b.right - b.left) * g.step; ctx.moveTo(px, g.originY - (b.top === 0 ? 0 : g.step * 0.5)); ctx.lineTo(px, g.originY + (b.bottom - b.top) * g.step + (b.bottom === this.size - 1 ? 0 : g.step * 0.5)); }
    if (b.top === 0) { ctx.moveTo(g.originX - (b.left === 0 ? 0 : g.step * 0.5), g.originY); ctx.lineTo(g.originX + (b.right - b.left) * g.step + (b.right === this.size - 1 ? 0 : g.step * 0.5), g.originY); }
    if (b.bottom === this.size - 1) { const py = g.originY + (b.bottom - b.top) * g.step; ctx.moveTo(g.originX - (b.left === 0 ? 0 : g.step * 0.5), py); ctx.lineTo(g.originX + (b.right - b.left) * g.step + (b.right === this.size - 1 ? 0 : g.step * 0.5), py); }
    ctx.stroke();
  }

  _drawStars(ctx, g) {
    ctx.fillStyle = LINE;
    for (const p of starPoints(this.size)) {
      const { px, py, x, y } = this.xy(p, g);
      if (x < g.bounds.left || x > g.bounds.right || y < g.bounds.top || y > g.bounds.bottom) continue;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.5, g.step * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawStones(ctx, g) {
    if (!this.board) return;
    const r = g.step * 0.47;
    for (let i = 0; i < this.board.length; i++) {
      const v = this.board.cells[i];
      if (v === EMPTY) continue;
      const { px, py, x, y } = this.xy(i, g);
      if (x < g.bounds.left || x > g.bounds.right || y < g.bounds.top || y > g.bounds.bottom) continue;
      const dead = this.deadStones && this.deadStones.has(i);
      ctx.save();
      if (dead) ctx.globalAlpha = 0.35;
      this._stone(ctx, px, py, r, v);
      ctx.restore();
    }
  }

  _stone(ctx, px, py, r, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(px + r * 0.12, py + r * 0.14, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();
    ctx.restore();

    const grad = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.1, px, py, r);
    if (color === BLACK) {
      grad.addColorStop(0, '#6a6a6a');
      grad.addColorStop(1, '#0b0b0b');
    } else {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#c9c9c9');
    }
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    if (color === WHITE) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = Math.max(0.5, r * 0.05);
      ctx.stroke();
    }
  }

  _drawGhost(ctx, g) {
    if (!this.interactive || this.ghost < 0 || !this.board) return;
    if (this.board.cells[this.ghost] !== EMPTY) return;
    const { px, py, x, y } = this.xy(this.ghost, g);
    if (x < g.bounds.left || x > g.bounds.right || y < g.bounds.top || y > g.bounds.bottom) return;
    ctx.save();
    ctx.globalAlpha = 0.45;
    this._stone(ctx, px, py, g.step * 0.47, this.ghostColor);
    ctx.restore();
  }

  _drawLiberties(ctx, g) {
    ctx.save();
    for (const p of this.liberties) {
      const { px, py, x, y } = this.xy(p, g);
      if (x < g.bounds.left || x > g.bounds.right || y < g.bounds.top || y > g.bounds.bottom) continue;
      ctx.beginPath();
      ctx.arc(px, py, g.step * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(46, 160, 90, 0.85)';
      ctx.fill();
    }
    ctx.restore();
  }

  _drawTerritory(ctx, g) {
    ctx.save();
    for (let i = 0; i < this.territory.length; i++) {
      const t = this.territory[i];
      if (t === EMPTY) continue;
      if (this.board && this.board.cells[i] !== EMPTY) continue;
      const { px, py, x, y } = this.xy(i, g);
      if (x < g.bounds.left || x > g.bounds.right || y < g.bounds.top || y > g.bounds.bottom) continue;
      const s = g.step * 0.24;
      if (t === SEKI) {
        // 빅이라 집으로 세지 않는 자리. 집 표시(꽉 찬 네모)와 헷갈리지 않게 **빈 네모**로 그린다.
        ctx.strokeStyle = 'rgba(220,180,90,0.95)';
        ctx.lineWidth = Math.max(1, g.step * 0.06);
        ctx.strokeRect(px - s / 2, py - s / 2, s, s);
        continue;
      }
      ctx.fillStyle = t === BLACK ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.8)';
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
    ctx.restore();
  }

  _drawMarkers(ctx, g) {
    const r = g.step * 0.47;
    for (const m of this.markers) {
      const idx = m.at;
      const { px, py, x, y } = this.xy(idx, g);
      if (x < g.bounds.left || x > g.bounds.right || y < g.bounds.top || y > g.bounds.bottom) continue;
      const onStone = this.board && this.board.cells[idx] !== EMPTY;
      const stoneColor = onStone ? this.board.cells[idx] : EMPTY;
      const ink = m.color || (stoneColor === BLACK ? '#ffffff' : '#111111');
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = Math.max(1.2, g.step * 0.07);
      switch (m.type) {
        case 'circle':
          ctx.beginPath(); ctx.arc(px, py, r * 0.55, 0, Math.PI * 2); ctx.stroke(); break;
        case 'square':
          ctx.strokeRect(px - r * 0.45, py - r * 0.45, r * 0.9, r * 0.9); break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(px, py - r * 0.6); ctx.lineTo(px + r * 0.55, py + r * 0.4); ctx.lineTo(px - r * 0.55, py + r * 0.4);
          ctx.closePath(); ctx.stroke(); break;
        case 'dot':
          ctx.beginPath(); ctx.arc(px, py, r * 0.3, 0, Math.PI * 2); ctx.fill(); break;
        case 'ghost':
          ctx.globalAlpha = 0.4;
          this._stone(ctx, px, py, r, m.stone || BLACK);
          break;
        case 'highlight':
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = m.fill || '#3aa76d';
          ctx.beginPath(); ctx.arc(px, py, r * 0.8, 0, Math.PI * 2); ctx.fill();
          break;
        case 'label':
        default: {
          if (!onStone && m.plate !== false) {
            ctx.fillStyle = WOOD;
            ctx.beginPath(); ctx.arc(px, py, r * 0.72, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = m.color || '#111';
          }
          ctx.font = `700 ${Math.round(g.step * (String(m.text || '').length > 2 ? 0.36 : 0.46))}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(m.text ?? ''), px, py + g.step * 0.02);
          break;
        }
      }
      ctx.restore();
    }

    if (this.lastMove >= 0 && this.board && this.board.cells[this.lastMove] !== EMPTY) {
      const { px, py, x, y } = this.xy(this.lastMove, g);
      if (x >= g.bounds.left && x <= g.bounds.right && y >= g.bounds.top && y <= g.bounds.bottom) {
        ctx.save();
        ctx.strokeStyle = this.board.cells[this.lastMove] === BLACK ? '#ff5a5a' : '#d02020';
        ctx.lineWidth = Math.max(1.4, g.step * 0.08);
        ctx.beginPath();
        ctx.arc(px, py, r * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  _drawCoordinates(ctx, g) {
    const b = g.bounds;
    ctx.save();
    ctx.fillStyle = 'rgba(60,40,15,0.75)';
    ctx.font = `600 ${Math.round(g.step * 0.34)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let x = b.left; x <= b.right; x++) {
      const px = g.originX + (x - b.left) * g.step;
      ctx.fillText(COLUMNS[x], px, g.originY - g.step * 0.72);
    }
    ctx.textAlign = 'right';
    for (let y = b.top; y <= b.bottom; y++) {
      const py = g.originY + (y - b.top) * g.step;
      ctx.fillText(String(this.size - y), g.originX - g.step * 0.62, py);
    }
    ctx.restore();
  }
}
