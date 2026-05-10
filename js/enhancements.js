// ============================================================
// Chess game enhancements
// Time controls, themes, sounds, animations, analysis, puzzles
// ============================================================

// ============================================================
// Time control manager
// ============================================================
class TimeControlManager {
    constructor(minutes, increment = 0) {
        this.initialTime = minutes * 60 * 1000;
        this.increment = increment * 1000;
        this.times = { white: this.initialTime, black: this.initialTime };
        this.active = null;
        this.interval = null;
        this.onTimeout = null;
        this.onTick = null;
    }

    start(color) {
        this.active = color;
        this.interval = setInterval(() => {
            this.times[this.active] -= 100;
            if (this.onTick) this.onTick(this.times);
            if (this.times[this.active] <= 0) {
                this.times[this.active] = 0;
                this.stop();
                if (this.onTimeout) this.onTimeout(this.active);
            }
        }, 100);
    }

    switch(nextColor) {
        if (this.interval) clearInterval(this.interval);
        if (this.active) this.times[this.active] += this.increment;
        this.start(nextColor);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
        this.active = null;
    }

    format(ms) {
        if (ms <= 0) return '0:00';
        const s = Math.ceil(ms / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }
}

// ============================================================
// Sound manager
// ============================================================
class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('soundVolume') || '0.5');
        this.ctx = null;
    }

    getCtx() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
        }
        return this.ctx;
    }

    play(type) {
        if (!this.enabled) return;
        const ctx = this.getCtx();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.value = this.volume * 0.3;

        const configs = {
            move:    { freq: 440, dur: 0.08, type: 'sine' },
            capture: { freq: 220, dur: 0.15, type: 'sawtooth' },
            check:   { freq: 660, dur: 0.2,  type: 'square' },
            castle:  { freq: 330, dur: 0.12, type: 'sine' },
            end:     { freq: 180, dur: 0.4,  type: 'triangle' },
        };

        const c = configs[type] || configs.move;
        osc.type = c.type;
        osc.frequency.value = c.freq;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.dur);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + c.dur);
    }

    setEnabled(v) { this.enabled = v; localStorage.setItem('soundEnabled', v); }
    setVolume(v)  { this.volume = v;  localStorage.setItem('soundVolume', v); }
}

// ============================================================
// Theme manager
// ============================================================
class ThemeManager {
    constructor() {
        this.themes = {
            classic: { light: '#f0d9b5', dark: '#b58863', name: 'Classic' },
            blue:    { light: '#dee3e6', dark: '#8ca2ad', name: 'Blue' },
            green:   { light: '#ffffdd', dark: '#86a666', name: 'Green' },
            purple:  { light: '#e8d5f5', dark: '#9b72cf', name: 'Purple' },
        };
        this.current = localStorage.getItem('boardTheme') || 'classic';
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.apply();
    }

    apply() {
        const t = this.themes[this.current] || this.themes.classic;
        document.documentElement.style.setProperty('--light-square', t.light);
        document.documentElement.style.setProperty('--dark-square', t.dark);
        document.body.classList.toggle('dark-mode', this.darkMode);
    }

    setTheme(name) {
        if (this.themes[name]) {
            this.current = name;
            localStorage.setItem('boardTheme', name);
            this.apply();
        }
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.apply();
        return this.darkMode;
    }
}

// ============================================================
// Animation manager
// ============================================================
class AnimationManager {
    constructor() {
        this.enabled = localStorage.getItem('animationsEnabled') !== 'false';
        this.speed = localStorage.getItem('animationSpeed') || 'normal';
    }

    duration() {
        return { fast: 100, normal: 200, slow: 350 }[this.speed] || 200;
    }

    highlightLastMove(fromSq, toSq) {
        document.querySelectorAll('.last-move').forEach(s => s.classList.remove('last-move'));
        if (!this.enabled) return;
        if (fromSq) fromSq.classList.add('last-move');
        if (toSq)   toSq.classList.add('last-move');
    }

    highlightCheck(sq) {
        document.querySelectorAll('.in-check-pulse').forEach(s => s.classList.remove('in-check-pulse'));
        if (!this.enabled || !sq) return;
        sq.classList.add('in-check-pulse');
    }

    setEnabled(v) { this.enabled = v; localStorage.setItem('animationsEnabled', v); }
    setSpeed(s)   { this.speed = s;   localStorage.setItem('animationSpeed', s); }
}

// ============================================================
// Analysis engine
// ============================================================
class AnalysisEngine {
    constructor() {
        this.ai = new ChessAI('hard');
    }

    // Classify a move based on evaluation change
    classifyMove(evalBefore, evalAfter, color) {
        // Positive = good for white, negative = good for black
        const delta = color === 'white' ? (evalAfter - evalBefore) : (evalBefore - evalAfter);
        if (delta >= 0)    return 'best';
        if (delta >= -50)  return 'good';
        if (delta >= -150) return 'inaccuracy';
        if (delta >= -300) return 'mistake';
        return 'blunder';
    }

    // Evaluate a position using the AI's evaluator
    evaluate(engine) {
        return engine.evaluatePosition ? engine.evaluatePosition() : 0;
    }

    // Analyse a completed game given the engine's moveHistory array
    analyzeGame(moveHistory, engineClone) {
        if (!moveHistory || moveHistory.length === 0) {
            return { classifications: [], summary: this._emptySummary() };
        }

        const classifications = [];
        const summary = this._emptySummary();

        // Replay from start, evaluating before and after each move
        const replay = engineClone.clone ? engineClone.clone() : new ChessEngine();

        for (let i = 0; i < moveHistory.length; i++) {
            const m = moveHistory[i];
            if (!m || !m.from || !m.to) continue;

            const color = replay.currentPlayer;
            const evalBefore = this.evaluate(replay);

            replay.makeMove(m.from.row, m.from.col, m.to.row, m.to.col, m.promotion || null);

            const evalAfter = this.evaluate(replay);
            const type = this.classifyMove(evalBefore, evalAfter, color);

            classifications.push({ moveIndex: i, color, type, evalBefore, evalAfter });

            const s = summary[color];
            s[type] = (s[type] || 0) + 1;
        }

        return { classifications, summary };
    }

    _emptySummary() {
        const blank = () => ({ best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 });
        return { white: blank(), black: blank() };
    }
}

// ============================================================
// Puzzle manager – uses Lichess puzzle data from puzzle_data.js
// ============================================================
class PuzzleManager {
    constructor() {
        this.solved  = new Set(JSON.parse(localStorage.getItem('solvedPuzzles') || '[]'));
        this.rating  = parseInt(localStorage.getItem('puzzleRating') || '1200');
        // LICHESS_PUZZLES is loaded from js/puzzle_data.js
        this.puzzles = typeof LICHESS_PUZZLES !== 'undefined' ? LICHESS_PUZZLES : [];
    }

    daily() {
        const day = Math.floor(Date.now() / 86400000);
        return this.puzzles[day % this.puzzles.length];
    }

    byDifficulty(level) {
        const pool = this.puzzles.filter(p => p.difficulty === level);
        return pool[Math.floor(Math.random() * pool.length)] || this.puzzles[0];
    }

    award(id) {
        if (!this.solved.has(id)) {
            this.solved.add(id);
            this.rating += 15;
            localStorage.setItem('solvedPuzzles', JSON.stringify([...this.solved]));
            localStorage.setItem('puzzleRating', this.rating);
        }
    }

    addHistory(puzzle, solved) {
        const h = JSON.parse(localStorage.getItem('puzzleHistory') || '[]');
        h.unshift({ id: puzzle.id, theme: puzzle.theme, difficulty: puzzle.difficulty,
                    solved, date: new Date().toISOString() });
        localStorage.setItem('puzzleHistory', JSON.stringify(h.slice(0, 30)));
    }

    getHistory() {
        return JSON.parse(localStorage.getItem('puzzleHistory') || '[]');
    }
}
