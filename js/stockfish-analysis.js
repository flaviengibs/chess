/**
 * Stockfish-powered game analysis
 * Uses stockfish.js from CDN as a Web Worker.
 * Evaluates each position in the move history and classifies moves.
 */
class StockfishAnalysis {
    constructor() {
        // Use the lite single-file build from CDN (no WASM needed, works everywhere)
        this.workerUrl = 'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';
        this.worker = null;
        this.ready = false;
        this.queue = [];
        this.currentResolve = null;
        this.currentReject  = null;
    }

    // Initialise the worker and wait for 'readyok'
    init() {
        return new Promise((resolve, reject) => {
            try {
                this.worker = new Worker(this.workerUrl);
            } catch (e) {
                reject(new Error('Could not load Stockfish worker: ' + e.message));
                return;
            }

            this.worker.onmessage = (e) => {
                const line = e.data;
                if (line === 'readyok') {
                    this.ready = true;
                    resolve();
                }
                if (this.currentResolve && line.startsWith('info depth')) {
                    // Collect the last info line before bestmove
                }
                if (this.currentResolve && line.startsWith('bestmove')) {
                    const parts = line.split(' ');
                    const best  = parts[1] || '(none)';
                    this.currentResolve(best);
                    this.currentResolve = null;
                    this.currentReject  = null;
                }
            };

            this.worker.onerror = (e) => {
                if (this.currentReject) this.currentReject(e);
                reject(e);
            };

            this.worker.postMessage('uci');
            this.worker.postMessage('isready');
        });
    }

    // Ask Stockfish for the best move from a FEN at a given depth
    getBestMove(fen, depth = 12) {
        return new Promise((resolve, reject) => {
            if (!this.worker || !this.ready) {
                reject(new Error('Stockfish not ready'));
                return;
            }
            this.currentResolve = resolve;
            this.currentReject  = reject;
            this.worker.postMessage('position fen ' + fen);
            this.worker.postMessage('go depth ' + depth);
        });
    }

    // Get centipawn evaluation from a FEN (positive = white advantage)
    getEval(fen, depth = 10) {
        return new Promise((resolve, reject) => {
            if (!this.worker || !this.ready) {
                reject(new Error('Stockfish not ready'));
                return;
            }

            let lastScore = 0;
            const handler = (e) => {
                const line = e.data;
                // Parse score from info lines
                const scoreMatch = line.match(/score cp (-?\d+)/);
                const mateMatch  = line.match(/score mate (-?\d+)/);
                if (scoreMatch) lastScore = parseInt(scoreMatch[1]);
                if (mateMatch)  lastScore = parseInt(mateMatch[1]) > 0 ? 99999 : -99999;

                if (line.startsWith('bestmove')) {
                    this.worker.removeEventListener('message', handler);
                    resolve(lastScore);
                }
            };

            this.worker.addEventListener('message', handler);
            this.worker.postMessage('position fen ' + fen);
            this.worker.postMessage('go depth ' + depth);
        });
    }

    terminate() {
        if (this.worker) {
            this.worker.postMessage('quit');
            this.worker.terminate();
            this.worker = null;
            this.ready  = false;
        }
    }
}

// ── Classify a centipawn delta ──────────────────────────────────────────────
function classifyDelta(delta) {
    // delta = eval after move − eval before move, from the moving player's perspective
    if (delta >= -10)  return 'best';
    if (delta >= -50)  return 'good';
    if (delta >= -100) return 'inaccuracy';
    if (delta >= -200) return 'mistake';
    return 'blunder';
}

// ── Build a FEN from the engine state after N moves ─────────────────────────
// We replay the game from the starting FEN using the engine's move history
// and call engine.toFEN() if available, otherwise we reconstruct it.
function buildFENAfterMoves(startFen, moves, upToIndex) {
    const eng = new ChessEngine();
    eng.loadFEN(startFen);
    for (let i = 0; i <= upToIndex; i++) {
        const m = moves[i];
        if (!m || !m.from || !m.to) break;
        eng.makeMove(m.from.row, m.from.col, m.to.row, m.to.col, m.promotion || null);
    }
    return engineToFEN(eng);
}

// ── Convert a ChessEngine state to a FEN string ─────────────────────────────
function engineToFEN(eng) {
    const ranks = [];
    for (let r = 0; r < 8; r++) {
        let rank = '';
        let empty = 0;
        for (let c = 0; c < 8; c++) {
            const p = eng.board[r][c];
            if (!p) { empty++; }
            else { if (empty) { rank += empty; empty = 0; } rank += p; }
        }
        if (empty) rank += empty;
        ranks.push(rank);
    }

    const active = eng.currentPlayer === 'white' ? 'w' : 'b';

    let castling = '';
    if (eng.castlingRights.white.kingside)  castling += 'K';
    if (eng.castlingRights.white.queenside) castling += 'Q';
    if (eng.castlingRights.black.kingside)  castling += 'k';
    if (eng.castlingRights.black.queenside) castling += 'q';
    if (!castling) castling = '-';

    let ep = '-';
    if (eng.enPassantTarget) {
        const files = 'abcdefgh';
        ep = files[eng.enPassantTarget.col] + (8 - eng.enPassantTarget.row);
    }

    return `${ranks.join('/')} ${active} ${castling} ${ep} ${eng.halfMoveClock || 0} ${eng.fullMoveNumber || 1}`;
}

// ── Main analysis function called from app.js ────────────────────────────────
async function runStockfishAnalysis(moveHistory, onProgress) {
    if (!moveHistory || moveHistory.length === 0) {
        return { classifications: [], summary: _emptySummary() };
    }

    const sf = new StockfishAnalysis();
    try {
        await sf.init();
    } catch (e) {
        throw new Error('Failed to load Stockfish: ' + e.message);
    }

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const classifications = [];
    const summary = _emptySummary();

    // Evaluate position before move 0 (starting position)
    let prevEval = await sf.getEval(startFen, 10);

    for (let i = 0; i < moveHistory.length; i++) {
        const m = moveHistory[i];
        if (!m || !m.from || !m.to) continue;

        const fenAfter = buildFENAfterMoves(startFen, moveHistory, i);
        const evalAfter = await sf.getEval(fenAfter, 10);

        // From the moving player's perspective
        const color = i % 2 === 0 ? 'white' : 'black';
        const delta = color === 'white'
            ? (evalAfter - prevEval)
            : (prevEval - evalAfter);

        const type = classifyDelta(delta);
        classifications.push({ moveIndex: i, color, type, evalBefore: prevEval, evalAfter });

        const s = summary[color];
        s[type] = (s[type] || 0) + 1;

        prevEval = evalAfter;

        if (onProgress) onProgress(i + 1, moveHistory.length);
    }

    sf.terminate();
    return { classifications, summary };
}

function _emptySummary() {
    const blank = () => ({ best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 });
    return { white: blank(), black: blank() };
}
