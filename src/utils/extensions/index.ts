/* 
 *  index.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { ChildProcess, fork } from 'child_process';
import { app, ipcMain } from 'electron';
import { extensionUIRequestsKeys, mainRequests } from '@/utils/extensions/constants';
import { loadSelectivePreference, saveSelectivePreference } from '../main/db/preferences';

import { ExtensionHostEvents } from '@/utils/main/ipc/constants';
import { SongDB } from '@/utils/main/db/index';
import { WindowHandler } from '../main/windowManager';
import { async } from 'node-stream-zip';
import { promises as fsP } from 'fs';
import { getVersion } from '@/utils/common';
import path from 'path';
import { playerControlRequests } from './constants';
import { v4 } from 'uuid';

export const defaultExtensionPath = path.join(app.getPath('appData'), app.getName(), 'extensions')
const defaultLogPath = path.join(app.getPath('logs'))


class MainHostIPCHandler {
  private sandboxProcess: ChildProcess

  private extensionRequestHandler = new ExtensionRequestHandler()
  private extensionResourceHandler = new ExtensionHandler()
  public mainRequestGenerator: MainRequestGenerator
  public extensionEventGenerator: ExtensionEventGenerator

  private isAlive = false

  constructor() {
    this.sandboxProcess = this.createExtensionHost()
    this.mainRequestGenerator = new MainRequestGenerator(this.sandboxProcess, this.sendToExtensionHost.bind(this))
    this.extensionEventGenerator = new ExtensionEventGenerator(this.sendToExtensionHost.bind(this))
    this.registerListeners()
  }

  private reSpawnProcess() {
    try {
      this.sandboxProcess.kill()
      this.sandboxProcess = this.createExtensionHost()
      this.registerListeners()
      this.mainRequestGenerator.reAssignSandbox(this.sandboxProcess)
    } catch (e) {
      console.error(e)
    }
  }

  private registerListeners() {
    this.sandboxProcess.on("message", this.parseMessage.bind(this))
    this.sandboxProcess.on("error", (e) => console.log('got error', e))
    this.sandboxProcess.on('exit', () => { this.isAlive = false; console.log('dead') })
    this.sandboxProcess.on('close', () => this.isAlive = false)
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
    this.extensionRequestHandler.parseRequest(message as extensionRequestMessage).then(resp => this.sendToExtensionHost(resp))
  }

  public async installExtension(zipPaths: string[]): Promise<installMessage> {
    const resp = await this.extensionResourceHandler.installExtension(zipPaths, this.extensionResourceHandler.uninstallExtension.bind(this.extensionResourceHandler))
    await this.mainRequestGenerator.findNewExtensions()
    return resp
  }

  public async uninstallExtension(packageName: string): Promise<void> {
    await this.mainRequestGenerator.removeExtension(packageName)
    await this.extensionResourceHandler.uninstallExtension(packageName)

    console.log('removed ext')
  }

  private sendToExtensionHost(data: any) {
    if (!this.isAlive || !this.sandboxProcess.connected || this.sandboxProcess.killed) {
      this.reSpawnProcess()
    }
    this.sandboxProcess.killed
    this.sandboxProcess.send(data)
  }
}

class MainRequestGenerator {
  private sandboxProcess: ChildProcess
  private _sendSync: (data: any) => void

  constructor(process: ChildProcess, sendSync: (data: any) => void) {
    this.sandboxProcess = process
    this._sendSync = sendSync
  }

  public reAssignSandbox(sandbox: ChildProcess) {
    this.sandboxProcess = sandbox
  }

  public async findNewExtensions() {
    await this.sendAsync<void>('find-new-extensions')
  }

  public async getInstalledExtensions() {
    return this.sendAsync<ExtensionDetails[]>('get-installed-extensions')
  }

  public async toggleExtensionStatus(packageName: string, enabled: boolean) {
    return this.sendAsync<void>('toggle-extension-status', { packageName, enabled })
  }

  public async removeExtension(packageName: string) {
    return this.sendAsync<void>('remove-extension', { packageName })
  }

  private sendAsync<T>(type: mainRequests, data?: any): Promise<T> {
    const channel = v4()

    return new Promise<T>(resolve => {
      let listener: (data: mainReplyMessage) => void
      this.sandboxProcess.on('message', listener = (data: mainReplyMessage) => {
        if (data.channel === channel) {
          this.sandboxProcess.off('message', listener)
          resolve(data.data)
        }
      })
      this._sendSync({ type, channel, data } as mainRequestMessage)
    })
  }
}

class ExtensionEventGenerator {
  private _sendSync: (data: any) => void

  constructor(sendSync: (data: any) => void) {
    this._sendSync = sendSync
  }

  public send(data: extensionEventMessage) {
    this._sendSync(data)
  }
}

class ExtensionRequestHandler {
  private mainWindowCallsQueue: { func: Function, args: any[] }[] = []

  public mainWindowCreated() {
    for (const f of this.mainWindowCallsQueue) {
      f.func(...f.args)
    }
  }

  private requestFromMainWindow(message: extensionRequestMessage) {
    return new Promise(resolve => {
      let listener: (event: Electron.IpcMainEvent, data: extensionReplyMessage) => void
      ipcMain.on(ExtensionHostEvents.EXTENSION_REQUESTS, listener = (event, data: extensionReplyMessage) => {
        if (data.channel === message.channel) {
          ipcMain.off(ExtensionHostEvents.EXTENSION_REQUESTS, listener)
          resolve(data.data)
        }
      })

      // Defer call till mainWindow is created
      if (WindowHandler.getWindow(true))
        this.sendToMainWindow(message)
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
    if (key) str += "." + key
    return str
  }

  public async parseRequest(message: extensionRequestMessage): Promise<extensionReplyMessage | undefined> {
    const resp: extensionReplyMessage = { ...message, data: undefined }
    if (message.type === 'get-songs') {
      const songs = await SongDB.getSongByOptions(message.data)
      resp.data = songs
    }

    if (message.type === 'get-preferences') {
      const { packageName, key, defaultValue }: { packageName: string, key?: string, defaultValue?: any } = message.data
      resp.data = await loadSelectivePreference(this.getPreferenceKey(packageName, key), true, defaultValue)
    }

    if (message.type === 'set-preferences') {
      const { packageName, key, value }: { packageName: string, key: string, value: any } = message.data
      resp.data = await saveSelectivePreference(this.getPreferenceKey(packageName, key), value, true)
    }

    if (extensionUIRequestsKeys.includes(message.type as any) || playerControlRequests.includes(message.type as any)) {
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
      console.info(`No existing extension found with packageName: ${packageName}`)
      undefined
    }
  }

  public async installExtension(zipPaths: string[], uninstallMethod: (P: string) => Promise<void>): Promise<installMessage> {
    for (const filePath of zipPaths) {
      const zip = new async({ file: filePath })
      const manifestRaw = await zip.entryData('package.json')
      const manifest = JSON.parse((manifestRaw.toString('utf-8')))
      if (manifest.moosyncExtension && manifest.displayName && manifest.extensionEntry && manifest.name && manifest.version) {
        const existingVersion = await this.isExistingExtension(manifest.name)
        if (existingVersion) {
          if (!(await this.checkVersion(existingVersion, manifest.version))) {
            return {
              success: false,
              message: `Duplicate extension ${manifest.name}. Can not install`
            }
          }
          await uninstallMethod(manifest.name)
          await this.uninstallExtension.bind(this)(manifest.name)
        }
        const installPath = path.join(defaultExtensionPath, manifest.name)
        await this.createDir(installPath)
        await zip.extract(null, installPath)
        return {
          success: true,
          message: "Extension installed successfully",
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

export const extensionHost = new MainHostIPCHandler()
