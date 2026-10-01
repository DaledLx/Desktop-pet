param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$releaseSource = (Resolve-Path -LiteralPath $Source).Path
$releaseStream = [System.IO.File]::Open($Destination, [System.IO.FileMode]::CreateNew)
$releaseArchive = [System.IO.Compression.ZipArchive]::new($releaseStream, [System.IO.Compression.ZipArchiveMode]::Create, $false, [System.Text.Encoding]::UTF8)
try {
  foreach ($releaseFile in Get-ChildItem -LiteralPath $releaseSource -Recurse -File -Force) {
    $entryName = $releaseFile.FullName.Substring($releaseSource.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($releaseArchive, $releaseFile.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $releaseArchive.Dispose()
  $releaseStream.Dispose()
}
