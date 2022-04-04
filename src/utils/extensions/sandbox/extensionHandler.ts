/*
 *  extensionHandler.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { AbstractExtensionFinder, ExtensionFinder } from './extensionFinder'
import { AbstractExtensionManager, ExtensionManager } from '@/utils/extensions/sandbox/extensionManager'

import { getVersion } from '@/utils/common'

export class ExtensionHandler {
  private extensionManager: AbstractExtensionManager
  private extensionFinder: AbstractExtensionFinder
  private initialized = false
  // eslint-disable-next-line @typescript-eslint/ban-types
  private preInitializedCalls: { func: Function; args?: unknown[] }[]

  constructor(searchPaths: string[], logsPath: string) {
    this.preInitializedCalls = []
    this.extensionManager = new ExtensionManager(logsPath)
    this.extensionFinder = new ExtensionFinder(searchPaths)

    this.registerPlugins().then(() => {
      this.initialized = true
      for (const [index, f] of this.preInitializedCalls.entries()) {
        if (f.args) {
          f.func.bind(this)(...f.args)
        } else f.func.bind(this)()

        this.preInitializedCalls.splice(index)
      }
    })
  }

  private isDuplicateExtension(ext: UnInitializedExtensionItem) {
    const matches = this.extensionManager.getExtensions({ packageName: ext.packageName })
    for (const oldExt of matches) {
      const oldVer = getVersion(oldExt.version)
      const newVer = getVersion(ext.version)
      if (newVer > oldVer) {
        this.extensionManager.deregister(oldExt.packageName)
        return false
      }
      return true
    }
    return false
  }

  public async registerPlugins(): Promise<void> {
    for await (const ext of this.extensionFinder.findExtensions()) {
      if (!this.isDuplicateExtension(ext)) {
        await this.extensionManager.instantiateAndRegister(ext)
      }
    }
  }

  public async startAll() {
    if (this.initialized) {
      await this.toggleExtStatus(undefined, true)
    } else {
      this.preInitializedCalls.push({ func: this.startAll })
    }
  }

  public async toggleExtStatus(packageName: string | undefined, enabled: boolean) {
    const ext = this.extensionManager.getExtensions({ packageName })
    for (const e of ext) {
      if (enabled) {
        this.sendToExtensions(e.packageName, 'onStarted')
      } else {
        this.sendToExtensions(e.packageName, 'onStopped')
      }
      this.extensionManager.setStarted(e.packageName, enabled)
    }
  }

  public async removeExt(packageName: string) {
    // Shut down extension before removing
    await this.toggleExtStatus(packageName, false)

    this.extensionManager.deregister(packageName)
  }

  public getExtensionIcon(packageName: string) {
    const ext = this.extensionManager.getExtensions({ packageName })
    for (const e of ext) {
      return e.extensionIcon
    }
  }

  public sendEvent(event: extensionEventMessage) {
    const method: keyof MoosyncExtensionTemplate = event.type
    if (this.initialized) {
      this.sendToExtensions(event.packageName, method, event.data)
    } else {
      this.preInitializedCalls.push({ func: this.sendEvent, args: [event] })
    }
  }

  private toExtensionDetails(item: ExtensionItem): ExtensionDetails {
    return {
      name: item.name,
      desc: item.desc,
      author: item.author,
      packageName: item.packageName,
      version: item.version,
      hasStarted: item.hasStarted,
      entry: item.entry,
      preferences: item.preferences,
      extensionPath: item.extensionPath,
      extensionIcon: item.extensionIcon
    }
  }

  public getInstalledExtensions() {
    const extensions = this.extensionManager.getExtensions()
    const parsed: ExtensionDetails[] = []
    for (const e of extensions) {
      parsed.push(this.toExtensionDetails(e))
    }
    return parsed
  }

  public async sendToExtensions(
    packageName: string | undefined,
    method: keyof MoosyncExtensionTemplate,
    args?: unknown
  ) {
    for (const ext of this.extensionManager.getExtensions({ started: true, packageName })) {
      try {
        console.debug('Trying to send event:', method, 'to', ext.packageName)
        if (ext.instance[method]) {
          console.debug('Extension can handle event, sending')
          ;(ext.instance[method] as (args: unknown) => Promise<void>)(args)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  public async stopAllExtensions() {
    console.debug('Stopping all extensions')
    this.toggleExtStatus(undefined, false)
  }

  public async sendExtraEventToExtensions<T extends ExtraExtensionEventTypes>(event: ExtraExtensionEvents<T>) {
    const allData: { [key: string]: ExtraExtensionEventReturnType<T> | undefined } = {}
    for (const ext of this.extensionManager.getExtensions({ started: true, packageName: event.packageName })) {
      allData[ext.packageName] = await ext.global.api._emit({
        type: event.type,
        data: event.data
      })
    }

    return allData
  }
}
