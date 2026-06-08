const path = require('node:path');

module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@gtcs/shared$': path.join(__dirname, '../../packages/shared/src'),
  },
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testEnvironment: 'node',
  testMatch: ['**/*.e2e-spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
};
