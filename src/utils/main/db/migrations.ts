/*
 *  migrations.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

export const migrations = [
  // All Songs
  ` 
  -- Up
  CREATE TABLE allsongs (
    _id VARCHAR(36) PRIMARY KEY,
    path TEXT,
    size NUMBER,
    inode TEXT,
    deviceno TEXT,
    title TEXT,
    date TEXT,
    year TEXT,
    lyrics TEXT,
    releaseType TEXT,
    bitrate NUMBER,
    codec TEXT,
    container TEXT,
    duration NUMBER,
    sampleRate NUMBER,
    hash TEXT
  );
  -- Down
  DROP TABLE IF EXISTS 'allsongs';
  `,

  // Artists
  `
  -- Up
  CREATE TABLE artists (
    artist_id VARCHAR(36) PRIMARY KEY,
    artist_mbid TEXT,
    artist_name TEXT,
    artist_coverPath TEXT
  );

  CREATE TABLE artists_bridge (
    id integer PRIMARY KEY AUTOINCREMENT,
    song VARCHAR(36),
    artist VARCHAR(36),
    FOREIGN KEY(song) REFERENCES allsongs(_id),
    FOREIGN KEY(artist) REFERENCES artists(artist_id)
  );

  -- Down
  DROP TABLE IF EXISTS 'artists_bridge';
  DROP TABLE IF EXISTS 'artists';
  `,

  // Genre
  `
  -- Up
  CREATE TABLE genre (
    genre_id VARCHAR(36) PRIMARY KEY,
    genre_name text
  ); 

  CREATE TABLE genre_bridge (
    id integer PRIMARY KEY AUTOINCREMENT,
    song VARCHAR(36),
    genre VARCHAR(36),
    FOREIGN KEY(song) REFERENCES allsongs(_id),
    FOREIGN KEY(genre) REFERENCES genre(genre_id)
  );
  -- Down
  DROP TABLE IF EXISTS 'genre_bridge';
  DROP TABLE IF EXISTS 'genre';
  `,

  // Albums
  `
  -- Up
  CREATE TABLE albums (
    album_id VARCHAR(36) PRIMARY KEY,
    album_name TEXT,
    album_artist TEXT,
    album_coverPath TEXT
  );

  CREATE TABLE album_bridge (
    id integer PRIMARY KEY AUTOINCREMENT,
    song VARCHAR(36),
    album VARCHAR(36),
    FOREIGN KEY(song) REFERENCES allsongs(_id),
    FOREIGN KEY(album) REFERENCES albums(album_id)
  );

  -- Down
  DROP TABLE IF EXISTS 'album_bridge';
  DROP TABLE IF EXISTS 'albums';
  `,

  // Playlists
  `
  -- Up
  CREATE TABLE playlists (
    playlist_id VARCHAR(36) PRIMARY KEY,
    playlist_name TEXT NOT NULL,
    playlist_coverPath TEXT
  );

  CREATE TABLE playlist_bridge (
    id integer PRIMARY KEY AUTOINCREMENT,
    song VARCHAR(36),
    playlist VARCHAR(36),
    FOREIGN KEY(song) REFERENCES allsongs(_id),
    FOREIGN KEY(playlist) REFERENCES playlists(playlist_id)
  );

  -- Down
  DROP TABLE IF EXISTS 'playlist_bridge';
  DROP TABLE IF EXISTS 'playlists';
    `,

  // 04-03-2021
  `
  -- Up
  ALTER TABLE albums ADD album_song_count NUMBER NOT NULL DEFAULT 0;
  ALTER TABLE albums ADD year TEXT;
  ALTER TABLE artists ADD artist_song_count NUMBER NOT NULL DEFAULT 0;
  ALTER TABLE playlists ADD playlist_song_count NUMBER NOT NULL DEFAULT 0;
  ALTER TABLE genre ADD genre_song_count NUMBER NOT NULL DEFAULT 0;

  -- Down
  `,

  // 05-03-2021
  `
  -- Up
  ALTER TABLE allsongs ADD type TEXT NOT NULL DEFAULT 'LOCAL';
  ALTER TABLE allsongs ADD url TEXT;

  -- Down
  `,

  // 02-06-2021
  `
  -- Up
  ALTER TABLE playlists ADD playlist_desc TEXT;

  -- Down
  `,

  // 02-07-2021
  `
  -- Up
  ALTER TABLE allsongs ADD song_coverPath TEXT;

  -- Down
  `,

  // 04-08-2021
  `
  -- Up
  ALTER TABLE allsongs ADD playbackUrl TEXT;

  -- Down
  `,

  // 04-08-2021
  `
  -- Up
  ALTER TABLE allsongs RENAME COLUMN song_coverPath TO song_coverPath_high;
  ALTER TABLE allsongs ADD song_coverPath_low TEXT;

  ALTER TABLE albums RENAME COLUMN album_coverPath TO album_coverPath_high;
  ALTER TABLE albums ADD album_coverPath_low TEXT;
  -- Down
  `,

  // 26-08-2021
  `
  -- Up
  ALTER TABLE allsongs ADD date_added TEXT DEFAULT "0";

  -- Down
  `,

  // 21-03-2022
  `
  -- Up
  ALTER TABLE playlists ADD playlist_path TEXT;

  -- Down
  `,

  // 26-03-2022
  `
  -- Up
  ALTER TABLE allsongs ADD provider_extension TEXT;

  -- Down
  `,

  // 10-04-2022
  `
  -- Up
  ALTER TABLE allsongs ADD icon TEXT;

  -- Down
  `,

  // 10-06-2022
  `
  -- Up
  ALTER TABLE artists ADD artist_extra_info TEXT;

  -- Down
  `
]
