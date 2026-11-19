module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/department*.test.ts?(x)'],
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs', jsx: 'react-jsx', target: 'ES2022', esModuleInterop: true }, diagnostics: true }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  clearMocks: true,
};
