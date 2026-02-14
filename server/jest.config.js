module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!jest.config.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testTimeout: 10000,
  verbose: true
};
