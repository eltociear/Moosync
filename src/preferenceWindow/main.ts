/* 
 *  main.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import '@/preferenceWindow/plugins/vueBootstrap'
import '@/sass/global.sass'
import 'animate.css'

import App from './Preferences.vue'
import Vue from 'vue'
import router from '@/preferenceWindow/plugins/router'

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

new Vue({
  components: { App },
  router,
  template: '<App/>',
}).$mount('#app')
