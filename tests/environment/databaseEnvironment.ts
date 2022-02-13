import NodeEnvironment from 'jest-environment-node'
import { Config, Global } from '@jest/types'
import path from 'path';
import { SongDBInstance } from '../../src/utils/main/db/database'
import { tmpdir } from 'os'
import { v1 } from 'uuid';
import { unlink } from 'fs/promises';

export interface CustomGlobal extends Global.Global {
  dbPath: string
  SongDB: SongDBInstance
}

export default class DatabaseEnvironment extends NodeEnvironment {
  declare global: CustomGlobal

  constructor(config: Config.ProjectConfig) {
    super(config);
  }

  async setup() {
    await super.setup();

    const dbPath = path.join(tmpdir(), `${v1()}.db`)
    const SongDB = new SongDBInstance(dbPath)

    this.global.dbPath = dbPath
    this.global.SongDB = SongDB
  }

  async teardown() {
    try {
      await unlink(this.global.dbPath)
    } catch (e) {
      console.error(e)
    }

    await super.teardown();
  }
}
