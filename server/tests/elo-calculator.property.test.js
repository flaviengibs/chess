/**
 * Property-based tests for EloCalculator
 * Feature: real-multiplayer-socketio
 * Property 30: ELO calculation on game end
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 * 
 * These tests verify that ELO calculations follow the standard formula
 * across a wide range of random inputs.
 */

const fc = require('fast-check');
const EloCalculator = require('../elo-calculator');

describe('EloCalculator - Property-Based Tests', () => {
  let calculator;

  beforeEach(() => {
    calculator = new EloCalculator();
  });

  describe('Property 30: ELO calculation on game end', () => {
    test('should follow standard ELO formula for all valid inputs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3000 }), // playerElo
          fc.integer({ min: 100, max: 3000 }), // opponentElo
          fc.constantFrom(0, 0.5, 1.0),        // result (loss, draw, win)
          (playerElo, opponentElo, result) => {
            // Calculate ELO change
            const eloChange = calculator.calculateEloChange(playerElo, opponentElo, result);
            
            // Verify it's an integer
            expect(Number.isInteger(eloChange)).toBe(true);
            
            // Manually calculate expected score and ELO change
            const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
            const expectedChange = Math.round(32 * (result - expectedScore));
            
            // Verify the calculation matches the formula
            expect(eloChange).toBe(expectedChange);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('higher-rated player should gain less on win than lower-rated player', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2500 }), // lowerElo
          fc.integer({ min: 100, max: 500 }),  // eloDifference
          (lowerElo, eloDifference) => {
            const higherElo = lowerElo + eloDifference;
            
            // Both players win their respective games
            const higherRatedWinChange = calculator.calculateEloChange(higherElo, lowerElo, 1.0);
            const lowerRatedWinChange = calculator.calculateEloChange(lowerElo, higherElo, 1.0);
            
            // Higher-rated player should gain less (or equal if difference is 0)
            expect(higherRatedWinChange).toBeLessThanOrEqual(lowerRatedWinChange);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('higher-rated player should lose more on loss than lower-rated player', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2500 }), // lowerElo
          fc.integer({ min: 100, max: 500 }),  // eloDifference
          (lowerElo, eloDifference) => {
            const higherElo = lowerElo + eloDifference;
            
            // Both players lose their respective games
            const higherRatedLossChange = calculator.calculateEloChange(higherElo, lowerElo, 0.0);
            const lowerRatedLossChange = calculator.calculateEloChange(lowerElo, higherElo, 0.0);
            
            // Higher-rated player should lose more (more negative)
            // Since both are negative, we check absolute values
            expect(Math.abs(higherRatedLossChange)).toBeGreaterThanOrEqual(Math.abs(lowerRatedLossChange));
          }
        ),
        { numRuns: 5 }
      );
    });

    test('ELO changes should be bounded by K-factor', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3000 }), // playerElo
          fc.integer({ min: 100, max: 3000 }), // opponentElo
          fc.constantFrom(0, 0.5, 1.0),        // result
          (playerElo, opponentElo, result) => {
            const eloChange = calculator.calculateEloChange(playerElo, opponentElo, result);
            
            // ELO change should never exceed K-factor in absolute value
            expect(Math.abs(eloChange)).toBeLessThanOrEqual(calculator.K_FACTOR);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('equal ratings should result in symmetric ELO changes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3000 }), // rating
          fc.constantFrom(0, 0.5, 1.0),        // result
          (rating, result) => {
            // Calculate ELO change for player with given result
            const playerChange = calculator.calculateEloChange(rating, rating, result);
            
            // Calculate ELO change for opponent with opposite result
            const opponentResult = 1.0 - result;
            const opponentChange = calculator.calculateEloChange(rating, rating, opponentResult);
            
            // Changes should be equal and opposite (sum to 0)
            expect(playerChange + opponentChange).toBe(0);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('draw should result in zero change for equal ratings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3000 }), // rating
          (rating) => {
            const eloChange = calculator.calculateEloChange(rating, rating, 0.5);
            
            // Draw with equal ratings should result in no change
            expect(eloChange).toBe(0);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('higher-rated player should lose points on draw', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2500 }), // lowerElo
          fc.integer({ min: 50, max: 500 }),   // eloDifference (at least 50 to ensure meaningful difference)
          (lowerElo, eloDifference) => {
            const higherElo = lowerElo + eloDifference;
            
            // Draw result
            const higherRatedDrawChange = calculator.calculateEloChange(higherElo, lowerElo, 0.5);
            
            // Higher-rated player should lose points on draw
            expect(higherRatedDrawChange).toBeLessThan(0);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('lower-rated player should gain points on draw', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2500 }), // lowerElo
          fc.integer({ min: 50, max: 500 }),   // eloDifference (at least 50 to ensure meaningful difference)
          (lowerElo, eloDifference) => {
            const higherElo = lowerElo + eloDifference;
            
            // Draw result
            const lowerRatedDrawChange = calculator.calculateEloChange(lowerElo, higherElo, 0.5);
            
            // Lower-rated player should gain points on draw
            expect(lowerRatedDrawChange).toBeGreaterThan(0);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('expected score should be between 0 and 1', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3000 }), // playerElo
          fc.integer({ min: 100, max: 3000 }), // opponentElo
          (playerElo, opponentElo) => {
            const expectedScore = calculator.calculateExpectedScore(playerElo, opponentElo);
            
            // Expected score should be a probability (between 0 and 1)
            expect(expectedScore).toBeGreaterThan(0);
            expect(expectedScore).toBeLessThan(1);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('expected scores should sum to 1 for both players', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3000 }), // playerElo
          fc.integer({ min: 100, max: 3000 }), // opponentElo
          (playerElo, opponentElo) => {
            const player1Expected = calculator.calculateExpectedScore(playerElo, opponentElo);
            const player2Expected = calculator.calculateExpectedScore(opponentElo, playerElo);
            
            // Expected scores should sum to 1
            expect(player1Expected + player2Expected).toBeCloseTo(1.0, 10);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('winning should always increase ELO (or keep it same for extreme cases)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3000 }), // playerElo
          fc.integer({ min: 100, max: 3000 }), // opponentElo
          (playerElo, opponentElo) => {
            const eloChange = calculator.calculateEloChange(playerElo, opponentElo, 1.0);
            
            // Winning should never decrease ELO
            expect(eloChange).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('losing should always decrease ELO (or keep it same for extreme cases)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 3000 }), // playerElo
          fc.integer({ min: 100, max: 3000 }), // opponentElo
          (playerElo, opponentElo) => {
            const eloChange = calculator.calculateEloChange(playerElo, opponentElo, 0.0);
            
            // Losing should never increase ELO
            expect(eloChange).toBeLessThanOrEqual(0);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});
