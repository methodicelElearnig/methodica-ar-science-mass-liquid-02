#Requires -Version 7.0
<#
.SYNOPSIS
    THE ALLOWLIST: the single definition of what a deployment package contains.

.DESCRIPTION
    Dot-sourced by build-package.ps1 and verify-package.ps1. It is not runnable on
    its own and produces no output.

    ⚠️ This is an ALLOWLIST and must never become a denylist. docs-and-tools/ may hold
    kata-api-key.txt — a live key — so a denylist with one missing entry publishes it.
    A file ships only if a rule here says it does.

    ⚠️ EDIT THIS FILE AND NOTHING ELSE when what ships changes. The builder and the
    verifier both read it, which is what stops a package from being built to one
    definition and checked against another.

        build-package.ps1   — copies exactly the files Test-Ships accepts
        verify-package.ps1  — asserts the package IS exactly those files

    This file never ships: docs-and-tools/ is excluded wholesale, and *.ps1 twice over.

.NOTES
    Adapted 2026-10-22 from methodica-science-volume-solid-01/docs-and-tools/package-allowlist.ps1
    (itself from body-matter-01 ← the ratio units). build-package.ps1 and verify-package.ps1 are
    byte-identical to body-matter-01's copies — only this file differs, in the places this unit's
    shape forces:

      1. $ComponentGlob is subject-locked to methodica-science-mass-liquid-02-NN.
      2. Each component keeps its code in SUBFOLDERS: css/style.css + css/motion.css and
         js/main.js + js/motion.js (the animation system, one copy per part — see
         OPTIMIZATION-REPORT.md "Not done"). $ComponentSubdirFiles below is the rule; index.html
         stays at the component root.
      3. No sub-apps (no <iframe>-loaded sites) — $ComponentSubApps is empty.
      4. MEDIA-CHANGES.md and README.md at the root, OPTIMIZATION-*.md, REPORT-XAPI.md, RESUME.md
         are repo records — excluded by extension / name.
      5. unit-assets/ holds fonts, images AND video (the shared workout clip).

    It ships NO root files (rule 28.09.26 for all 720 units; Documentation/
    reporting-and-resume/ADDING-REPORTING-AND-RESUME.md §5.2). Platforms launch every component
    by its own .../<component>/index.html link — Kata's hostedContentRef — so a unit-level entry
    point is never used, and the MOE CDN serves a folder URL as 0 bytes. This repo has no root
    index.html at all.
#>

# ── Directories that never contribute a single file, whatever is inside them ──
$ExcludeTopLevel = @('_test', 'docs-and-tools', 'metadata-from', 'translation', 'deployments', '.git', '.claude')

# ── File names that never ship, wherever they appear ──
$ExcludeNames = @('index_dev.html', 'README.md', 'MEDIA-CHANGES.md', '.gitignore', '.gitattributes', '.nojekyll',
                  '.DS_Store', 'Thumbs.db', 'desktop.ini', 'kata-api-key.txt')

# ── Extensions that never ship ──
$ExcludeExt = @('.ps1', '.log', '.xlf', '.xlsx', '.csv', '.md', '.py', '.pptx', '.docx', '.json.bak')

# ── Any path segment starting with an underscore is a SOURCE, not a deliverable. ──
$ExcludeUnderscoreSegment = $true

# ── Directory names that are source material wherever they appear, even inside assets/ ──
$ExcludeDirSegment = @('originals', 'originals-backup', 'source', 'src-material')

# ── Individual files that look shippable and are not ─────────────────────────
#    ⚠️ Do NOT extend this list by eye. An asset that merely looks unused may be built at
#    runtime; _test/verify-assets.js is the authority on what is referenced.
$ExcludeRelPaths = @()

# ── What each shipped area contributes ──
$RootFiles = @()                         # none — no root index.html (see .NOTES)

$UnitDirs = @{
    'metadata'    = '*.json'             # unit + per-component catalogue records
    'unit-js'     = '*.js'               # the shared layer
    'unit-css'    = '*.css'              # the issue-report dialog stylesheet
    'unit-assets' = '*'                  # fonts / images / video shared by more than one component
}

# Inside a component folder: index.html at the root, these files in these subfolders, plus
# everything under assets/.
$ComponentFiles       = @('index.html')
$ComponentSubdirFiles = @{ 'css' = @('style.css', 'motion.css'); 'js' = @('main.js', 'motion.js') }
$ComponentGlob        = 'methodica-science-mass-liquid-02-[0-9][0-9]'

# ── Sub-apps: a self-contained site inside a component, loaded by <iframe> ───
$ComponentSubApps = @()
$SubAppFiles      = @('index.html')
$SubAppDirs       = @('images', 'assets')

# ── Hygiene: if any of these turn up INSIDE a package, it is unsafe to upload ──
$SecretPatterns = @('*key*', '*.ps1', '*.log', '*.py', 'index_dev.html', 'README.md', 'MEDIA-CHANGES.md', '.git*', '_*', '*.xlf', '*.xlsx', 'launch.json')

# ── Files a package may contain that are NOT copied from the tree ──
$PackageOnlyFiles = @('DEPLOY.md')

<#
.SYNOPSIS
    Does this repo-relative path (forward slashes) belong in a deployment package?
#>
function Test-Ships([string] $rel) {
    $segs = $rel.Split('/')
    if ($rel -in $ExcludeRelPaths)                     { return $false }
    if ($segs[0] -in $ExcludeTopLevel)                 { return $false }
    if ($segs[-1] -in $ExcludeNames)                   { return $false }
    if ([IO.Path]::GetExtension($rel) -in $ExcludeExt) { return $false }
    if ($ExcludeUnderscoreSegment -and ($segs | Where-Object { $_.StartsWith('_') })) { return $false }
    if ($segs | Where-Object { $_ -in $ExcludeDirSegment }) { return $false }

    if ($segs.Count -eq 1) { return $segs[0] -in $RootFiles }

    if ($UnitDirs.ContainsKey($segs[0])) {
        $glob = $UnitDirs[$segs[0]]
        if ($glob -eq '*') { return $true }              # unit-assets/: everything, at any depth
        return ($segs.Count -eq 2 -and $segs[1] -like $glob)
    }

    if ($segs[0] -like $ComponentGlob) {
        if ($segs.Count -eq 2) { return $segs[1] -in $ComponentFiles }
        if ($segs[1] -eq 'assets') { return $true }      # assets/ at any depth
        if ($ComponentSubdirFiles.ContainsKey($segs[1])) {
            return ($segs.Count -eq 3 -and $segs[2] -in $ComponentSubdirFiles[$segs[1]])
        }
        if ($segs[1] -in $ComponentSubApps) {
            if ($segs.Count -eq 3) { return $segs[2] -in $SubAppFiles }
            return ($segs[2] -in $SubAppDirs)
        }
        return $false
    }
    return $false
}

<#
.SYNOPSIS
    Every repo-relative path in $root that ships, sorted.
#>
function Get-ShippableFiles([string] $root) {
    Get-ChildItem -LiteralPath $root -Recurse -File -Force |
        ForEach-Object { [IO.Path]::GetRelativePath($root, $_.FullName).Replace('\', '/') } |
        Where-Object { Test-Ships $_ } |
        Sort-Object
}

<#
.SYNOPSIS
    Secret/dev files present in a package. Anything returned makes it unsafe to upload.
#>
function Get-HygieneHits([string[]] $rels) {
    $hits = @()
    foreach ($pat in $SecretPatterns) {
        $hits += @($rels | Where-Object {
            $_.Split('/')[-1] -like $pat -or ($_.Split('/') | Where-Object { $_ -like $pat })
        })
    }
    @($hits | Sort-Object -Unique | Where-Object { $_ -notin $PackageOnlyFiles })
}
