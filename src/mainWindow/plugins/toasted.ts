/* 
 *  toasted.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import Toasted from 'vue-toasted';
import Vue from 'vue';

Vue.use(Toasted, {
  position: 'top-right',
  className: 'custom-toast',
  duration: 2500
})