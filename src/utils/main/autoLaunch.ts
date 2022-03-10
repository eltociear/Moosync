/*
 *  autoLaunch.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { app } from 'electron'
import { promises as fsP, existsSync } from 'fs'
import os from 'os'
import path from 'path'

export function enableStartup(enabled: boolean) {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      enabled
    })
  } else if (process.platform === 'linux') {
    const directory = path.resolve(os.homedir(), '.config/autostart')

    const fileName = path.join(directory, `moosync.desktop`)
    if (enabled) {
      writeLinuxDesktopFile(directory, fileName)
    } else {
      removeLinuxDesktopFile(fileName)
    }
  }
}

function removeLinuxDesktopFile(fileName: string) {
  return fsP.rm(fileName, { force: true })
}

async function writeLinuxDesktopFile(directory: string, fileName: string) {
  try {
    await fsP.access(directory)
  } catch (e) {
    await fsP.mkdir(directory, { recursive: true })
  }

  const desktopFileSearchPaths = [
    '/usr/share/applications/',
    '/usr/local/share/applications/',
    path.resolve(os.homedir(), '.local/share/applications/')
  ]

  for (const searchPath of desktopFileSearchPaths) {
    const desktopFile = path.join(searchPath, 'moosync.desktop')
    console.log(desktopFile)
    if (existsSync(desktopFile)) {
      console.log('found file at', desktopFile)
      await fsP.copyFile(desktopFile, fileName)
      return
    }
  }

  // Create a new desktop file if existing one isn't found
  await fsP.writeFile(
    fileName,
    `[Desktop Entry]
Type=Application
Version=${app.getVersion()}
Name=Moosync
Comment=Moosync music player startup script
Exec=${process.execPath} ${process.env.NODE_ENV !== 'production' ? path.resolve(process.argv[1]) : ''}
StartupNotify=false
Terminal=false
X-GNOME-Autostart-enabled=true`
  )
}
