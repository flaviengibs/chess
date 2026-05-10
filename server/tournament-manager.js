/**
 * Server-side tournament manager
 * Handles tournament creation, pairing, results and standings
 */
class ServerTournamentManager {
    constructor() {
        this.tournaments = {};
    }

    createTournament(config, creatorUsername) {
        try {
            const id = `T${Date.now()}`;
            const tournament = {
                id,
                name: config.name || 'Tournament',
                format: config.format || 'swiss', // swiss | roundrobin
                timeControl: config.timeControl || '10+0',
                maxPlayers: config.maxPlayers || 8,
                rounds: config.rounds || 3,
                currentRound: 0,
                status: 'registration', // registration | active | complete
                creator: creatorUsername,
                players: [],
                pairings: [],
                standings: [],
                games: {},
                createdAt: new Date().toISOString(),
            };

            // Auto-register creator
            tournament.players.push({
                username: creatorUsername,
                elo: config.creatorElo || 1200,
                score: 0,
                wins: 0,
                losses: 0,
                draws: 0,
            });

            this.tournaments[id] = tournament;
            return { success: true, tournament };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    joinTournament(tournamentId, username, elo) {
        const t = this.tournaments[tournamentId];
        if (!t) return { success: false, message: 'Tournament not found' };
        if (t.status !== 'registration') return { success: false, message: 'Registration closed' };
        if (t.players.find(p => p.username === username)) return { success: false, message: 'Already registered' };
        if (t.players.length >= t.maxPlayers) return { success: false, message: 'Tournament full' };

        t.players.push({ username, elo: elo || 1200, score: 0, wins: 0, losses: 0, draws: 0 });
        this._updateStandings(t);
        return { success: true, tournament: t };
    }

    startTournament(tournamentId) {
        const t = this.tournaments[tournamentId];
        if (!t) return { success: false, message: 'Tournament not found' };
        if (t.players.length < 2) return { success: false, message: 'Need at least 2 players' };

        t.status = 'active';
        t.currentRound = 1;
        const pairings = this._generatePairings(t);
        t.pairings.push({ round: 1, games: pairings });
        return { success: true, tournament: t, pairings };
    }

    recordGameResult(tournamentId, gameId, result, pgn) {
        const t = this.tournaments[tournamentId];
        if (!t) return { success: false, message: 'Tournament not found' };

        const game = t.games[gameId];
        if (!game) return { success: false, message: 'Game not found' };
        if (game.result) return { success: false, message: 'Result already recorded' };

        game.result = result; // '1-0' | '0-1' | '1/2-1/2'
        game.pgn = pgn || '';

        // Update scores
        const white = t.players.find(p => p.username === game.white);
        const black = t.players.find(p => p.username === game.black);

        if (white && black) {
            if (result === '1-0')     { white.score += 1; white.wins++;  black.losses++; }
            else if (result === '0-1') { black.score += 1; black.wins++;  white.losses++; }
            else                       { white.score += 0.5; black.score += 0.5; white.draws++; black.draws++; }
        }

        this._updateStandings(t);

        // Check if current round is complete
        const currentPairingRound = t.pairings.find(p => p.round === t.currentRound);
        const roundComplete = currentPairingRound &&
            currentPairingRound.games.every(g => t.games[g.id] && t.games[g.id].result);

        let tournamentComplete = false;
        let winner = null;

        if (roundComplete) {
            if (t.currentRound >= t.rounds) {
                t.status = 'complete';
                tournamentComplete = true;
                winner = t.standings[0]?.username || null;
            } else {
                t.currentRound++;
                const nextPairings = this._generatePairings(t);
                t.pairings.push({ round: t.currentRound, games: nextPairings });
            }
        }

        return { success: true, tournament: t, roundComplete, tournamentComplete, winner };
    }

    getTournament(tournamentId) {
        const t = this.tournaments[tournamentId];
        return t ? { success: true, tournament: t } : { success: false, message: 'Not found' };
    }

    getAllTournaments() {
        return Object.values(this.tournaments);
    }

    // ── Private helpers ──────────────────────────────────────────────────

    _generatePairings(t) {
        const players = [...t.players].sort((a, b) => b.score - a.score || b.elo - a.elo);
        const games = [];
        const paired = new Set();

        for (let i = 0; i < players.length; i++) {
            if (paired.has(players[i].username)) continue;
            for (let j = i + 1; j < players.length; j++) {
                if (paired.has(players[j].username)) continue;
                const gameId = `${t.id}_R${t.currentRound}_${i}_${j}`;
                const game = {
                    id: gameId,
                    white: players[i].username,
                    black: players[j].username,
                    result: null,
                    round: t.currentRound,
                };
                t.games[gameId] = game;
                games.push(game);
                paired.add(players[i].username);
                paired.add(players[j].username);
                break;
            }
        }

        // Bye for odd player
        const byePlayer = players.find(p => !paired.has(p.username));
        if (byePlayer) {
            byePlayer.score += 1; // full point bye
            games.push({ id: `bye_${byePlayer.username}_R${t.currentRound}`, white: byePlayer.username, black: 'BYE', result: '1-0', round: t.currentRound });
        }

        return games;
    }

    _updateStandings(t) {
        t.standings = [...t.players]
            .sort((a, b) => b.score - a.score || b.elo - a.elo)
            .map((p, i) => ({ rank: i + 1, username: p.username, score: p.score, elo: p.elo, wins: p.wins, losses: p.losses, draws: p.draws }));
    }
}

module.exports = ServerTournamentManager;
