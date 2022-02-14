/* 
 *  delete.test.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

/**
 * @jest-environment ./tests/environment/databaseEnvironment.ts
 */
import { SongDBInstance } from '@/utils/main/db/database'
import { CustomGlobal } from '../../environment/databaseEnvironment'
import { insertSong } from './common'

declare const global: (typeof globalThis) & CustomGlobal

let SongDB: SongDBInstance

beforeAll(async () => {
  SongDB = global.SongDB
})

test('Remove a song from DB', async () => {
  const inserted = await insertSong(SongDB, {
    size: 2
  })

  let count = inserted.length

  for (const i of inserted) {
    await SongDB.removeSong(i._id)

    const oldCount = count
    count = SongDB.getSongByOptions().length

    expect(count).toBe(oldCount - 1)
  }

  expect(count).toBe(0)
})