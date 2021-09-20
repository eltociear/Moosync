/* 
 *  errorHandler.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { Component, Vue } from 'vue-property-decorator'

@Component
export default class ErrorHandler extends Vue {

  protected handlerImageError(err: ErrorEvent, callback?: (err: ErrorEvent) => void) {
    this.handlerFileError(err)
    callback && callback(err)
  }

  protected handlerFileError(err: ErrorEvent) {
    // TODO: Need some kind of specific guidelines when to start scanning
    // if (!(err?.target as HTMLImageElement)?.src?.startsWith('http'))
    // window.FileUtils.scan()
  }
}
