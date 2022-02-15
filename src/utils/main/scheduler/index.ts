/* 
 *  index.ts is a part of Moosync.
 *  
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler';

import { scannerChannel } from '@/utils/main/ipc';

export const scheduler = new ToadScheduler()

export function setupScanTask() {
  const task = new AsyncTask(
    'scan task',
    () => scannerChannel.ScanSongs(),
    (err: Error) => { console.error(err) }
  )

  const job = new SimpleIntervalJob({ hours: 1, }, task)

  scheduler.addSimpleIntervalJob(job)
}