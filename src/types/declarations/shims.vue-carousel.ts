/* 
 *  shims.vue-carousel.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

declare module 'vue-carousel' {

  import { PluginObject } from 'vue'

  interface PluginOptions {
    installComponents?: boolean
    componentsPrefix?: string
  }

  const plugin: PluginObject<PluginOptions> & { version: string }
  export default plugin
}
