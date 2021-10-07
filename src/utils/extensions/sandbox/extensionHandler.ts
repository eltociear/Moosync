/* 
 *  extensionHandler.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { AbstractExtensionFinder, ExtensionFinder } from './extensionFinder';
import { AbstractExtensionManager, ExtensionManager } from '@/utils/extensions/sandbox/extensionManager';

import { MoosyncExtensionTemplate } from '@moosync/moosync-types';
import { getVersion } from '@/utils/common';

export class ExtensionHandler {

  private extensionManager: AbstractExtensionManager
  private extensionFinder: AbstractExtensionFinder
  private initialized: boolean = false
  private preInitializedCalls: { func: Function, args?: any[] }[]

  constructor(searchPaths: string[], logsPath: string) {
    this.preInitializedCalls = []
    this.extensionManager = new ExtensionManager(logsPath)
    this.extensionFinder = new ExtensionFinder(searchPaths)

    this.registerPlugins().then(() => {
      this.initialized = true
      for (const [index, f] of this.preInitializedCalls.entries()) {
        if (f.args) {
          f.func.bind(this)(...f.args)
        } else
          f.func.bind(this)()

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
        this.extensionManager.instantiateAndRegister(ext)
      }
    }
  }

  public startAll() {
    if (this.initialized) {
      for (const ext of this.extensionManager.getExtensions({ started: false })) {
        try {
          if (ext.instance.onStarted)
            ext.instance.onStarted()
          this.extensionManager.setStarted(ext.packageName, true)
        } catch (e) {
          console.error(e)
        }
      }
    } else {
      this.preInitializedCalls.push({ func: this.startAll })
    }
  }

  public toggleExtStatus(packageName: string, enabled: boolean) {
    const ext = this.extensionManager.getExtensions({ packageName })
    try {
      for (const e of ext) {
        if (enabled) {
          if (e.instance.onStarted)
            e.instance.onStarted()
        } else {
          if (e.instance.onStopped)
            e.instance.onStopped()
        }
        this.extensionManager.setStarted(packageName, enabled)
      }
    } catch (e) {
      console.error(e)
    }
  }

  public removeExt(packageName: string) {
    // Shut down extension before removing
    this.toggleExtStatus(packageName, false)
    this.extensionManager.deregister(packageName)
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
      preferences: item.preferences
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

  public sendToExtensions(packageName: string | undefined, method: keyof MoosyncExtensionTemplate, args: any) {
    for (const ext of this.extensionManager.getExtensions({ started: true, packageName })) {
      try {
        if (ext.instance[method])
          (ext.instance[method] as Function)(args)
      } catch (e) {
        console.error(e)
      }
    }
  }
}