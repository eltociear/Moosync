import { IpcEvents, PreferenceEvents } from './constants';
import { loadPreferences, loadSelectivePreference, onPreferenceChanged, savePreferences, saveSelectivePreference } from '../db/preferences';

import { WindowHandler } from '../windowManager';

export class PreferenceChannel implements IpcChannelInterface {
  name = IpcEvents.PREFERENCES
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case PreferenceEvents.LOAD_PREFERENCES:
        this.loadPreferences(event, request)
        break
      case PreferenceEvents.SAVE_PREFERENCES:
        this.savePreferences(event, request)
        break
      case PreferenceEvents.SAVE_SELECTIVE_PREFERENCES:
        this.saveSelective(event, request)
        break
      case PreferenceEvents.LOAD_SELECTIVE_PREFERENCES:
        this.loadSelective(event, request)
        break
      case PreferenceEvents.PREFERENCE_REFRESH:
        this.onPreferenceChanged(event, request)
        break
    }
  }

  private loadPreferences(event: Electron.IpcMainEvent, request: IpcRequest) {
    loadPreferences()
      .then((data) => event.reply(request.responseChannel, data))
      .catch((e) => console.error(e))
  }

  private savePreferences(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.preferences) {
      savePreferences(request.params.preferences).then((data) => event.reply(request.responseChannel, data))
    }
  }

  private saveSelective(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.key && request.params.value) {
      saveSelectivePreference(request.params.key, request.params.value, request.params.isExtension).then((data) => event.reply(request.responseChannel, data))
    }
  }

  private loadSelective(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.key) {
      loadSelectivePreference(request.params.key, request.params.isExtension).then((data) => event.reply(request.responseChannel, data))
    }
  }

  private onPreferenceChanged(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.key) {
      onPreferenceChanged(request.params.key, request.params.value)
    }
    event.reply(request.responseChannel)
  }
}

export function preferencesChanged() {
  WindowHandler.getWindow(true)?.webContents.send(PreferenceEvents.PREFERENCE_REFRESH)
}
