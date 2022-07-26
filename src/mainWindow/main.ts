/*
 *  main.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import '@/mainWindow/plugins/recycleScroller'
import '@/mainWindow/plugins/toasted'
import '@/mainWindow/plugins/vueBootstrap'
import '@/mainWindow/plugins/tags-typeahead'
import '@/mainWindow/plugins/vueSliderBar'
import '@/mainWindow/plugins/inlineSVG'
import { i18n } from '@/mainWindow/plugins/i18n'
import '@/sass/global.sass'
import 'animate.css'

import App from '@/mainWindow/App.vue'
import Vue from 'vue'
import router from '@/mainWindow/plugins/router'
import { store } from '@/mainWindow/store'
import { getErrorMessage } from '@/utils/common'

Vue.config.productionTip = false
Vue.config.devtools = false

function registerLogger() {
  const preservedConsoleInfo = console.info
  const preservedConsoleError = console.error
  const preservedConsoleWarn = console.warn
  const preservedConsoleDebug = console.debug
  const preservedConsoleTrace = console.trace

  console.info = (...args: unknown[]) => {
    preservedConsoleInfo.apply(console, args)
    window.LoggerUtils.info(...args)
  }

  console.error = (...args: unknown[]) => {
    const error = getErrorMessage(...args)
    preservedConsoleError.apply(console, args)
    window.LoggerUtils.error(...error)
  }

  console.warn = (...args: unknown[]) => {
    preservedConsoleWarn.apply(console, args)
    window.LoggerUtils.warn(...args)
  }

  console.debug = (...args: unknown[]) => {
    preservedConsoleDebug.apply(console, args)
    window.LoggerUtils.debug(...args)
  }

  console.trace = (...args: unknown[]) => {
    preservedConsoleTrace.apply(console, args)
    window.LoggerUtils.trace(...args)
  }

  window.onerror = (err) => {
    const error = getErrorMessage(err)
    console.error(...error)
  }

  Vue.config.errorHandler = (err) => {
    console.error(err)
  }
}

registerLogger()

export const bus = new Vue()

new Vue({
  components: { App },
  router,
  store,
  i18n,
  template: '<App/>'
}).$mount('#app')
