/**
 * EloCalculator - Calculates ELO rating changes based on game results
 * 
 * Uses the standard ELO rating formula:
 * - Expected Score: E = 1 / (1 + 10^((opponentElo - playerElo) / 400))
 * - ELO Change: ΔElo = K * (actualScore - expectedScore)
 * - K-factor: 32
 * - actualScore: 1 (win), 0.5 (draw), 0 (loss)
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
class EloCalculator {
  constructor() {
    this.K_FACTOR = 32;
  }

  /**
   * Calculate the expected score for a player
   * @param {number} playerElo - The player's current ELO rating
   * @param {number} opponentElo - The opponent's current ELO rating
   * @returns {number} Expected score (0 to 1)
   */
  calculateExpectedScore(playerElo, opponentElo) {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  }

  /**
   * Calculate ELO change for a player based on game result
   * @param {number} playerElo - The player's current ELO rating
   * @param {number} opponentElo - The opponent's current ELO rating
   * @param {number} result - Game result: 1.0 (win), 0.5 (draw), 0.0 (loss)
   * @returns {number} ELO change as integer (can be positive or negative)
   */
  calculateEloChange(playerElo, opponentElo, result) {
    // Validate inputs
    if (typeof playerElo !== 'number' || typeof opponentElo !== 'number') {
      throw new Error('Player and opponent ELO must be numbers');
    }
    
    if (result !== 0 && result !== 0.5 && result !== 1.0) {
      throw new Error('Result must be 0 (loss), 0.5 (draw), or 1.0 (win)');
    }

    // Calculate expected score
    const expectedScore = this.calculateExpectedScore(playerElo, opponentElo);
    
    // Calculate ELO change
    const eloChange = this.K_FACTOR * (result - expectedScore);
    
    // Return as integer (rounded)
    return Math.round(eloChange);
  }
}

module.exports = EloCalculator;
