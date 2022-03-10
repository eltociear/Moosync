import { prefixLogger } from './utils'
import { app } from 'electron'
import log from 'loglevel'

const mainLogger = log.getLogger('Main')
mainLogger.setLevel(log.levels.DEBUG)
prefixLogger(app.getPath('logs'), mainLogger)

const rendererLogger = log.getLogger('Renderer')
rendererLogger.setLevel(log.levels.DEBUG)
prefixLogger(app.getPath('logs'), rendererLogger)

export { mainLogger as logger, rendererLogger }
