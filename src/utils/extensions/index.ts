/*
 *  index.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { ChildProcess, fork, Serializable } from 'child_process'
import { app, ipcMain, shell } from 'electron'
import { extensionUIRequestsKeys, mainRequests } from '@/utils/extensions/constants'
import { loadSelectivePreference, saveSelectivePreference } from '../main/db/preferences'

import { ExtensionHostEvents } from '@/utils/main/ipc/constants'
import { SongDB } from '@/utils/main/db/index'
import { WindowHandler } from '../main/windowManager'
import { async } from 'node-stream-zip'
import { promises as fsP } from 'fs'
import { getVersion } from '@/utils/common'
import path from 'path'
import { playerControlRequests } from './constants'
import { v4 } from 'uuid'
import { oauthHandler } from '@/utils/main/oauth/handler'
import { getStoreChannel } from '../main/ipc'
import { LogLevelDesc } from 'loglevel'

export const defaultExtensionPath = path.join(app.getPath('appData'), app.getName(), 'extensions')
const defaultLogPath = path.join(app.getPath('logs'))

export class MainHostIPCHandler {
  private sandboxProcess: ChildProcess

  private extensionRequestHandler = new ExtensionRequestHandler()
  private extensionResourceHandler = new ExtensionHandler()
  public mainRequestGenerator: MainRequestGenerator

  private isAlive = false
  private ignoreRespawn = false

  constructor() {
    this.sandboxProcess = this.createExtensionHost()
    this.mainRequestGenerator = new MainRequestGenerator(this.sandboxProcess, this.sendToExtensionHost.bind(this))
    this.registerListeners()
  }

  private reSpawnProcess() {
    try {
      console.debug('Killing extension host (Attempt to respawn)')
      this.sandboxProcess.kill()

      console.debug('Creating new extension host')
      this.sandboxProcess = this.createExtensionHost()

      console.debug('Registering listeners to extension host')
      this.registerListeners()
      this.mainRequestGenerator.reAssignSandbox(this.sandboxProcess)

      console.debug('Extension host respawned')
    } catch (e) {
      console.error(e)
    }
  }

  private registerListeners() {
    this.sandboxProcess.on('message', this.parseMessage.bind(this))
    this.sandboxProcess.on('error', (e) => console.error('Extension Error:', e))
    this.sandboxProcess.on('exit', () => {
      this.isAlive = false
    })
    this.sandboxProcess.on('close', () => (this.isAlive = false))
  }

  private createExtensionHost() {
    const process = fork(__dirname + '/sandbox.js', ['extensionPath', defaultExtensionPath, 'logPath', defaultLogPath])
    this.isAlive = true
    return process
  }

  public mainWindowCreated() {
    this.extensionRequestHandler.mainWindowCreated()
  }

  private parseMessage(message: mainHostMessage) {
    this.extensionRequestHandler.parseRequest(message as extensionRequestMessage).then((resp) => {
      if (resp) {
        this.sendToExtensionHost(resp)
      }
    })
  }

  public async installExtension(zipPaths: string[]): Promise<installMessage> {
    const resp = await this.extensionResourceHandler.installExtension(zipPaths, this.uninstallExtension.bind(this))
    await this.mainRequestGenerator.findNewExtensions()
    return resp
  }

  public async uninstallExtension(packageName: string): Promise<void> {
    await this.mainRequestGenerator.removeExtension(packageName)
    await this.extensionResourceHandler.uninstallExtension(packageName)

    console.debug('Removed extension', packageName)
  }

  public async sendExtraEventToExtensions<T extends ExtraExtensionEventTypes>(event: ExtraExtensionEvents<T>) {
    const data = await this.mainRequestGenerator.sendExtraEvent(event)
    return data
  }

  public async setExtensionLogLevel(level: LogLevelDesc) {
    await this.mainRequestGenerator.setLogLevel(level)
  }

  private sendToExtensionHost(data: Serializable) {
    const isKilled = !this.isAlive || !this.sandboxProcess.connected || this.sandboxProcess.killed
    if (isKilled && !this.ignoreRespawn) {
      this.reSpawnProcess()
    }

    !isKilled &&
      this.sandboxProcess.send(data, (err) => {
        if (err) {
          console.warn('Error communicating with sandbox process. Probably killed.', err.message)
        }
      })
  }

  public async closeHost() {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject('Failed to stop extension host gracefully'), 5000)
        this.mainRequestGenerator
          .stopProcess()
          .then(() => {
            clearTimeout(timeout)
            resolve()
          })
          .catch((e) => reject(e))
      })
    } catch (e) {
      console.error(e)
    }

    console.debug('Killing extension host')
    this.ignoreRespawn = true
    this.sandboxProcess.kill('SIGKILL')
  }
}

class MainRequestGenerator {
  private sandboxProcess: ChildProcess
  private _sendSync: (data: Serializable) => void

  constructor(process: ChildProcess, sendSync: (data: Serializable) => void) {
    this.sandboxProcess = process
    this._sendSync = sendSync
  }

  public reAssignSandbox(sandbox: ChildProcess) {
    this.sandboxProcess = sandbox
  }

  public async stopProcess() {
    return this.sendAsync<void>('stop-process')
  }

  public async findNewExtensions() {
    await this.sendAsync<void>('find-new-extensions')
  }

  public async getInstalledExtensions() {
    return this.sendAsync<ExtensionDetails[]>('get-installed-extensions')
  }

  public async getExtensionIcon(packageName: string) {
    return this.sendAsync<string>('get-extension-icon', { packageName })
  }

  public async toggleExtensionStatus(packageName: string, enabled: boolean) {
    return this.sendAsync<void>('toggle-extension-status', { packageName, enabled })
  }

  public async removeExtension(packageName: string) {
    return this.sendAsync<void>('remove-extension', { packageName })
  }

  public async sendExtraEvent<T extends ExtraExtensionEventTypes>(event: ExtraExtensionEvents<T>) {
    return this.sendAsync<ExtraExtensionEventCombinedReturnType<T>>('extra-extension-events', event)
  }

  public async getContextMenuItems<T extends ContextMenuTypes>(type: T) {
    return this.sendAsync<ExtendedExtensionContextMenuItems<T>>('get-extension-context-menu', { type })
  }

  public async setLogLevel(level: LogLevelDesc) {
    return this.sendAsync<void>('set-log-level', { level })
  }

  public async getAccounts() {
    return this.sendAsync<StrippedAccountDetails[]>('get-accounts')
  }

  public async performAccountLogin(packageName: string, accountId: string, loginStatus: boolean) {
    return this.sendAsync<void>('perform-account-login', { packageName, accountId, loginStatus })
  }

  public async sendContextMenuItemClicked(
    id: string,
    packageName: string,
    arg: ExtensionContextMenuHandlerArgs<ContextMenuTypes>
  ) {
    return this.sendAsync<void>('on-clicked-context-menu', { id, packageName, arg })
  }

  private sendAsync<T>(type: mainRequests, data?: unknown): Promise<T> {
    const channel = v4()

    return new Promise<T>((resolve) => {
      let listener: (data: mainReplyMessage) => void
      this.sandboxProcess.on(
        'message',
        (listener = (data: mainReplyMessage) => {
          if (data.channel === channel) {
            this.sandboxProcess.off('message', listener)
            resolve(data.data)
          }
        })
      )
      this._sendSync({ type, channel, data } as mainRequestMessage)
    })
  }
}

class ExtensionRequestHandler {
  private mainWindowCallsQueue: { func: unknown; args: Serializable[] }[] = []

  public mainWindowCreated() {
    for (const f of this.mainWindowCallsQueue) {
      ;(f.func as (...args: Serializable[]) => void)(...f.args)
    }
  }

  private requestFromMainWindow(message: extensionRequestMessage) {
    return new Promise((resolve) => {
      let listener: (event: Electron.IpcMainEvent, data: extensionReplyMessage) => void
      ipcMain.on(
        ExtensionHostEvents.EXTENSION_REQUESTS,
        (listener = (event, data: extensionReplyMessage) => {
          if (data.channel === message.channel) {
            ipcMain.off(ExtensionHostEvents.EXTENSION_REQUESTS, listener)
            resolve(data.data)
          }
        })
      )

      // Defer call till mainWindow is created
      if (WindowHandler.getWindow(true)) this.sendToMainWindow(message)
      else {
        this.mainWindowCallsQueue.push({ func: this.sendToMainWindow, args: [message] })
      }
    })
  }

  private sendToMainWindow(message: extensionRequestMessage) {
    WindowHandler.getWindow(true)?.webContents.send(ExtensionHostEvents.EXTENSION_REQUESTS, message)
  }

  private getPreferenceKey(packageName: string, key?: string) {
    let str = packageName
    if (key) str += '.' + key
    return str
  }

  public async parseRequest(message: extensionRequestMessage): Promise<extensionReplyMessage | undefined> {
    message.type && console.debug('Received message from extension', message.extensionName, message.type)
    const resp: extensionReplyMessage = { ...message, data: undefined }
    if (message.type === 'get-songs') {
      if (message.data && message.data.song && !!message.data.song?.extension) {
        message.data['song']['extension'] = message.extensionName
      }
      const songs = SongDB.getSongByOptions(message.data)
      resp.data = songs
    }

    if (message.type === 'add-songs') {
      resp.data = []
      for (const s of message.data) {
        resp.data.push(
          SongDB.store({
            ...s,
            _id: `${message.extensionName}-${s._id}`,
            providerExtension: message.extensionName
          })
        )
      }
    }

    if (message.type === 'add-playlist') {
      const playlist = message.data as Playlist
      resp.data = SongDB.createPlaylist(playlist, message.extensionName)
    }

    if (message.type === 'add-song-to-playlist') {
      SongDB.addToPlaylist(message.data.playlistID, ...message.data.songs)
    }

    if (message.type === 'remove-song') {
      await SongDB.removeSong(message.data)
    }

    if (message.type === 'get-preferences') {
      const { packageName, key, defaultValue }: { packageName: string; key?: string; defaultValue?: unknown } =
        message.data
      resp.data = await loadSelectivePreference(this.getPreferenceKey(packageName, key), true, defaultValue)
    }

    if (message.type === 'get-secure-preferences') {
      const { packageName, key, defaultValue }: { packageName: string; key?: string; defaultValue?: unknown } =
        message.data
      const secure = await getStoreChannel().getSecure(this.getPreferenceKey(packageName, key))
      if (secure) {
        resp.data = JSON.parse(secure)
      } else {
        resp.data = defaultValue
      }
    }

    if (message.type === 'set-preferences') {
      const { packageName, key, value }: { packageName: string; key: string; value: unknown } = message.data
      resp.data = saveSelectivePreference(this.getPreferenceKey(packageName, key), value, true, true)
    }

    if (message.type === 'set-secure-preferences') {
      const { packageName, key, value }: { packageName: string; key: string; value: unknown } = message.data
      resp.data = await getStoreChannel().setSecure(this.getPreferenceKey(packageName, key), JSON.stringify(value))
    }

    if (message.type === 'register-oauth') {
      oauthHandler.registerHandler(message.data, true, message.extensionName)
    }

    if (message.type === 'open-external') {
      await shell.openExternal(message.data)
    }

    if (message.type === 'register-account') {
      WindowHandler.getWindow(true)?.webContents.send(ExtensionHostEvents.ON_ACCOUNT_REGISTERED, {
        packageName: message.extensionName,
        data: message.data
      })
    }

    if (
      extensionUIRequestsKeys.includes(message.type as typeof extensionUIRequestsKeys[number]) ||
      playerControlRequests.includes(message.type as typeof playerControlRequests[number])
    ) {
      const data = await this.requestFromMainWindow(message)
      resp.data = data
    }

    return resp
  }
}

class ExtensionHandler {
  private async checkVersion(oldS: string, newS: string) {
    const oldV = getVersion(oldS)
    const newV = getVersion(newS)

    return newV > oldV
  }

  private async createDir(path: string) {
    await fsP.rm(path, { recursive: true, force: true })
    await fsP.mkdir(path, { recursive: true })
  }

  private async isExistingExtension(packageName: string): Promise<string | undefined> {
    try {
      const extPath = path.join(defaultExtensionPath, packageName)
      await fsP.access(extPath)
      const manifest = JSON.parse(await fsP.readFile(path.join(extPath, 'package.json'), 'utf-8'))
      return manifest.version
    } catch (e) {
      console.debug(`No existing extension found with packageName: ${packageName}`)
    }
  }

  public async installExtension(
    zipPaths: string[],
    uninstallMethod: (P: string) => Promise<void>
  ): Promise<installMessage> {
    for (const filePath of zipPaths) {
      const zip = new async({ file: filePath })
      const manifestRaw = await zip.entryData('package.json')
      const manifest = JSON.parse(manifestRaw.toString('utf-8'))
      if (
        manifest.moosyncExtension &&
        manifest.displayName &&
        manifest.extensionEntry &&
        manifest.name &&
        manifest.version
      ) {
        const existingVersion = await this.isExistingExtension(manifest.name)
        if (existingVersion) {
          if (!(await this.checkVersion(existingVersion, manifest.version))) {
            return {
              success: false,
              message: `Duplicate extension ${manifest.name}. Can not install`
            }
          }
          await uninstallMethod(manifest.name)
        }
        const installPath = path.join(defaultExtensionPath, manifest.name)
        await this.createDir(installPath)
        await zip.extract(null, installPath)
        return {
          success: true,
          message: 'Extension installed successfully'
        }
      }
    }
    return {
      success: false
    }
  }

  public async uninstallExtension(packageName: string) {
    if (await this.isExistingExtension(packageName)) {
      await fsP.rm(path.join(defaultExtensionPath, packageName), { recursive: true, force: true })
    }
  }
}
