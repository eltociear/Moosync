/*
 *  preferences.d.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

type togglePaths = { path: string; enabled: boolean }[]

type songMenu = 'compact' | 'classic'

type SystemSettings = Checkbox

type CheckboxValue = {
  key: string
  title: string
  enabled: boolean
}[]

interface Preferences {
  isFirstLaunch: boolean
  musicPaths: togglePaths
  thumbnailPath: string
  artworkPath: string
  system: SystemSettings[]
  themes: { [key: string]: ThemeDetails }
  zoomFactor: string
}
