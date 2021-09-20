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
   * logged in status
   */
  public abstract get loggedIn(): boolean

  /**
   * Login auth handler for provider
   * @returns Promise returned after login event is completed
   */
  public abstract login(): Promise<any>

  /**
   * Sign out handler for provider
   * @returns Promise returned after sign out event is completed
   */
  public abstract signOut(): Promise<void>

  /**
   * Gets user details from the provider
   * @returns username as string
   */
  public abstract getUserDetails(): Promise<string | undefined>

  /**
   * Gets recommendations
   * @returns recommendations 
   */
  public abstract getRecommendations(): Promise<Recommendations>
}