$ErrorActionPreference = 'Stop';
$toolsDir = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$url = ''
$url64 = 'https://github.com/Moosync/Moosync/releases/download/v3.0.0/Moosync-3.0.0-win-x64.exe'

$packageArgs = @{
  packageName    = $env:ChocolateyPackageName
  unzipLocation  = $toolsDir
  fileType       = 'exe'
  url            = $url
  url64bit       = $url64

  softwareName   = 'Moosync*'

  checksum       = ''
  checksumType   = 'sha256'
  checksum64     = '317115F7F8E54B86085DCA662BE0ED6686B9DF5E8797E75AA45423020F0D198C'
  checksumType64 = 'sha256'

  validExitCodes = @(0, 3010, 1641)
  silentArgs     = '/S'
}

Install-ChocolateyPackage @packageArgs



















