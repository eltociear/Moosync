/* 
 *  persist.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import * as shvl from 'shvl'

import { Store } from 'vuex'
import merge from 'deepmerge'

let hasLoaded = false

export function createPersist(paths: string[]) {
  return (store: Store<any>) => {
    setInitialState(store).then(() => {
      store.subscribe((mutation, state) => {
        setState(reducer(state, paths))
      })
    })
  }
}

function reducer(state: Object, paths: string[]) {
  return Array.isArray(paths)
    ? paths.reduce(function (substate, path) {
      return shvl.set(substate, path, shvl.get(state, path))
    }, {})
    : state
}

async function setInitialState(store: Store<any>) {
  const savedState = await window.PreferenceUtils.loadSelective<any>('persisted', false)
  if (savedState) {
    store.replaceState(
      merge(store.state, savedState, {
        arrayMerge: (_, saved) => saved,
        clone: false,
      })
    )
  }
  hasLoaded = true
}

async function setState(state: any) {
  if (hasLoaded)
    await window.PreferenceUtils.saveSelective('persisted', state, false)
}
