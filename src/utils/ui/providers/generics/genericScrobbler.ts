/*
 *  genericScrobbler.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

export abstract class GenericScrobbler {
  public abstract get loggedIn(): boolean

  public abstract login(): Promise<boolean>

  public abstract signOut(): Promise<void>

  public abstract getUserDetails(): Promise<string | undefined>

  public abstract scrobble(song: Song): Promise<void>
}
