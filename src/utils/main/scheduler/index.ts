/*
 *  index.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler'

import { getScannerChannel, getUpdateChannel } from '@/utils/main/ipc'

export function setupScanTask(scheduler: ToadScheduler) {
  const task = new AsyncTask(
    'scan task',
    () => getScannerChannel().scanAll(),
    (err: Error) => {
      console.error(err)
    }
  )

  const job = new SimpleIntervalJob({ hours: 1 }, task)

  scheduler.addSimpleIntervalJob(job)
}

export function setupUpdateCheckTask(scheduler: ToadScheduler) {
  const task = new AsyncTask(
    'update task',
    () => getUpdateChannel().checkUpdates(),
    (err: Error) => {
      console.error(err)
    }
  )

  const job = new SimpleIntervalJob({ hours: 3 }, task)

  scheduler.addSimpleIntervalJob(job)
}
