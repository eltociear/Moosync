/* 
 *  autoLaunch.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { app } from 'electron'
import { promises as fsP } from 'fs';
import os from 'os';
import path from 'path';

export function enableStartup(enabled: boolean) {
  if (process.platform === 'win32' || process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      enabled,
    })
  } else if (process.platform === 'linux') {
    const directory = path.resolve(os.homedir(), '.config/autostart')
    const fileName = path.join(directory, `moosync.desktop-${process.env.NODE_ENV}`)
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

  await fsP.writeFile(fileName,
    `[Desktop Entry]
Type=Application
Version=${app.getVersion()}
Name=Moosync
Comment=Moosync music player startup script
Exec=${process.execPath} ${process.env.NODE_ENV !== 'production' ? path.resolve(process.argv[1]) : ''}
StartupNotify=false
Terminal=false`)
}