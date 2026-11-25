/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test', '<rootDir>/eval', '<rootDir>/mcp'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  collectCoverageFrom: [
    'src/**/*.ts',
    'eval/**/*.ts',
    'mcp/**/*.ts',
    '!**/*.spec.ts',
    '!src/main.ts',
  ],
};
