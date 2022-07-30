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
    STATS = 'stats'
  }

  type NoParamsRequest = {
    params: undefined
  }

  type PlaylistItemRequest = {
    params: {
      playlist_id: string
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

  type SearchRequest = {
    params: {
      q: string
      type: 'video'
      sort_by: 'relevance'
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
      videos: {
        title: string
        videoId: string
        author: string
        authorId: string
        authorUrl: string
        videoThumbnails: {
          quality: string
          url: string
          width: number
          height: number
        }[]

        index?: number
        indexId?: string
        lengthSeconds: number
      }[]
    }
  }

  namespace VideoDetails {
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

      keywords: string[]
      viewCount: number
      likeCount: number
      dislikeCount: number

      paid: boolean
      premium: boolean
      isFamilyFriendly: boolean
      allowedRegions: string[]
      genre: string
      genreUrl: string

      author: string
      authorId: string
      authorUrl: string
      authorThumbnails: [
        {
          url: string
          width: number
          height: number
        }
      ]

      subCountText: string
      lengthSeconds: number
      allowRatings: boolean
      rating: Float32
      isListed: boolean
      liveNow: boolean
      isUpcoming: boolean
      premiereTimestamp: ?number

      hlsUrl?: string
      adaptiveFormats: [
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
      formatStreams: [
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
      captions: [
        {
          label: string
          languageCode: string
          url: string
        }
      ]
      recommendedVideos: [
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

    interface Trending {
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

      lengthSeconds: number
      viewCount: number

      author: string
      authorId: string
      authorUrl: string

      published: number
      publishedText: string
      description: string
      descriptionHtml: string

      liveNow: boolean
      paid: boolean
      premium: boolean
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

  module SearchResults {
    interface VideoThumbnail {
      quality: string
      url: string
      width: number
      height: number
    }

    interface RootObject {
      type: string
      title: string
      videoId: string
      author: string
      authorId: string
      authorUrl: string
      videoThumbnails: VideoThumbnail[]
      description: string
      descriptionHtml: string
      viewCount: number
      published: number
      publishedText: string
      lengthSeconds: number
      liveNow: boolean
      premium: boolean
      isUpcoming: boolean
    }
  }

  type SearchObject<T extends InvidiousApiResources> = T extends InvidiousApiResources.PLAYLISTS
    ? NoParamsRequest
    : T extends InvidiousApiResources.PLAYLIST_ITEMS
    ? PlaylistItemRequest
    : T extends InvidiousApiResources.VIDEO_DETAILS
    ? VideoDetailsRequest
    : T extends InvidiousApiResources.TRENDING
    ? TrendingRequest
    : T extends InvidiousApiResources.SEARCH
    ? SearchRequest
    : T extends InvidiousApiResources.STATS
    ? NoParamsRequest
    : undefined

  type ResponseType<T extends InvidiousApiResources> = (T extends InvidiousApiResources.PLAYLISTS
    ? UserPlaylists.PlaylistResponse[]
    : T extends InvidiousApiResources.PLAYLIST_ITEMS
    ? UserPlaylists.PlaylistResponse
    : T extends InvidiousApiResources.VIDEO_DETAILS
    ? VideoDetails.VideoResponse
    : T extends InvidiousApiResources.TRENDING
    ? VideoDetails.Trending
    : T extends InvidiousApiResources.SEARCH
    ? SearchResults.RootObject[]
    : T extends InvidiousApiResources.STATS
    ? InvidiousDetails
    : undefined) & {
    error?: string
  }
}
