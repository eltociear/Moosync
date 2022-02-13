import type { Config } from '@jest/types';
// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  testEnvironment: './tests/environment/playwrightEnvironment.ts',
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1"
  },
  collectCoverageFrom: [
    "src/**/*.ts",
  ],
};
export default config;