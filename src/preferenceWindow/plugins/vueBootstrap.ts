/*
 *  vueBootstrap.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import {
  LayoutPlugin,
  SidebarPlugin,
  TooltipPlugin,
  FormCheckboxPlugin,
  DropdownPlugin,
  ModalPlugin,
  FormInputPlugin,
  ButtonPlugin,
  ProgressPlugin,
  TablePlugin,
  PaginationPlugin,
  InputGroupPlugin
} from 'bootstrap-vue'

import Vue from 'vue'

Vue.use(LayoutPlugin)
Vue.use(SidebarPlugin)
Vue.use(TooltipPlugin)
Vue.use(FormCheckboxPlugin)
Vue.use(ModalPlugin)
Vue.use(FormInputPlugin)
Vue.use(ButtonPlugin)
Vue.use(ProgressPlugin)
Vue.use(TablePlugin)
Vue.use(DropdownPlugin)
Vue.use(PaginationPlugin)
Vue.use(InputGroupPlugin)
