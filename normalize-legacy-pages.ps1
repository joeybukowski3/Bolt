$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$canonicalMap = @{
  "appliances.html" = "/category/appliances"
  "electronics.html" = "/category/electronics"
  "hvac.html" = "/category/hvac"
  "water-heaters.html" = "/category/water-heaters"
  "ge.html" = "/serial/ge-serial-number-lookup"
  "whirlpool.html" = "/serial/whirlpool-serial-number-lookup"
  "rheem.html" = "/serial/rheem-serial-number-lookup"
  "carrier.html" = "/serial/carrier-serial-number-lookup"
  "goodman.html" = "/serial/goodman-serial-number-lookup"
  "trane.html" = "/serial/trane-serial-number-lookup"
  "lg.html" = "/serial/lg-serial-number-lookup"
  "samsung.html" = "/serial/samsung-serial-number-lookup"
}

Get-ChildItem -File -Filter "*.html" | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
  $raw = Get-Content $_.FullName -Raw
  $canonical = if ($canonicalMap.ContainsKey($_.Name)) {
    $canonicalMap[$_.Name]
  } else {
    "/" + $_.BaseName
  }

  $canonicalTag = '<link rel="canonical" href="https://www.boltresearchteam.com' + $canonical + '">'
  if ($raw -match '<link rel="canonical" href="[^"]+">') {
    $raw = [regex]::Replace($raw, '<link rel="canonical" href="[^"]+">', $canonicalTag, 1)
  } else {
    $raw = [regex]::Replace($raw, '(<title>.*?</title>)', '$1' + "`r`n    " + $canonicalTag, 1)
  }

  $robotsTag = '<meta name="robots" content="noindex,follow">'
  if ($raw -match '<meta name="robots" content="[^"]*">') {
    $raw = [regex]::Replace($raw, '<meta name="robots" content="[^"]*">', $robotsTag, 1)
  } elseif ($raw -match '<meta name="description" content="[^"]*">') {
    $raw = [regex]::Replace($raw, '(<meta name="description" content="[^"]*">)', '$1' + "`r`n    " + $robotsTag, 1)
  } elseif ($raw -match '<link rel="canonical" href="[^"]+">') {
    $raw = [regex]::Replace($raw, '(<link rel="canonical" href="[^"]+">)', '$1' + "`r`n    " + $robotsTag, 1)
  }

  Set-Content $_.FullName $raw -Encoding UTF8
}

$duplicateH1Pages = "appliances.html", "electronics.html", "hvac.html", "water-heaters.html"
foreach ($file in $duplicateH1Pages) {
  $raw = Get-Content $file -Raw
  $raw = $raw.Replace(
    '<h1><span class="accent">&#9889;</span> Serial Number Age <span class="accent">Decoder</span></h1>',
    '<div class="header-logo"><span class="accent">&#9889;</span> Serial Number Age <span class="accent">Decoder</span></div>'
  )
  Set-Content $file $raw -Encoding UTF8
}

$h1Replacements = @{
  "terms.html" = @(
    '<h2>&#128196; Terms of Use</h2>',
    '<h1>&#128196; Terms of Use</h1>'
  )
  "data-protection.html" = @(
    '<h2>&#128203; Data Protection</h2>',
    '<h1>&#128203; Data Protection</h1>'
  )
  "security.html" = @(
    '<h2>&#128737; Security Policy</h2>',
    '<h1>&#128737; Security Policy</h1>'
  )
}

foreach ($entry in $h1Replacements.GetEnumerator()) {
  $raw = Get-Content $entry.Key -Raw
  $raw = $raw.Replace($entry.Value[0], $entry.Value[1])
  Set-Content $entry.Key $raw -Encoding UTF8
}
