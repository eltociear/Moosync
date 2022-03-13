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

type StyleElement = {
  sheet: CSSStyleSheet
}

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
    this.setCheckboxValues()
  }

  get themeStore() {
    return this._themeStore
  }

  set themeStore(vxm: ThemeStore | undefined) {
    this._themeStore = vxm
  }

  private setCheckboxValues() {
    const docStyle = getComputedStyle(this.root)
    let style = document.getElementById('checkbox-stylesheet')
    if (!style) {
      style = document.createElement('style')
      style.id = 'checkbox-stylesheet'
      document.head.appendChild(style)
    }

    const sheet = (style as unknown as StyleElement).sheet
    if (sheet.cssRules.length > 0) {
      sheet.deleteRule(0)
    }
    sheet.insertRule(
      `.custom-checkbox .custom-control-input:checked ~ .custom-control-label::after { background-image: url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%278%27 height=%278%27 viewBox=%270 0 8 8%27%3e%3cpath fill=%27%23${docStyle
        .getPropertyValue('--textPrimary')
        .replace('#', '')
        .trim()
        .toLowerCase()}%27 d=%27M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z%27/%3e%3c/svg%3e") !important; }`
    )
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
