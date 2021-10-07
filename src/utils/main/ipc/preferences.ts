/* 
 *  preferences.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, PreferenceEvents } from './constants';
import { getActiveTheme, getSongView, loadAllThemes, loadSelectivePreference, loadTheme, onPreferenceChanged, removeTheme, saveSelectivePreference, saveTheme, setActiveTheme, setSongView } from '../db/preferences';

import { WindowHandler } from '../windowManager';

export class PreferenceChannel implements IpcChannelInterface {
  name = IpcEvents.PREFERENCES
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case PreferenceEvents.SAVE_SELECTIVE_PREFERENCES:
        this.saveSelective(event, request)
        break
      case PreferenceEvents.LOAD_SELECTIVE_PREFERENCES:
        this.loadSelective(event, request)
        break
      case PreferenceEvents.PREFERENCE_REFRESH:
        this.onPreferenceChanged(event, request)
        break
      case PreferenceEvents.SET_THEME:
        this.setTheme(event, request)
        break
      case PreferenceEvents.GET_THEME:
        this.getTheme(event, request)
        break
      case PreferenceEvents.REMOVE_THEME:
        this.removeTheme(event, request)
        break
      case PreferenceEvents.SET_ACTIVE_THEME:
        this.setActiveTheme(event, request)
        break
      case PreferenceEvents.GET_ACTIVE_THEME:
        this.getActiveTheme(event, request)
        break
      case PreferenceEvents.GET_ALL_THEMES:
        this.getAllThemes(event, request)
        break
      case PreferenceEvents.GET_SONG_VIEW:
        this.getSongView(event, request)
        break
      case PreferenceEvents.SET_SONG_VIEW:
        this.setSongView(event, request)
        break
    }
  }

  private saveSelective(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.key && request.params.value) {
      event.reply(request.responseChannel, saveSelectivePreference(request.params.key, request.params.value, request.params.isExtension))
    }
    event.reply(request.responseChannel)
  }

  private loadSelective(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.key) {
      event.reply(request.responseChannel, loadSelectivePreference(request.params.key, request.params.isExtension))
    }
    event.reply(request.responseChannel)
  }

  private onPreferenceChanged(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.key) {
      onPreferenceChanged(request.params.key, request.params.value)
    }
    event.reply(request.responseChannel)
  }

  private setTheme(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.theme) {
      saveTheme(request.params.theme)
    }
    event.reply(request.responseChannel)
  }

  private getTheme(event: Electron.IpcMainEvent, request: IpcRequest) {
    event.reply(request.responseChannel, loadTheme(request.params.id))
  }

  private removeTheme(event: Electron.IpcMainEvent, request: IpcRequest) {
    event.reply(request.responseChannel, removeTheme(request.params.id))
  }

  private getAllThemes(event: Electron.IpcMainEvent, request: IpcRequest) {
    event.reply(request.responseChannel, loadAllThemes())
  }


  private setActiveTheme(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.id) {
      const theme = loadTheme(request.params.id)
      if (theme || request.params.id === 'default') {
        setActiveTheme(request.params.id)
        WindowHandler.getWindow(true)?.webContents.send(PreferenceEvents.THEME_REFRESH, theme)
      }
    }
    event.reply(request.responseChannel)
  }

  private getActiveTheme(event: Electron.IpcMainEvent, request: IpcRequest) {
    event.reply(request.responseChannel, getActiveTheme())
  }

  private setSongView(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.menu) {
      setSongView(request.params.menu)
      WindowHandler.getWindow(true)?.webContents.send(PreferenceEvents.SONG_VIEW_REFRESH, request.params.menu)
    }
    event.reply(request.responseChannel)
  }

  private getSongView(event: Electron.IpcMainEvent, request: IpcRequest) {
    event.reply(request.responseChannel, getSongView())
  }
}