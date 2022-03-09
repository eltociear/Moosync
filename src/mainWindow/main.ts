/* 
 *  main.ts is a part of Moosync.
 *  
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import '@/mainWindow/plugins/carousel'
import '@/mainWindow/plugins/recycleScroller'
import '@/mainWindow/plugins/toasted'
import '@/mainWindow/plugins/vueBootstrap'
import '@/mainWindow/plugins/vueSliderBar'
import '@/sass/global.sass'
import 'animate.css'

import App from '@/mainWindow/App.vue'
import Vue from 'vue'
import router from '@/mainWindow/plugins/router'
import { store } from '@/mainWindow/store'

Vue.config.productionTip = false
Vue.config.devtools = false

function getErrorMessage(...args: any[]) {
  const ret = []
  for (const data of args) {
    if (data instanceof Error) {
      ret.push(args[0].stack)
    } else {
      ret.push(data)
    }
  }

  return ret
}

function registerLogger() {
  const preservedConsoleInfo = console.info
  const preservedConsoleError = console.error
  const preservedConsoleWarn = console.warn
  const preservedConsoleDebug = console.debug
  const preservedConsoleTrace = console.trace

  if (window.LoggerUtils && window.LoggerUtils.info && window.LoggerUtils.error) {
    console.info = (...args: any[]) => {
      preservedConsoleInfo.apply(console, args)
      window.LoggerUtils.info(...args)
    }

    console.error = (...args: any[]) => {
      const error = getErrorMessage(...args)
      preservedConsoleError.apply(console, args)
      window.LoggerUtils.error(...error)
    }

    console.warn = (...args: any[]) => {
      preservedConsoleWarn.apply(console, args)
      window.LoggerUtils.warn(...args)
    }

    console.debug = (...args: any[]) => {
      preservedConsoleDebug.apply(console, args)
      window.LoggerUtils.debug(...args)
    }

    console.trace = (...args: any[]) => {
      preservedConsoleTrace.apply(console, args)
      window.LoggerUtils.trace(...args)
    }

    window.onerror = (err) => {
      const error = getErrorMessage(err)
      window.LoggerUtils.error(...error)
    }

    Vue.config.errorHandler = (err, vm, info) => {
      window.LoggerUtils.error(err)
    }
  }
}

registerLogger()

export const bus = new Vue()

new Vue({
  components: { App },
  router,
  store,
  template: '<App/>',
}).$mount('#app')
