import { YoutubeProvider } from '@/utils/ui/providers/youtube'
import { VuexModule } from './module'
import { SpotifyProvider } from '@/utils/ui/providers/spotify';

export class ProviderStore extends VuexModule.With({ namespaced: 'providers' }) {
  public youtubeProvider = new YoutubeProvider()
  public spotifyProvider = new SpotifyProvider()
}