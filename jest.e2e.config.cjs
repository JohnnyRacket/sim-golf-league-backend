module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/e2e/tests/**/*.e2e-spec.ts',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/test/e2e/helpers/setup.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**/*.ts'
  ],
  coverageDirectory: 'coverage',
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs' } }]
  },
  reporters: [
    'default',
    '<rootDir>/test/e2e/summarize-failures.cjs'
  ]
};
