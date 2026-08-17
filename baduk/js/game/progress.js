/**
 * 저장·해금·기력 — 사용자의 모든 진행 상태(요구사항 62·63·69·61).
 * 서버 없이 localStorage에 저장한다. Node 테스트에서는 메모리 저장소로 대체된다.
 */

import { isExamLevel, unlocksNext } from './stage.js';

const KEY = 'baduk100.progress.v1';

const memoryStore = new Map();
const storage = (() => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('__t', '1');
      localStorage.removeItem('__t');
      return localStorage;
    }
  } catch { /* 사생활 보호 모드 등 — 메모리로 대체 */ }
  return {
    getItem: (k) => (memoryStore.has(k) ? memoryStore.get(k) : null),
    setItem: (k, v) => memoryStore.set(k, v),
    removeItem: (k) => memoryStore.delete(k),
  };
})();

export const FIRST_KYU = 18;   // 시작 예상 기력
export const TOP_KYU = 1;

/** 한 급을 올리는 데 필요한 학습 점수. 위로 갈수록 많이 필요하다. */
export function pointsForKyu(kyu) {
  return 40 + (FIRST_KYU - kyu) * 14;
}

function emptyState() {
  return {
    version: 1,
    createdAt: Date.now(),
    levels: {},          // levelId -> {stars, cleared, attempts, bestSeconds, lastAt}
    kyu: FIRST_KYU,
    points: 0,           // 현재 급수 안에서 쌓인 학습 점수
    stats: {
      problemsAttempted: 0,
      problemsCorrect: 0,
      firstTryCorrect: 0,
      lifeDeathCorrect: 0,
      lifeDeathAttempted: 0,
    },
    games: [],           // 자유대국 기록 (최근 것이 뒤)
    reviews: {},         // problemId -> {due, interval, ease, lapses}
    myProblems: [],      // 내 대국에서 나온 문제
    settings: {
      aiKyu: 18,
      teacherMode: false,
      showCoordinates: true,
      sound: true,
      confirmMove: false,
      autoAdjustPrompt: true,
    },
    promotionOffered: null,
  };
}

export class Progress {
  constructor(state) {
    this.state = state || Progress.load().state;
  }

  static load() {
    try {
      const raw = storage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return new Progress({ ...emptyState(), ...parsed, settings: { ...emptyState().settings, ...(parsed.settings || {}) } });
      }
    } catch { /* 손상된 저장본은 무시하고 새로 시작한다 */ }
    return new Progress(emptyState());
  }

  save() {
    try {
      storage.setItem(KEY, JSON.stringify(this.state));
    } catch { /* 저장 실패해도 진행 자체는 계속된다 */ }
    return this;
  }

  reset() {
    this.state = emptyState();
    return this.save();
  }

  /* ---------------- LEVEL 진행 ---------------- */

  levelRecord(id) {
    return this.state.levels[id] || { stars: 0, cleared: false, attempts: 0, lastAt: 0 };
  }

  /** LEVEL이 열려 있는가. 1은 항상 열려 있고, 그다음부터는 앞 LEVEL의 해금 조건을 따른다. */
  isUnlocked(id) {
    if (id <= 1) return true;
    const prev = this.levelRecord(id - 1);
    return unlocksNext(id - 1, prev.stars);
  }

  /** 스테이지를 끝냈을 때 호출. 별은 더 좋은 결과만 남긴다. */
  completeLevel(id, summary) {
    const prev = this.levelRecord(id);
    const stars = Math.max(prev.stars, summary.stars || 0);
    this.state.levels[id] = {
      stars,
      cleared: stars > 0,
      attempts: (prev.attempts || 0) + 1,
      bestSeconds: prev.bestSeconds ? Math.min(prev.bestSeconds, summary.seconds || 0) : summary.seconds,
      lastAt: Date.now(),
    };
    // 처음 깬 LEVEL만 학습 점수를 준다(반복으로 급수를 올릴 수는 없다)
    if (!prev.cleared && stars > 0) this.addPoints(stars * 3 + (isExamLevel(id) ? 8 : 0));
    this.save();
    return this.state.levels[id];
  }

  totalStars() {
    return Object.values(this.state.levels).reduce((a, l) => a + (l.stars || 0), 0);
  }

  clearedCount() {
    return Object.values(this.state.levels).filter((l) => l.cleared).length;
  }

  /** 이어서 학습할 LEVEL — 아직 못 깬 것 중 가장 앞. */
  nextLevelId(maxLevel = 100) {
    for (let i = 1; i <= maxLevel; i++) {
      if (!this.levelRecord(i).cleared && this.isUnlocked(i)) return i;
    }
    for (let i = 1; i <= maxLevel; i++) if (this.isUnlocked(i)) return i;
    return 1;
  }

  /* ---------------- 문제 성적 ---------------- */

  recordProblem({ correct, firstTry, lifeDeath }) {
    const s = this.state.stats;
    s.problemsAttempted += 1;
    if (correct) s.problemsCorrect += 1;
    if (correct && firstTry) { s.firstTryCorrect += 1; this.addPoints(1); }
    if (lifeDeath) {
      s.lifeDeathAttempted += 1;
      if (correct) s.lifeDeathCorrect += 1;
    }
    this.save();
  }

  accuracy() {
    const s = this.state.stats;
    return s.problemsAttempted ? s.problemsCorrect / s.problemsAttempted : 0;
  }

  /* ---------------- 기력·승급 ---------------- */

  addPoints(n) {
    this.state.points += n;
    return this.state.points;
  }

  get kyu() { return this.state.kyu; }

  /** 다음 승급까지의 진행률(0~1). */
  promotionProgress() {
    if (this.state.kyu <= TOP_KYU) return 1;
    return Math.min(1, this.state.points / pointsForKyu(this.state.kyu));
  }

  /** 승급전을 볼 수 있는가. */
  canTakePromotion() {
    return this.state.kyu > TOP_KYU && this.promotionProgress() >= 1;
  }

  /** 승급전 통과 — 한 급 올린다. */
  promote() {
    if (this.state.kyu <= TOP_KYU) return this.state.kyu;
    this.state.kyu -= 1;
    this.state.points = 0;
    this.save();
    return this.state.kyu;
  }

  /** 승급전 불합격 — 점수를 조금 깎아 다시 준비하게 한다(급수는 내리지 않는다). */
  failPromotion() {
    this.state.points = Math.floor(pointsForKyu(this.state.kyu) * 0.6);
    this.save();
  }

  /* ---------------- 자유대국 기록 ---------------- */

  recordGame({ aiKyu, myColor, handicap, result, moves, sgf }) {
    this.state.games.push({
      at: Date.now(), aiKyu, myColor, handicap,
      won: result?.won === true, text: result?.text || '', moves: moves || 0, sgf: sgf || null,
    });
    if (this.state.games.length > 50) this.state.games = this.state.games.slice(-50);
    if (result?.won) this.addPoints(Math.max(2, 20 - aiKyu));
    this.save();
  }

  recentGames(n = 10) {
    return this.state.games.slice(-n);
  }

  /**
   * 요구사항 61 — 최근 10판 승률로 난이도 조절을 "제안"한다. 자동으로 바꾸지는 않는다.
   * @returns {{suggest:'up'|'down'|null, winRate:number, sample:number, text:string}}
   */
  difficultySuggestion() {
    const recent = this.recentGames(10).filter((g) => g.aiKyu === this.state.settings.aiKyu);
    if (recent.length < 5) return { suggest: null, winRate: 0, sample: recent.length, text: '' };
    const wins = recent.filter((g) => g.won).length;
    const rate = wins / recent.length;
    if (rate >= 0.8) {
      return { suggest: 'up', winRate: rate, sample: recent.length, text: '컴퓨터 기력을 1단계 올려볼까요?' };
    }
    if (rate <= 0.2) {
      return { suggest: 'down', winRate: rate, sample: recent.length, text: '컴퓨터 기력을 1단계 낮춰볼까요?' };
    }
    return { suggest: null, winRate: rate, sample: recent.length, text: '' };
  }

  /* ---------------- 복습 (오늘의 복습) ---------------- */

  /** SM-2를 단순화한 간격 반복. 틀리면 처음으로, 맞히면 간격이 늘어난다. */
  recordReview(problemId, correct) {
    const day = 86400000;
    const r = this.state.reviews[problemId] || { interval: 0, ease: 2.3, lapses: 0, due: 0 };
    if (correct) {
      r.interval = r.interval === 0 ? 1 : Math.round(r.interval * r.ease);
      r.ease = Math.min(2.8, r.ease + 0.08);
    } else {
      r.interval = 1;
      r.ease = Math.max(1.4, r.ease - 0.25);
      r.lapses += 1;
    }
    r.due = Date.now() + r.interval * day;
    this.state.reviews[problemId] = r;
    this.save();
    return { ...r };   // 저장된 객체를 그대로 넘기면 호출자가 이전 값과 비교할 수 없다
  }

  dueReviews(now = Date.now()) {
    return Object.entries(this.state.reviews)
      .filter(([, r]) => r.due <= now)
      .map(([id]) => id);
  }

  /* ---------------- 내 대국에서 나온 문제 ---------------- */

  addMyProblem(problem) {
    const id = problem.id || `my-${Date.now()}-${this.state.myProblems.length}`;
    const entry = { ...problem, id, createdAt: Date.now(), solved: false };
    // 같은 국면이 여러 번 저장되지 않도록 서명으로 걸러낸다
    const sig = JSON.stringify(entry.setup) + entry.toPlay;
    if (this.state.myProblems.some((p) => JSON.stringify(p.setup) + p.toPlay === sig)) return null;
    this.state.myProblems.unshift(entry);
    if (this.state.myProblems.length > 60) this.state.myProblems.length = 60;
    this.save();
    return entry;
  }

  markMyProblemSolved(id) {
    const p = this.state.myProblems.find((x) => x.id === id);
    if (p) { p.solved = true; p.solvedAt = Date.now(); this.save(); }
  }

  /* ---------------- 설정 ---------------- */

  setSetting(key, value) {
    this.state.settings[key] = value;
    this.save();
    return value;
  }

  get settings() { return this.state.settings; }
}

/**
 * 예상 기력 산출의 근거를 함께 돌려준다(요구사항 58 — 실제 인간 급수와 동일하다고 단정하지 않는다).
 */
export function rankAnalysis(progress, totalLevels = 100) {
  const s = progress.state.stats;
  const cleared = progress.clearedCount();
  const stars = progress.totalStars();
  const games = progress.recentGames(20);
  const wins = games.filter((g) => g.won).length;
  return {
    kyu: progress.kyu,
    progress: progress.promotionProgress(),
    canPromote: progress.canTakePromotion(),
    factors: [
      { label: 'LEVEL 진행도', value: `${cleared} / ${totalLevels}`, ratio: cleared / totalLevels },
      { label: '획득한 별', value: `${stars} / ${totalLevels * 3}`, ratio: stars / (totalLevels * 3) },
      {
        label: '문제 정답률',
        value: s.problemsAttempted ? `${Math.round((s.problemsCorrect / s.problemsAttempted) * 100)}%` : '—',
        ratio: s.problemsAttempted ? s.problemsCorrect / s.problemsAttempted : 0,
      },
      {
        label: '사활 문제 성적',
        value: s.lifeDeathAttempted ? `${Math.round((s.lifeDeathCorrect / s.lifeDeathAttempted) * 100)}%` : '—',
        ratio: s.lifeDeathAttempted ? s.lifeDeathCorrect / s.lifeDeathAttempted : 0,
      },
      {
        label: '자유대국 성적',
        value: games.length ? `${wins}승 ${games.length - wins}패` : '—',
        ratio: games.length ? wins / games.length : 0,
      },
    ],
  };
}
