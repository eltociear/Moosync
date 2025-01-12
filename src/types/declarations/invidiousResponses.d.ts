/*
 *  youtubeResponses.d.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

declare namespace InvidiousResponses {
  // These are only the resources used
  enum InvidiousApiResources {
    PLAYLISTS = 'auth/playlists',
    PLAYLIST_ITEMS = 'playlists/{playlist_id}',
    VIDEO_DETAILS = 'videos/{video_id}',
    TRENDING = 'trending',
    SEARCH = 'search',
    STATS = 'stats',
    CHANNELS = 'channels/{channel_id}',
    CHANNEL_VIDEOS = 'channels/{channel_id}/videos'
  }

  type NoParamsRequest = {
    params: undefined
  }

  type PlaylistItemRequest = {
    params: {
      playlist_id: string
      page?: number
    }
  }

  type VideoDetailsRequest = {
    params: {
      video_id: string
    }
  }

  type TrendingRequest = {
    params: {
      type: 'music' | 'gaming' | 'news' | 'movies'
      region?: 'US' | string
    }
  }

  type SearchTypes = 'video' | 'playlist' | 'channel'

  type SearchRequest<T extends SearchTypes> = {
    params: {
      q: string
      type: T
      sort_by: 'relevance'
    }
  }

  type ChannelRequest = {
    params: {
      channel_id: string
      page?: number
      continuation?: string
      sort_by?: 'newest' | 'oldest' | 'popular'
    }
  }

  namespace UserPlaylists {
    interface PlaylistResponse {
      type: 'invidiousPlaylist'
      title: string
      playlistId: string
      author: string
      authorId: null
      authorUrl: null
      authorThumbnails: []
      description: string
      descriptionHtml: string
      videoCount: number
      viewCount: 0
      updated: number
      isListed: boolean
      videos: SearchResults.VideoResult[]
    }
  }

  namespace VideoDetails {
    interface ChannelVideoResponse {
      videos: VideoResponse[]
      continuation: string
    }

    interface VideoResponse {
      title: string
      videoId: string
      videoThumbnails: [
        {
          quality: string
          url: string
          width: number
          height: number
        }
      ]

      description: string
      descriptionHtml: string
      published: number
      publishedText: string

      keywords?: string[]
      viewCount?: number
      likeCount?: number
      dislikeCount?: number

      paid?: boolean
      premium: boolean
      isFamilyFriendly: boolean
      allowedRegions: string[]
      genre: string
      genreUrl: string

      author: string
      authorId: string
      authorUrl: string
      authorThumbnails?: [
        {
          url: string
          width: number
          height: number
        }
      ]

      subCountText?: string
      lengthSeconds: number
      allowRatings?: boolean
      rating?: Float32
      isListed?: boolean
      liveNow?: boolean
      isUpcoming?: boolean
      premiereTimestamp?: ?number

      hlsUrl?: string
      adaptiveFormats?: [
        {
          index: string
          bitrate: string
          init: string
          url: string
          itag: string
          type: string
          clen: string
          lmt: string
          projectionType: number
          container: string
          encoding: string
          qualityLabel?: string
          resolution?: string
        }
      ]
      formatStreams?: [
        {
          url: string
          itag: string
          type: string
          quality: string
          container: string
          encoding: string
          qualityLabel: string
          resolution: string
          size: string
        }
      ]
      captions?: [
        {
          label: string
          languageCode: string
          url: string
        }
      ]
      recommendedVideos?: [
        {
          videoId: string
          title: string
          videoThumbnails: [
            {
              quality: string
              url: string
              width: number
              height: number
            }
          ]
          author: string
          lengthSeconds: number
          viewCountText: string
        }
      ]
    }
  }

  type InvidiousDetails = {
    openRegistrations: boolean
    software: {
      branch: string
      name: string
      version: string
    }
    usage: {
      users: {
        total: number
      }
    }
  }

  interface ChannelDetails {
    author: string
    authorId: string
    authorThumbnails: {
      height: number
      url: string
      width: number
    }[]
    authorUrl: string
    authorVerified: true
    autoGenerated: false
    description: string
    descriptionHtml: string
    subCount: number
    type: 'channel'
    videoCount: number
  }

  namespace SearchResults {
    interface VideoThumbnail {
      quality: string
      url: string
      width: number
      height: number
    }

    type SearchResponse<T extends SearchTypes> = T extends 'video'
      ? VideoDetails.VideoResponse[]
      : T extends 'playlist'
      ? UserPlaylists.PlaylistResponse[]
      : T extends 'channel'
      ? ChannelDetails[]
      : undefined
  }

  type SearchObject<T extends InvidiousApiResources, K extends SearchTypes> = T extends InvidiousApiResources.PLAYLISTS
    ? NoParamsRequest
    : T extends InvidiousApiResources.PLAYLIST_ITEMS
    ? PlaylistItemRequest
    : T extends InvidiousApiResources.VIDEO_DETAILS
    ? VideoDetailsRequest
    : T extends InvidiousApiResources.TRENDING
    ? TrendingRequest
    : T extends InvidiousApiResources.SEARCH
    ? SearchRequest<K>
    : T extends InvidiousApiResources.STATS
    ? NoParamsRequest
    : T extends InvidiousApiResources.CHANNELS | InvidiousApiResources.CHANNEL_VIDEOS
    ? ChannelRequest
    : undefined

  type ResponseType<T extends InvidiousApiResources, K extends SearchTypes> = (T extends InvidiousApiResources.PLAYLISTS
    ? UserPlaylists.PlaylistResponse[]
    : T extends InvidiousApiResources.PLAYLIST_ITEMS
    ? UserPlaylists.PlaylistResponse
    : T extends InvidiousApiResources.VIDEO_DETAILS
    ? VideoDetails.VideoResponse
    : T extends InvidiousApiResources.TRENDING
    ? VideoDetails.VideoResponse
    : T extends InvidiousApiResources.SEARCH
    ? SearchResults.SearchResponse<K>
    : T extends InvidiousApiResources.STATS
    ? InvidiousDetails
    : T extends InvidiousApiResources.CHANNELS
    ? ChannelDetails
    : T extends InvidiousApiResources.CHANNEL_VIDEOS
    ? VideoDetails.ChannelVideoResponse
    : undefined) & {
    error?: string
  }
}
