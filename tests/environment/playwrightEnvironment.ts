/*
 *  playwrightEnvironment.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { testWithPlaywright } from 'vue-cli-plugin-electron-builder'
import NodeEnvironment from 'jest-environment-node'
import { Global } from '@jest/types'

export interface CustomGlobal extends Global.Global {
  electronInstance: Awaited<ReturnType<typeof testWithPlaywright>>
}

export default class PlaywrightEnvironment extends NodeEnvironment {
  declare global: CustomGlobal

  async setup() {
    await super.setup()

    const instance = await testWithPlaywright()

    console.info(instance.serverStdout, instance.serverUrl)

    this.global.electronInstance = instance
  }

  async teardown() {
    await this.global.electronInstance.stop()
    await super.teardown()
  }
}
