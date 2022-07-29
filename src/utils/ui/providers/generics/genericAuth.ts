/*
 *  genericAuth.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

export abstract class GenericAuth {
  constructor() {
    this.updateConfig()
  }

  public abstract getLoggedIn(): Promise<boolean>

  /**
   * Login auth handler for provider
   * @returns Promise returned after login event is completed
   */
  public abstract login(): Promise<boolean>

  /**
   * Sign out handler for provider
   * @returns Promise returned after sign out event is completed
   */
  public abstract signOut(): Promise<void>

  /**
   * Updates config before calling login
   * Method can be used to update config last moment before login
   */
  public abstract updateConfig(): Promise<boolean>

  /**
   * Gets user details from the provider
   * @returns username as string
   */
  public abstract getUserDetails(): Promise<string | undefined>
}
