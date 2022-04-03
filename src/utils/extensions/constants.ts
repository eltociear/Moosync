/*
 *  constants.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

export const extensionEventsKeys: (keyof MoosyncExtensionTemplate)[] = [
  'onSongChanged',
  'onPlayerStateChanged',
  'onSongQueueChanged',
  'onVolumeChanged',
  'onPreferenceChanged',
  'onSeeked'
]
export const extensionRequestsKeys = [
  'get-songs',
  'add-songs',
  'add-playlist',
  'add-song-to-playlist',
  'remove-song',
  'get-preferences',
  'set-preferences'
] as const
export const extensionUIRequestsKeys = [
  'get-current-song',
  'get-volume',
  'get-time',
  'get-queue',
  'get-player-state'
] as const
export const playerControlRequests = ['play', 'pause', 'stop', 'next', 'prev'] as const
export const mainRequestsKeys = [
  'get-installed-extensions',
  'find-new-extensions',
  'toggle-extension-status',
  'remove-extension',
  'stop-process',
  'get-extension-icon',
  'extra-extension-events'
] as const

export type extensionEvents = typeof extensionEventsKeys[number]
export type extensionUIRequests = typeof extensionUIRequestsKeys[number] | typeof playerControlRequests[number]
export type extensionRequests = typeof extensionRequestsKeys[number] | extensionUIRequests
export type mainRequests = typeof mainRequestsKeys[number]
