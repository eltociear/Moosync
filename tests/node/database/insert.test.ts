/**
 * @jest-environment ./tests/environment/databaseEnvironment.ts
 */
import { SongDBInstance } from '@/utils/main/db/database'
import { CustomGlobal } from '../../environment/databaseEnvironment'
import { insertPlaylist, insertSong } from './common'

declare const global: typeof globalThis & CustomGlobal

let SongDB: SongDBInstance

let inserted: Song[]

beforeAll(async () => {
  SongDB = global.SongDB
})

test('Insert a song in DB', async () => {
  inserted = await insertSong(SongDB, {
    size: 2
  })

  for (const i of inserted) {
    const songResult = SongDB.getSongByOptions({
      song: {
        title: i.title
      }
    })

    expect(songResult.length).toBe(1)
    expect(songResult[0]._id).toBe(i._id)
    expect(songResult[0].album?.album_name).toBe(i.album?.album_name)
    expect(songResult[0].artists?.length).toBe(i.artists?.length)
  }
})

test('Album was inserted', async () => {
  for (const i of inserted) {
    const albumResult = SongDB.getEntityByOptions<Album>({
      album: {
        album_name: i.album?.album_name
      }
    })

    expect(albumResult.length).toBe(1)
    expect(albumResult[0].album_name).toBe(i.album?.album_name)
    expect(albumResult[0].album_song_count).toBe(1)
  }
})

test('Album count', async () => {
  const albumResult = SongDB.getEntityByOptions<Album>({
    album: true
  })

  expect(albumResult.length).toBe(inserted.length)

  for (let i = 0; i < inserted.length; i++) {
    expect(albumResult[i].album_name).toBe(inserted[i].album?.album_name)
    expect(albumResult[i].album_song_count).toBe(1)
  }
})

test('Artist was inserted', async () => {
  for (const i of inserted) {
    const artistResult = SongDB.getEntityByOptions<Artists>({
      artist: {
        artist_name: i.artists?.at(0)
      }
    })

    expect(artistResult.length).toBe(1)
    expect(artistResult[0].artist_name).toBe(i.artists?.at(0))
    expect(artistResult[0].artist_song_count).toBe(1)
  }
})

test('Artist count', async () => {
  const artistResult = SongDB.getEntityByOptions<Artists>({
    artist: true
  })

  expect(artistResult.length).toBe(inserted.length * 2)

  for (let i = 0; i < artistResult.length; i++) {
    expect(artistResult[i].artist_song_count).toBe(1)
  }
})

test('Create playlist', async () => {
  const playlist = insertPlaylist(SongDB)

  const data = SongDB.getEntityByOptions<Playlist>({
    playlist: true
  })

  expect(data.length).toBe(1)
  expect(data[0].playlist_name).toBe(playlist.playlist_name)
})

test('Insert into playlist', async () => {
  const playlist = insertPlaylist(SongDB)
  const song = await insertSong(SongDB, { size: 1 })
  SongDB.addToPlaylist(playlist.playlist_id, ...song)

  const data = SongDB.getSongByOptions({
    playlist: {
      playlist_id: playlist.playlist_id
    }
  })

  expect(data.length).toBe(1)
  expect(data[0]._id).toBe(song[0]._id)
})
