import { cleanLogs, prefixLogger } from './utils'
import { app } from 'electron'
import log from 'loglevel'

cleanLogs(app.getPath('logs'))

const mainLogger = log.getLogger('Main')
prefixLogger(app.getPath('logs'), mainLogger)

const rendererLogger = log.getLogger('Renderer')
prefixLogger(app.getPath('logs'), rendererLogger)

export { mainLogger as logger, rendererLogger }
