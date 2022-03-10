/*
 *  index.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { WriteStream, createWriteStream } from 'fs'

import log from 'loglevel'
import path from 'path'
import stripAnsi from 'strip-ansi'

let fileName: string
let fileStream: WriteStream

function getLevel(method: string) {
  return method.toUpperCase()
}

function getTimestamp() {
  const dt = new Date()

  return `${(dt.getMonth() + 1).toString().padStart(2, '0')}-${dt.getDate().toString().padStart(2, '0')}-${dt
    .getFullYear()
    .toString()
    .padStart(4, '0')} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}:${dt
    .getSeconds()
    .toString()
    .padStart(2, '0')}`
}

function generatePrefix(level: string, loggerName: string | symbol) {
  return `\u001b[1m${getColor(level)}[${getTimestamp()}] [${getLevel(level)}] [${
    String(loggerName) ?? 'Main'
  }]: \u001b[0m${getColor(level)}`
}

function concatArgs(...messages: (string | object)[]) {
  let ret = ''
  for (const m of messages) ret += (typeof m === 'object' ? JSON.stringify(m) : m) + ' '

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

function getColor(level: string) {
  const outputColors: { [key: string]: string } = {
    trace: '\u001b[35m',
    debug: '\u001b[36m',
    info: '\u001b[34m',
    warn: '\u001b[33m',
    error: '\u001b[31m'
  }

  return outputColors[level]
}

export function prefixLogger(basePath: string, logger: log.Logger) {
  const originalFactory = log.methodFactory
  logger.methodFactory = (methodName, logLevel, loggerName) => {
    const originalMethod = originalFactory(methodName, logLevel, loggerName)
    return (...args) => {
      const prefix = generatePrefix(methodName, loggerName)
      const final = concatArgs(prefix, ...args).trim() + '\u001b[0m'
      originalMethod(final)
      streamToFile(basePath, stripAnsi(final) + '\n')
    }
  }
  logger.setLevel(logger.getLevel())
}
