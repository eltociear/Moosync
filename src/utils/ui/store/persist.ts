/*
 *  persist.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Store } from 'vuex'
import merge from 'deepmerge'

export function createPersist() {
  return (store: Store<{ state: unknown }>) => {
    setInitialState(store)
  }
}

async function setInitialState(store: Store<{ state: unknown }>) {
  const savedState = await window.PreferenceUtils.loadSelective<boolean>('persisted', false)
  if (savedState) {
    store.replaceState(
      merge(store.state, savedState, {
        arrayMerge: (_, saved) => saved,
        clone: false
      })
    )
  }
}
