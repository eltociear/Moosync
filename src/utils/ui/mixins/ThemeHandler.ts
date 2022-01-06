/* 
 *  ThemeHandler.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { Component } from 'vue-property-decorator'
import Vue from 'vue'
import { vxm } from '../../../mainWindow/store/index';

@Component
export default class ThemeHandler extends Vue {
  private root = document.documentElement

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

  private setRGBValues() {
    const docStyle = getComputedStyle(this.root)
    const keys = ['primary', 'secondary', 'tertiary', 'textPrimary', 'textSecondary', 'textInverse', 'accent', 'divider']
    for (const key of keys) {
      this.root.style.setProperty(`--${key}-rgb`, this.hexToRgb(docStyle.getPropertyValue(`--${key}`).trim()))
    }
  }

  private hexToRgb(hex: string) {
    const arrBuff = new ArrayBuffer(4);
    const vw = new DataView(arrBuff);
    vw.setUint32(0, parseInt(hex.replace('#', ''), 16), false);
    const arrByte = new Uint8Array(arrBuff);

    return arrByte[1] + "," + arrByte[2] + "," + arrByte[3];
  }

  public fetchThemeFromID() {
    window.ThemeUtils.getActiveTheme().then(theme => this.setColorsToRoot(theme))
  }

  public fetchSongView() {
    window.ThemeUtils.getSongView().then((view) => vxm.themes.songView = view)
  }

  mounted() {
    this.fetchSongView()
    this.fetchThemeFromID()
  }
}
