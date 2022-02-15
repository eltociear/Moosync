/* 
 *  playwrightEnvironment.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { testWithPlaywright } from 'vue-cli-plugin-electron-builder';
import NodeEnvironment from 'jest-environment-node'
import { Config, Global } from '@jest/types'
import { ElectronApplication } from 'playwright';

interface CustomGlobal extends Global.Global {
  electronApp: ElectronApplication
  electronStop: () => Promise<ElectronApplication>
}

export default class PlaywrightEnvironment extends NodeEnvironment {
  declare global: CustomGlobal

  constructor(config: Config.ProjectConfig) {
    super(config);
  }

  async setup() {
    await super.setup();

    const { app, stop, serverUrl, serverStdout } = await testWithPlaywright()

    console.log(serverStdout, serverUrl)

    this.global.electronApp = app
    this.global.electronStop = stop
  }

  async teardown() {
    await this.global.electronStop()
    await super.teardown();
  }
}
