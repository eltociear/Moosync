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
  enum ApiResources {
    PLAYLISTS = 'auth/playlists',
    PLAYLIST_ITEMS = 'playlists/{playlist_id}',
    VIDEO_DETAILS = 'videos/{video_id}',
    TRENDING = 'trending',
    SEARCH = 'search'
  }

  type PlaylistRequest = {
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

  type SearchObject<T extends ApiResources> = T extends ApiResources.PLAYLISTS
    ? PlaylistRequest
    : T extends ApiResources.PLAYLIST_ITEMS
    ? PlaylistItemRequest
    : T extends ApiResources.VIDEO_DETAILS
    ? VideoDetailsRequest
    : T extends ApiResources.TRENDING
    ? TrendingRequest
    : T extends ApiResources.SEARCH
    ? SearchRequest
    : undefined

  type ResponseType<T extends ApiResources> = T extends ApiResources.PLAYLISTS
    ? UserPlaylists.PlaylistResponse[]
    : T extends ApiResources.PLAYLIST_ITEMS
    ? UserPlaylists.PlaylistResponse
    : T extends ApiResources.VIDEO_DETAILS
    ? VideoDetails.VideoResponse
    : T extends ApiResources.TRENDING
    ? VideoDetails.Trending
    : T extends ApiResources.SEARCH
    ? VideoDetails.Trending
    : undefined
}
