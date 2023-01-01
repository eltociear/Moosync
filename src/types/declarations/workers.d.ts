type ScanWorkerWorkerType = {
  start: (
    togglePaths: togglePaths,
    excludePaths: string[],
    loggerPath: string,
    splitPattern: string
  ) => ScannedSong | ScannedPlaylist | Progress

  scanSinglePlaylist: (
    path: string,
    loggerPath: string,
    splitPattern: string
  ) => ScannedSong | ScannedPlaylist | Progress

  scanSingleSong: (path: string, loggerPath: string, splitPattern: string) => ScannedSong | ScannedPlaylist | Progress
}

type SavedCovers = { high: string; low?: string }
type CoverWorkerType = {
  writeBuffer: (
    bufferDesc: TransferDescriptor<Buffer>,
    basePath: string,
    hash?: string,
    onlyHigh?: boolean
  ) => SavedCovers
}
