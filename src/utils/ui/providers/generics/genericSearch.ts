/*
 *  genericSearch.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

export abstract class GenericSearch {
  public abstract searchSongs(term: string): Promise<Song[]>
  public abstract searchArtists(term: string): Promise<Artists[]>
}
