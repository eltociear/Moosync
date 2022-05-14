/*
 *  index.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Console } from 'console'
import { WriteStream, createWriteStream, readdir, unlink } from 'fs'

import log from 'loglevel'
import path from 'path'
import stripAnsi from 'strip-ansi'
import { Tail } from 'tail'

let filePath: string
let fileStream: WriteStream
let fileConsole: Console | undefined

let logLevel: log.LogLevelDesc = process.env.DEBUG_LOGGING ? log.levels.TRACE : log.levels.INFO

const activeLoggers: log.Logger[] = []

export function setLogLevel(level: log.LogLevelDesc) {
  logLevel = level
  for (const l of activeLoggers) {
    l.setLevel(logLevel)
  }
}

export function getLoggerLevel() {
  return logLevel
}

export function cleanLogs(basePath: string) {
  const lowestDate = new Date(Date.now())
  lowestDate.setDate(lowestDate.getDate() - 7)
  readdir(basePath, (err, files) => {
    if (!err) {
      for (const file of files) {
        if (file.startsWith('moosync-') && file.endsWith('.log')) {
          const day = file.substring(8, 10)
          const month = file.substring(11, 13)
          const year = file.substring(14, 18)
          const fileDate = new Date(`${month}-${day}-${year}`)
          if (fileDate.getTime() - lowestDate.getTime() < 0) {
            unlink(path.join(basePath, file), console.error)
          }
        }
      }
    }
  })
}

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

function createFile(basePath: string) {
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const newFile = `moosync-${new Date().toLocaleDateString('en-GB').replaceAll('/', '-')}${
    isDevelopment ? '-development' : ''
  }.log`
  const newPath = path.join(basePath, newFile)

  if (filePath !== newPath) {
    filePath = newPath
    fileStream && fileStream.end()

    fileStream = createWriteStream(newPath, { flags: 'a' })
    fileConsole = new Console(fileStream, fileStream)
  }
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

type logMethods = 'trace' | 'debug' | 'warn' | 'info' | 'error'

export function prefixLogger(basePath: string, logger: log.Logger) {
  const stockConsole = new Console({
    stdout: process.stdout,
    stderr: process.stderr,
    colorMode: false
  })

  logger.methodFactory = (methodName, logLevel, loggerName) => {
    createFile(basePath)
    return (...args) => {
      const prefix = generatePrefix(methodName, loggerName)
      stockConsole[methodName as logMethods](prefix, ...args)
      fileConsole && fileConsole[methodName as logMethods](stripAnsi(prefix), ...args)
    }
  }
  logger.setLevel(logLevel)
  activeLoggers.push(logger)
}

export function getLogTail() {
  return new Tail(path.join(filePath), { encoding: 'utf-8', fromBeginning: true, follow: true })
}
