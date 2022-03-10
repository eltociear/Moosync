/*
 *  preferences.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import Store from 'electron-store'
import { app } from 'electron'
import { enableStartup } from '../autoLaunch'
import path from 'path'
import { scannerChannel } from '../ipc'
import { setMinimizeToTray } from '@/utils/main/windowManager'

const defaultPreferences: Preferences = {
  isFirstLaunch: true,
  musicPaths: [{ path: getDefaultMusicPaths(), enabled: true }],
  thumbnailPath: path.join(app.getPath('appData'), app.getName(), '.thumbnails'),
  artworkPath: path.join(app.getPath('appData'), app.getName(), '.thumbnails'),
  systemSettings: [],
  themes: {}
}

export const store = new Store({
  defaults: { prefs: defaultPreferences },
  serialize: (value) => JSON.stringify(value)
})

/**
 * Saves preferences
 * All preferences are stored under a key "prefs"
 * @param prefs preferences to be stored
 */
export function savePreferences(prefs: Preferences) {
  store.set('prefs', prefs)
}

/**
 * Sets last used window size
 * @param windowName name of window whose size is to be set
 * @param windowSize size of window. Dictionary with width and height keys containing width and height of that window
 */
export function setWindowSize(windowName: string, windowSize: { width: number; height: number }) {
  store.set(`window.${windowName}`, windowSize)
}

/**
 * Gets window size
 * @param windowName name of window whose size is to be fetched
 * @param defaultValue default size in width and height
 * @returns
 */
export function getWindowSize(windowName: string, defaultValue: { width: number; height: number }) {
  return store.get(`window.${windowName}`, defaultValue)
}

/**
 * Saves a single key inside "prefs". Deep keys can be accessed by "." separator.
 * @param key
 * @param value
 * @param [isExtension] true if preference is of an extension. false otherwise
 */
export function saveSelectivePreference(key: string, value: unknown, isExtension = false) {
  store.set(`prefs.${isExtension ? 'extension.' : ''}${key}`, value)
}

/**
 * Loads selective preference inside "prefs"
 * @template T expected object which will be returned
 * @param [key]
 * @param [isExtension] true if preference is of an extension. false otherwise
 * @param [defaultValue]
 * @returns object belonging to given key
 */
export function loadSelectivePreference<T>(key?: string, isExtension = false, defaultValue?: T): T | undefined {
  try {
    const pref = store.get(`prefs.${isExtension ? 'extension.' : ''}${key}`, defaultValue)
    return pref
  } catch (e) {
    console.error(e)
  }
  return undefined
}

/**
 * Removes selective preference inside "prefs"
 * @param key key to remove inside prefs
 */
export function removeSelectivePreference(key: string, isExtension = false) {
  store.delete(`prefs.${isExtension ? 'extension.' : ''}${key}` as never)
}

/**
 * Sets initial interface settings
 */
export function setInitialInterfaceSettings() {
  onPreferenceChanged('system', loadPreferences()?.systemSettings)
}

/**
 * Should be called when preferences are changed
 * @param key
 * @param value
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function onPreferenceChanged(key: string, value: any) {
  if (key === 'system' && value) {
    for (const val of value) {
      if (val.key === 'startOnStartup') {
        val.enabled !== undefined && enableStartup(val.enabled)
      }

      if (val.key === 'minimizeToTray') {
        val.enabled !== undefined && setMinimizeToTray(val.enabled)
      }
    }
    return
  }

  if (key === 'musicPaths') {
    scannerChannel.ScanSongs()
    return
  }
}

/**
 * Validates preferences
 * @param prefs to be validated
 * @returns corrected prefs
 */
function validatePrefs(prefs: Preferences): Preferences {
  if (prefs) {
    if (!prefs.musicPaths) {
      prefs.musicPaths = defaultPreferences.musicPaths
    }

    if (!prefs.thumbnailPath) {
      prefs.thumbnailPath = defaultPreferences.thumbnailPath
    }

    if (!prefs.artworkPath) {
      prefs.artworkPath = defaultPreferences.artworkPath
    }
  }

  return prefs
}

/**
 * Loads all preferences
 * @returns preferences
 */
export function loadPreferences(): Preferences {
  try {
    const tmp = store.get('prefs') as Preferences
    if (tmp) {
      return validatePrefs(tmp)
    }
  } catch (e) {
    console.error(e)
  }
  return defaultPreferences
}

// TODO: Make a generic utils file for methods like these
/**
 * Gets disabled paths from a list of paths
 * @param paths
 * @returns disabled paths
 */
export function getDisabledPaths(paths: togglePaths): string[] {
  const disablePaths = []
  for (const p of paths) {
    if (!p.enabled) disablePaths.push(p.path)
  }
  return disablePaths
}

function getDefaultMusicPaths() {
  return app.getPath('music')
}
