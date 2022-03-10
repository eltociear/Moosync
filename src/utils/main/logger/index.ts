import { prefixLogger } from './utils'
import { app } from 'electron'
import log from 'loglevel'

const logLevel = process.env.NODE_ENV !== 'production' ? log.levels.DEBUG : log.levels.INFO

const mainLogger = log.getLogger('Main')
mainLogger.setLevel(logLevel)
prefixLogger(app.getPath('logs'), mainLogger)

const rendererLogger = log.getLogger('Renderer')
rendererLogger.setLevel(logLevel)
prefixLogger(app.getPath('logs'), rendererLogger)

export { mainLogger as logger, rendererLogger }
