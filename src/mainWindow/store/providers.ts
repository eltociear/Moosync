/* 
 *  providers.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { LastFMProvider } from '../../utils/ui/providers/lastfm';
import { SpotifyProvider } from '@/utils/ui/providers/spotify';
import { VuexModule } from './module';
import { YoutubeProvider } from '@/utils/ui/providers/youtube';

export class ProviderStore extends VuexModule.With({ namespaced: 'providers' }) {
  public youtubeProvider = new YoutubeProvider()
  public spotifyProvider = new SpotifyProvider()
  public lastfmProvider = new LastFMProvider()
}
