/*
 *  spotifyResponses.d.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

// These are only the resources used
declare namespace SpotifyResponses {
  enum ApiResources {
    USER_DETAILS = 'me',
    PLAYLISTS = 'me/playlists',
    PLAYLIST = 'playlists/{playlist_id}',
    PLAYLIST_ITEMS = 'playlists/{playlist_id}/tracks',
    SONG_DETAILS = 'tracks/{song_id}',
    TOP = 'me/top/{type}',
    RECOMMENDATIONS = 'recommendations',
    SEARCH = 'search'
  }

  type RecommendationRequest = {
    params: {
      seed_artists?: string[]
      seed_genres?: string[]
      seed_tracks?: string[]
    }
  }

  type TopRequest = {
    params: {
      type: 'artists' | 'tracks'
      time_range: 'long_term' | 'medium_term' | 'short_term'
    }
  }

  type ChannelRequest = {
    params: undefined
  }

  type PlaylistRequest = {
    params: {
      limit?: number
      offset?: number
    }
  }

  type PlaylistItemsRequest = {
    params: {
      playlist_id: string
      limit?: number
      offset?: number
    }
  }

  type PlaylistItemRequest = {
    params: {
      playlist_id: string
      fields?: string[]
    }
  }

  type TrackItemRequest = {
    params: {
      song_id: string
    }
  }

  type SearchRequest = {
    params: {
      query: string
      type: 'track' | 'artist'
      limit: number
    }
  }

  type SearchObject<T extends ApiResources> = T extends ApiResources.USER_DETAILS
    ? ChannelRequest
    : T extends ApiResources.PLAYLISTS
    ? PlaylistRequest
    : T extends ApiResources.PLAYLIST_ITEMS
    ? PlaylistItemsRequest
    : T extends ApiResources.SONG_DETAILS
    ? TrackItemRequest
    : T extends ApiResources.PLAYLIST
    ? PlaylistItemRequest
    : T extends ApiResources.TOP
    ? TopRequest
    : T extends ApiResources.RECOMMENDATIONS
    ? RecommendationRequest
    : T extends ApiResources.SEARCH
    ? SearchRequest
    : undefined

  interface Image {
    height?: number
    url: string
    width?: number
  }

  namespace UserDetails {
    interface ExternalUrls {
      spotify: string
    }

    interface Followers {
      href?: string
      total: number
    }

    interface UserDetails {
      country: string
      display_name: string
      email: string
      external_urls: ExternalUrls
      followers: Followers
      href: string
      id: string
      images: Image[]
      product: string
      type: string
      uri: string
    }
  }

  namespace UserPlaylists {
    interface ExternalUrls {
      spotify: string
    }

    interface ExternalUrls2 {
      spotify: string
    }

    interface Owner {
      external_urls: ExternalUrls2
      href: string
      id: string
      type: string
      uri: string
    }

    interface Tracks {
      href: string
      total: number
    }

    interface Item {
      collaborative: boolean
      external_urls: ExternalUrls
      href: string
      id: string
      images: Image[]
      name: string
      owner: Owner
      public: boolean
      snapshot_id: string
      tracks: Tracks
      type: string
      uri: string
    }

    interface UserPlaylists {
      href: string
      items: Item[]
      limit: number
      next?: string
      offset: number
      previous?: string
      total: number
    }
  }

  namespace PlaylistItems {
    interface ExternalUrls {
      spotify: string
    }

    interface AddedBy {
      external_urls: ExternalUrls
      href: string
      id: string
      type: string
      uri: string
    }

    interface ExternalUrls2 {
      spotify: string
    }

    interface Artist {
      external_urls: ExternalUrls2
      href: string
      id: string
      name: string
      type: string
      uri: string
    }

    interface ExternalUrls3 {
      spotify: string
    }

    interface Album {
      album_type: string
      artists: Artist[]
      available_markets: string[]
      external_urls: ExternalUrls3
      href: string
      id: string
      images: Image[]
      name: string
      type: string
      uri: string
    }

    interface ExternalUrls4 {
      spotify: string
    }

    interface Artist2 {
      external_urls: ExternalUrls4
      href: string
      id: string
      name: string
      type: string
      uri: string
    }

    interface ExternalIds {
      isrc: string
    }

    interface ExternalUrls5 {
      spotify: string
    }

    interface Track {
      album: Album
      artists: Artist2[]
      available_markets: string[]
      disc_number: number
      duration_ms: number
      explicit: boolean
      external_ids: ExternalIds
      external_urls: ExternalUrls5
      href: string
      id: string
      name: string
      popularity: number
      preview_url: string
      track_number: number
      type: string
      uri: string
    }

    interface Item {
      added_at: Date
      added_by: AddedBy
      is_local: boolean
      track: Track
    }

    interface PlaylistItems {
      href: string
      items: Item[]
      limit: number
      next: string | null
      offset: number
      previous: string | null
      total: number
    }
  }

  declare namespace RecommendationDetails {
    export interface ExternalUrls {
      spotify: string
    }

    export interface Artist {
      external_urls: ExternalUrls
      href: string
      id: string
      name: string
      type: string
      uri: string
    }

    export interface Image {
      height: number
      url: string
      width: number
    }

    export interface Album {
      album_type: string
      artists: Artist[]
      available_markets: string[]
      external_urls: ExternalUrls
      href: string
      id: string
      images: Image[]
      name: string
      release_date: string
      release_date_precision: string
      total_tracks: number
      type: string
      uri: string
    }

    export interface Artist2 {
      external_urls: ExternalUrls
      href: string
      id: string
      name: string
      type: string
      uri: string
    }

    export interface ExternalIds {
      isrc: string
    }

    export interface Track {
      album: Album
      artists: Artist2[]
      available_markets: string[]
      disc_number: number
      duration_ms: number
      explicit: boolean
      external_ids: ExternalIds
      external_urls: ExternalUrls
      href: string
      id: string
      is_local: boolean
      name: string
      popularity: number
      preview_url: string
      track_number: number
      type: string
      uri: string
    }

    export interface Seed {
      initialPoolSize: number
      afterFilteringSize: number
      afterRelinkingSize: number
      id: string
      type: string
      href: string
    }

    export interface Recommendations {
      tracks: Track[]
      seeds: Seed[]
    }
  }

  interface TopDetails {
    items: {
      id: string
    }[]
  }

  interface SearchResponse {
    tracks: {
      href: string
      items: Track[]
    }
  }

  type ResponseType<T extends ApiResources> = T extends ApiResources.USER_DETAILS
    ? UserDetails.UserDetails
    : T extends ApiResources.PLAYLISTS
    ? UserPlaylists.UserPlaylists
    : T extends ApiResources.PLAYLIST_ITEMS
    ? PlaylistItems.PlaylistItems
    : T extends ApiResources.PLAYLIST
    ? UserPlaylists.Item
    : T extends ApiResources.SONG_DETAILS
    ? PlaylistItems.Track
    : T extends ApiResources.RECOMMENDATIONS
    ? RecommendationDetails.Recommendations
    : T extends ApiResources.TOP
    ? TopDetails
    : T extends ApiResources.SEARCH
    ? SearchResponse
    : undefined
}
