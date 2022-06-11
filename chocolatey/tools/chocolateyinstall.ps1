$ErrorActionPreference = 'Stop';
$toolsDir = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$url = ''
$url64 = 'https://github.com/Moosync/Moosync/releases/download/v3.0.1/Moosync-3.0.1-win-x64.exe'

$packageArgs = @{
  packageName    = $env:ChocolateyPackageName
  unzipLocation  = $toolsDir
  fileType       = 'exe'
  url            = $url
  url64bit       = $url64

  softwareName   = 'Moosync*'

  checksum       = ''
  checksumType   = 'sha256'
  checksum64     = 'eb1652b44d006f6615a1bcc999bdc936e6c6cbc9251db3cd76c248551f6f2508'
  checksumType64 = 'sha256'

  validExitCodes = @(0, 3010, 1641)
  silentArgs     = '/S'
}

Install-ChocolateyPackage @packageArgs



















