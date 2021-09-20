/* 
 *  shims.vue-context-menu-popup.d.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

declare module 'vue-context-menu-popup' {
  import { Component } from 'vue'
  import { DefaultData, DefaultMethods } from 'vue/types/options'

  export interface MenuItem {
    label: string
    disabled?: boolean
    children?: MenuItem[]
    handler?: () => void
  }

  export class ContextMenuComponent extends Element {
    open(event: Event)
    close()
  }

  const component:
    | Component<
      Vue,
      DefaultData<Vue>,
      DefaultMethods<Vue>,
      DefaultMethods<Vue>,
      DefaultComputed,
      PropsDefinition<DefaultProps>,
      DefaultProps
    >
    | undefined

  export default component
}
