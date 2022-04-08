import { cleanLogs, prefixLogger } from './utils'
import { app } from 'electron'
import log from 'loglevel'

const logLevel = process.env.DEBUG_LOGGING ? log.levels.DEBUG : log.levels.INFO

cleanLogs(app.getPath('logs'))

const mainLogger = log.getLogger('Main')
mainLogger.setLevel(logLevel)
prefixLogger(app.getPath('logs'), mainLogger)

const rendererLogger = log.getLogger('Renderer')
rendererLogger.setLevel(logLevel)
prefixLogger(app.getPath('logs'), rendererLogger)

export { mainLogger as logger, rendererLogger }
