import { IpcRequest } from './utils/ipc/main'
import { contextBridge } from 'electron'
import { ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel: string, request: IpcRequest) => ipcRenderer.send(channel, request),

  once: (responseChannel: string, listener: (response: any) => any) => {
    ipcRenderer.once(responseChannel, (event, response) => listener(response))
  },

  on: (responseChannel: string, listener: (...args: any) => any) => {
    ipcRenderer.on(responseChannel, (event, ...args) => listener(...args))
  },
})