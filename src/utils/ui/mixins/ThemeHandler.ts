/*
 *  ThemeHandler.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Component } from 'vue-property-decorator'
import Vue from 'vue'
import { ThemeStore } from '@/mainWindow/store/themes'
@Component
export default class ThemeHandler extends Vue {
  private root = document.documentElement
  private _themeStore: ThemeStore | undefined

  public setColorsToRoot(theme: ThemeDetails | undefined) {
    const colors = theme?.theme
    if (!colors) {
      this.root.style.cssText = ''
    }
    for (const key in colors) {
      this.root.style.setProperty(`--${key}`, colors[key as keyof ThemeItem])
    }

    this.setRGBValues()
  }

  get themeStore() {
    return this._themeStore
  }

  set themeStore(vxm: ThemeStore | undefined) {
    this._themeStore = vxm
  }

  private setRGBValues() {
    const docStyle = getComputedStyle(this.root)
    const keys = [
      'primary',
      'secondary',
      'tertiary',
      'textPrimary',
      'textSecondary',
      'textInverse',
      'accent',
      'divider'
    ]
    for (const key of keys) {
      this.root.style.setProperty(`--${key}-rgb`, this.hexToRgb(docStyle.getPropertyValue(`--${key}`).trim()))
    }
  }

  private hexToRgb(hex: string) {
    if (hex.startsWith('#')) {
      hex = hex.substring(1)
    }

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    return [r, g, b].join(',')
  }

  public fetchThemeFromID() {
    window.ThemeUtils.getActiveTheme().then((theme) => this.setColorsToRoot(theme))
  }

  public fetchSongView() {
    window.ThemeUtils.getSongView().then(
      (view) => this.themeStore && ((this._themeStore as ThemeStore).songView = view)
    )
  }

  mounted() {
    this.fetchSongView()
    this.fetchThemeFromID()
  }
}
