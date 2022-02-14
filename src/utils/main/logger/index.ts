/* 
 *  index.ts is a part of Moosync.
 *  
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { WriteStream, createWriteStream } from 'fs'

import log from 'loglevel';
import path from "path";

let fileName: string
let fileStream: WriteStream

function getLevel(method: string) {
  return method.charAt(0).toUpperCase() + method.slice(1);
}

function getTimestamp() {
  const dt = new Date();

  return `${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')}-${dt.getFullYear().toString().padStart(4, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt.getSeconds().toString().padStart(2, '0')}`
}

function generatePrefix(level: string, loggerName: string | symbol) {
  return `[${getTimestamp()}] [${getLevel(level)}] [${String(loggerName) ?? 'Main'}]: `
}

function concatArgs(...messages: any[]) {
  let ret = ''
  for (const m of messages) ret += ((typeof m === 'object') ? JSON.stringify(m) : m) + ' '

  return ret.trim() + '\n'
}

function createFile(basePath: string) {
  const newFile = `moosync-${new Date().toLocaleDateString('en-GB').replaceAll('/', '-')}.log`
  if (fileName !== newFile) {
    fileName = newFile
    fileStream && fileStream.end()

    const newPath = path.join(basePath, newFile)
    fileStream = createWriteStream(newPath, { flags: 'a' })
  }
}

async function streamToFile(basePath: string, message: string) {
  createFile(basePath)
  fileStream.write(message)
}

export function prefixLogger(basePath: string, logger: log.RootLogger | log.Logger) {
  logger.methodFactory = (methodName, logLevel, loggerName) => {
    return (...args: any[]) => {
      const prefix = generatePrefix(methodName, loggerName)
      const final = concatArgs(prefix, ...args)
      streamToFile(basePath, final)
    };
  };
  logger.setLevel(logger.getLevel());
}
