/* 
 *  preferences.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import Store from 'electron-store';
import { app } from 'electron';
import { enableStartup } from '../autoLaunch';
import path from 'path';
import { scannerChannel } from '../ipc';
import { setMinimizeToTray } from '@/utils/main/windowManager';

const defaultPreferences: Preferences = {
  musicPaths: [],
  thumbnailPath: path.join(app.getPath('appData'), app.getName(), '.thumbnails'),
  artworkPath: path.join(app.getPath('appData'), app.getName(), '.thumbnails'),
  systemSettings: [],
  themes: {}
}

const store = new Store({
  defaults: defaultPreferences,
  serialize: value => JSON.stringify(value)
})

export function savePreferences(prefs: Preferences) {
  store.set('prefs', prefs)
}

export function saveTheme(theme: ThemeDetails) {
  store.set(`themes.${theme.id}`, theme)
}

export function removeTheme(id: string) {
  store.delete(`themes.${id}` as any)
}

export function loadTheme(id: string): ThemeDetails | undefined {
  return store.get(`themes.${id}`) as ThemeDetails | undefined
}

export function loadAllThemes(): { [key: string]: ThemeDetails } | undefined {
  return store.get(`themes`) as { [key: string]: ThemeDetails } | undefined
}

export function setActiveTheme(id: string) {
  saveSelectivePreference('activeTheme', id, false)
}

export function setSongView(menu: songMenu) {
  saveSelectivePreference('songView', menu, false)
}

export function getSongView(): songMenu | undefined {
  return loadSelectivePreference('songView', false, 'compact' as songMenu)
}

export function setWindowSize(windowName: string, windowSize: { width: number, height: number }) {
  store.set(`window.${windowName}`, windowSize)
}

export function getWindowSize(windowName: string, defaultValue: { width: number, height: number }) {
  return store.get(`window.${windowName}`, defaultValue)
}

export function getActiveTheme() {
  const id = loadSelectivePreference('activeTheme', false) as string
  if (id) {
    return loadTheme(id)
  }
}

export function saveSelectivePreference(key: string, value: any, isExtension: boolean = false) {
  store.set(`prefs.${isExtension ? 'extension.' : ''}${key}`, value)
}

export function loadSelectivePreference<T>(key?: string, isExtension: boolean = false, defaultValue?: T): T | undefined {
  try {
    const pref = store.get(`prefs.${isExtension ? 'extension.' : ''}${key}`, defaultValue)
    return pref
  } catch (e) {
    console.error(e)
  }
  return undefined
}

export function setInitialInterfaceSettings() {
  onPreferenceChanged('system', loadPreferences()?.systemSettings)
}

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

export function getDisabledPaths(paths: togglePaths): string[] {
  const disablePaths = []
  for (const p of paths) {
    if (!p.enabled) disablePaths.push(p.path)
  }
  return disablePaths
}

function setupDefaultThemes() {
  const themes: { [key: string]: ThemeDetails } = {
    '809b7310-f852-11eb-82e2-0985b6365ce4': {
      id: "809b7310-f852-11eb-82e2-0985b6365ce4",
      name: "Fluid",
      author: "Androbuddy",
      theme: {
        primary: "#202125",
        secondary: "#2D2F36",
        tertiary: "#27292E",
        textPrimary: "#FFFFFF",
        textSecondary: "rgba(255, 255, 255, 0.32)",
        textInverse: "#000000",
        accent: "#72BBFF",
        divider: "rgba(79, 79, 79, 0.67)"
      }
    }
  }

  for (const key in themes) {
    if (!store.has(`themes.${key}`)) {
      saveTheme(themes[key])
    }
  }
}

savePreferences(loadPreferences())
setupDefaultThemes()
