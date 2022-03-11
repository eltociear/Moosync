/*
 *  router.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import Router from 'vue-router'
import Vue from 'vue'
import { createRouterLayout } from 'vue-router-layout'
import routes from 'vue-auto-routing'

Vue.use(Router)

const RouterLayout = createRouterLayout((layout) => {
  return import('@/mainWindow/layouts/' + layout + '.vue')
})

export default new Router({
  mode: process.env.IS_ELECTRON ? 'hash' : 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      component: RouterLayout,
      children: routes
    }
  ]
})
