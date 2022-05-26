/*
 *  databaseEnvironment.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import NodeEnvironment from 'jest-environment-node'
import { Global } from '@jest/types'
import path from 'path'
import { SongDBInstance } from '../../src/utils/main/db/database'
import { tmpdir } from 'os'
import { v1 } from 'uuid'
import { unlink } from 'fs/promises'

export interface CustomGlobal extends Global.Global {
  dbPath: string
  SongDB: SongDBInstance
}

export default class DatabaseEnvironment extends NodeEnvironment {
  declare global: CustomGlobal

  async setup() {
    await super.setup()

    const dbPath = path.join(tmpdir(), `${v1()}.db`)
    const SongDB = new SongDBInstance(dbPath)

    this.global.dbPath = dbPath
    this.global.SongDB = SongDB
  }

  async teardown() {
    try {
      this.global.SongDB.close()
      await unlink(this.global.dbPath)
    } catch (e) {
      console.error(e)
    }

    await super.teardown()
  }
}
