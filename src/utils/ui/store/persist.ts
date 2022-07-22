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

let hasLoaded = false

export function createPersist() {
  return (store: Store<{ state: unknown }>) => {
    setInitialState(store).then(() => {
      store.subscribe((mutation, state) => {
        // let provider: string
        // console.log(mutation)
        // if (mutation.type.includes('internal_mutator')) {
        //   provider = `${getProviderName(mutation.type)}/${mutation?.payload?.field}`
        // } else {
        //   provider = mutation.type
        // }
        // if (paths.includes(provider)) {
        // }
      })
    })
  }
}

function getProviderName(type: string) {
  return type.substring(0, type.indexOf('/'))
}

function reducer(state: object, paths: string[]) {
  // if (paths) {
  //   const ret: { [key: string]: unknown } = {}
  //   for (const [key, value] of Object.entries(state)) {
  //     if (paths.includes(key)) {
  //       ret[key] = value
  //     }
  //   }
  //   return ret
  // }
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
  hasLoaded = true
}

async function setState(state: object) {
  if (hasLoaded) await window.PreferenceUtils.saveSelective('persisted', state, false)
}
