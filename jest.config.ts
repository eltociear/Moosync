/* 
 *  jest.config.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

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