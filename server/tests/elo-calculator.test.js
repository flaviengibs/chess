/**
 * Unit tests for EloCalculator
 * Tests the standard ELO rating calculation formula
 */

const EloCalculator = require('../elo-calculator');

describe('EloCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new EloCalculator();
  });

  describe('calculateExpectedScore', () => {
    test('should return 0.5 for equal ratings', () => {
      const expected = calculator.calculateExpectedScore(1500, 1500);
      expect(expected).toBeCloseTo(0.5, 5);
    });

    test('should return higher expected score for higher-rated player', () => {
      const expected = calculator.calculateExpectedScore(1600, 1500);
      expect(expected).toBeGreaterThan(0.5);
    });

    test('should return lower expected score for lower-rated player', () => {
      const expected = calculator.calculateExpectedScore(1400, 1500);
      expect(expected).toBeLessThan(0.5);
    });

    test('should return expected score close to 1 for much higher-rated player', () => {
      const expected = calculator.calculateExpectedScore(2000, 1200);
      expect(expected).toBeGreaterThan(0.9);
    });

    test('should return expected score close to 0 for much lower-rated player', () => {
      const expected = calculator.calculateExpectedScore(1200, 2000);
      expect(expected).toBeLessThan(0.1);
    });
  });

  describe('calculateEloChange', () => {
    test('should return 0 for equal ratings and draw', () => {
      const change = calculator.calculateEloChange(1500, 1500, 0.5);
      expect(change).toBe(0);
    });

    test('should return positive change for win against equal opponent', () => {
      const change = calculator.calculateEloChange(1500, 1500, 1.0);
      expect(change).toBe(16); // K * (1.0 - 0.5) = 32 * 0.5 = 16
    });

    test('should return negative change for loss against equal opponent', () => {
      const change = calculator.calculateEloChange(1500, 1500, 0.0);
      expect(change).toBe(-16); // K * (0.0 - 0.5) = 32 * -0.5 = -16
    });

    test('should return small positive change for win against lower-rated opponent', () => {
      const change = calculator.calculateEloChange(1600, 1400, 1.0);
      expect(change).toBeGreaterThan(0);
      expect(change).toBeLessThan(16); // Less than win against equal opponent
    });

    test('should return large negative change for loss against lower-rated opponent', () => {
      const change = calculator.calculateEloChange(1600, 1400, 0.0);
      expect(change).toBeLessThan(0);
      expect(change).toBeLessThan(-16); // More negative than loss against equal opponent
    });

    test('should return large positive change for win against higher-rated opponent', () => {
      const change = calculator.calculateEloChange(1400, 1600, 1.0);
      expect(change).toBeGreaterThan(16); // More than win against equal opponent
    });

    test('should return small negative change for loss against higher-rated opponent', () => {
      const change = calculator.calculateEloChange(1400, 1600, 0.0);
      expect(change).toBeLessThan(0);
      expect(change).toBeGreaterThan(-16); // Less negative than loss against equal opponent
    });

    test('should handle draw between different ratings', () => {
      const change = calculator.calculateEloChange(1600, 1400, 0.5);
      expect(change).toBeLessThan(0); // Higher-rated player loses points on draw
    });

    test('should return integer values', () => {
      const change = calculator.calculateEloChange(1523, 1487, 1.0);
      expect(Number.isInteger(change)).toBe(true);
    });

    test('should throw error for invalid result value', () => {
      expect(() => {
        calculator.calculateEloChange(1500, 1500, 0.7);
      }).toThrow('Result must be 0 (loss), 0.5 (draw), or 1.0 (win)');
    });

    test('should throw error for non-numeric player ELO', () => {
      expect(() => {
        calculator.calculateEloChange('1500', 1500, 1.0);
      }).toThrow('Player and opponent ELO must be numbers');
    });

    test('should throw error for non-numeric opponent ELO', () => {
      expect(() => {
        calculator.calculateEloChange(1500, '1500', 1.0);
      }).toThrow('Player and opponent ELO must be numbers');
    });
  });

  describe('ELO conservation property', () => {
    test('should conserve total ELO for equal ratings', () => {
      const player1Elo = 1500;
      const player2Elo = 1500;
      
      // Player 1 wins
      const player1Change = calculator.calculateEloChange(player1Elo, player2Elo, 1.0);
      const player2Change = calculator.calculateEloChange(player2Elo, player1Elo, 0.0);
      
      // Total ELO should be conserved (sum of changes should be close to 0)
      expect(player1Change + player2Change).toBe(0);
    });

    test('should conserve total ELO for draw with equal ratings', () => {
      const player1Elo = 1500;
      const player2Elo = 1500;
      
      const player1Change = calculator.calculateEloChange(player1Elo, player2Elo, 0.5);
      const player2Change = calculator.calculateEloChange(player2Elo, player1Elo, 0.5);
      
      expect(player1Change + player2Change).toBe(0);
    });
  });

  describe('K-factor verification', () => {
    test('should use K-factor of 32', () => {
      expect(calculator.K_FACTOR).toBe(32);
    });

    test('should calculate maximum change of 32 for unexpected win', () => {
      // A player with much lower rating wins against much higher rated opponent
      const change = calculator.calculateEloChange(1200, 2000, 1.0);
      expect(change).toBeCloseTo(32, 0); // Should be close to K-factor
    });

    test('should calculate maximum loss of -32 for unexpected loss', () => {
      // A player with much higher rating loses against much lower rated opponent
      const change = calculator.calculateEloChange(2000, 1200, 0.0);
      expect(change).toBeCloseTo(-32, 0); // Should be close to -K-factor
    });
  });

  describe('Edge Cases - Requirements 7.1', () => {
    describe('Equal ratings', () => {
      test('should have expected score of exactly 0.5 for equal ratings', () => {
        const expectedScore = calculator.calculateExpectedScore(1500, 1500);
        expect(expectedScore).toBe(0.5);
      });

      test('should have expected score of 0.5 for any equal rating value', () => {
        // Test various equal rating values
        const ratings = [100, 500, 1000, 1200, 1500, 1800, 2000, 2500, 3000];
        
        ratings.forEach(rating => {
          const expectedScore = calculator.calculateExpectedScore(rating, rating);
          expect(expectedScore).toBe(0.5);
        });
      });

      test('should result in +16 ELO for win with equal ratings', () => {
        const change = calculator.calculateEloChange(1500, 1500, 1.0);
        expect(change).toBe(16); // K * (1.0 - 0.5) = 32 * 0.5 = 16
      });

      test('should result in -16 ELO for loss with equal ratings', () => {
        const change = calculator.calculateEloChange(1500, 1500, 0.0);
        expect(change).toBe(-16); // K * (0.0 - 0.5) = 32 * -0.5 = -16
      });

      test('should result in 0 ELO change for draw with equal ratings', () => {
        const change = calculator.calculateEloChange(1500, 1500, 0.5);
        expect(change).toBe(0); // K * (0.5 - 0.5) = 32 * 0 = 0
      });
    });

    describe('Large rating differences', () => {
      test('should handle 800+ point rating difference (expected ~0.99 vs ~0.01)', () => {
        // 800 point difference means expected score is ~0.99 for higher player
        const higherExpected = calculator.calculateExpectedScore(2200, 1400);
        const lowerExpected = calculator.calculateExpectedScore(1400, 2200);
        
        expect(higherExpected).toBeGreaterThan(0.99);
        expect(lowerExpected).toBeLessThan(0.01);
      });

      test('should give minimal ELO gain for higher-rated player winning against much lower opponent', () => {
        // 800 point difference: higher player expected to win
        const change = calculator.calculateEloChange(2200, 1400, 1.0);
        
        // Should gain very little (close to 0)
        expect(change).toBeGreaterThanOrEqual(0);
        expect(change).toBeLessThan(2); // Less than 2 points
      });

      test('should give massive ELO loss for higher-rated player losing to much lower opponent', () => {
        // 800 point difference: higher player loses unexpectedly
        const change = calculator.calculateEloChange(2200, 1400, 0.0);
        
        // Should lose almost the full K-factor (or exactly K-factor for large differences)
        expect(change).toBeLessThan(0);
        expect(change).toBeGreaterThanOrEqual(-32); // Can be exactly -32
        expect(Math.abs(change)).toBeGreaterThan(30); // Lose more than 30 points
      });

      test('should give massive ELO gain for lower-rated player winning against much higher opponent', () => {
        // 800 point difference: lower player wins unexpectedly
        const change = calculator.calculateEloChange(1400, 2200, 1.0);
        
        // Should gain almost the full K-factor
        expect(change).toBeGreaterThan(0);
        expect(change).toBeGreaterThan(30); // Gain more than 30 points
        expect(change).toBeLessThanOrEqual(32);
      });

      test('should give minimal ELO loss for lower-rated player losing to much higher opponent', () => {
        // 800 point difference: lower player expected to lose
        const change = calculator.calculateEloChange(1400, 2200, 0.0);
        
        // Should lose very little
        expect(change).toBeLessThanOrEqual(0);
        expect(change).toBeGreaterThan(-2); // Lose less than 2 points
      });

      test('should handle extreme rating differences (1000+ points)', () => {
        // Test with 1200 point difference
        const higherWinChange = calculator.calculateEloChange(2400, 1200, 1.0);
        const lowerWinChange = calculator.calculateEloChange(1200, 2400, 1.0);
        
        // Higher player should gain almost nothing
        expect(higherWinChange).toBeGreaterThanOrEqual(0);
        expect(higherWinChange).toBeLessThan(1);
        
        // Lower player should gain almost full K-factor
        expect(lowerWinChange).toBeGreaterThan(31);
        expect(lowerWinChange).toBeLessThanOrEqual(32);
      });

      test('should handle maximum possible rating difference', () => {
        // Test with extreme difference (e.g., 2900 point difference)
        const change1 = calculator.calculateEloChange(3000, 100, 1.0);
        const change2 = calculator.calculateEloChange(100, 3000, 1.0);
        
        // Higher player wins: should gain 0 or close to 0
        expect(change1).toBeGreaterThanOrEqual(0);
        expect(change1).toBeLessThan(1);
        
        // Lower player wins: should gain full K-factor
        expect(change2).toBe(32);
      });
    });

    describe('Minimum ELO floor', () => {
      test('should handle very low ELO ratings (100)', () => {
        // Test that calculations work with minimum realistic ELO
        const change = calculator.calculateEloChange(100, 1500, 1.0);
        
        // Should be a valid integer
        expect(Number.isInteger(change)).toBe(true);
        // Should gain almost full K-factor (huge upset)
        expect(change).toBeGreaterThan(30);
      });

      test('should handle both players at minimum ELO', () => {
        const change = calculator.calculateEloChange(100, 100, 1.0);
        
        // Should behave like equal ratings
        expect(change).toBe(16);
      });

      test('should handle minimum ELO player losing to average player', () => {
        const change = calculator.calculateEloChange(100, 1500, 0.0);
        
        // Should lose very little (expected to lose)
        expect(change).toBeLessThanOrEqual(0);
        expect(change).toBeGreaterThan(-2);
      });

      test('should handle minimum ELO player drawing with average player', () => {
        const change = calculator.calculateEloChange(100, 1500, 0.5);
        
        // Should gain points (draw is good for lower player)
        expect(change).toBeGreaterThan(0);
        expect(change).toBeLessThan(32);
      });

      test('should not allow ELO to go below theoretical minimum after loss', () => {
        // Start at 100 ELO, lose to equal opponent
        const startElo = 100;
        const change = calculator.calculateEloChange(startElo, startElo, 0.0);
        const newElo = startElo + change;
        
        // New ELO should still be positive (though the calculator doesn't enforce floor)
        // This test documents that the calculator itself doesn't enforce a floor
        // The floor would be enforced by the game server
        expect(change).toBe(-16);
        expect(newElo).toBe(84); // Can go below 100
      });

      test('should handle ELO at boundary values', () => {
        // Test at various boundary values
        const boundaries = [0, 1, 50, 100, 200];
        
        boundaries.forEach(elo => {
          const winChange = calculator.calculateEloChange(elo, 1500, 1.0);
          const lossChange = calculator.calculateEloChange(elo, 1500, 0.0);
          
          // Should produce valid integer results
          expect(Number.isInteger(winChange)).toBe(true);
          expect(Number.isInteger(lossChange)).toBe(true);
          
          // Win should increase, loss should decrease
          expect(winChange).toBeGreaterThan(0);
          expect(lossChange).toBeLessThanOrEqual(0);
        });
      });
    });
  });
});
