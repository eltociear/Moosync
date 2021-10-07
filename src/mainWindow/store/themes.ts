/* 
 *  themes.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { VuexModule } from './module';

export class ThemeStore extends VuexModule.With({ namespaced: 'themes' }) {
  private _songView: songMenu = 'compact'
  private _sortBy: sortOptions = { type: 'date', asc: true }
  private _refreshPage = false

  get sortBy() {
    return this._sortBy
  }

  set sortBy(options: sortOptions) {
    this._sortBy = options
  }

  get songView() {
    return this._songView
  }

  set songView(menu: songMenu) {
    this._songView = menu
  }

  get refreshPage() {
    return this._refreshPage
  }

  set refreshPage(val: boolean) {
    this._refreshPage = val
  }
}
