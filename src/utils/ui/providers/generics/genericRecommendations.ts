/* 
 *  genericRecommendations.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

/**
 * Generic class for Recommendations providers
 */
export abstract class GenericRecommendation {
  /**
   * Gets recommendations
   * @returns recommendations 
   */
  public abstract getRecommendations(): AsyncGenerator<Song[]>
}