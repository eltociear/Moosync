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
export const bus = new Vue()

new Vue({
  components: { App },
  router,
  store,
  template: '<App/>',
}).$mount('#app')
