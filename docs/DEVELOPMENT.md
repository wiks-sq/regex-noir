# Regex Noir — Developer Guide

A single-file browser game that teaches regular expressions through 10 investigation "cases". It has no backend, no build step and no accounts. All progress lives in the player's `localStorage`.

> The answer key (`SOLUTIONS.md`) and the original product spec are kept **out of the repository** on purpose (see `.gitignore`). Maintainers keep a local copy; ask the project owner if you need it.

---

## 1. Repository layout

```
regex-noir/
├── index.html                       # The whole game: markup, CSS, React/JSX, case data
├── cheatsheet.html                  # Standalone regex cheat sheet (plain HTML/CSS/JS, no CDN scripts)
├── og-image.png                     # 1200×630 social preview (Open Graph / Twitter)
├── favicon.ico / favicon.svg        # Browser-tab icons (16/32/48 px ICO + scalable SVG)
├── apple-touch-icon.png             # 180×180 iOS home-screen icon
├── icon-192.png / icon-512.png      # Android / PWA install icons (maskable)
├── site.webmanifest                 # Install metadata (name, colors, icons)
├── README.md                        # Public project page
├── LICENSE                          # MIT
├── docs/
│   ├── DEVELOPMENT.md               # This file
│   └── screenshots/                 # Images used by README.md
├── .github/workflows/pages.yml      # CI: verify cases, deploy to GitHub Pages
└── tools/
    ├── verify-cases.js              # Node script that checks case data + documented answers
    ├── og-image.html                # Source for og-image.png (render with headless Chrome)
    └── icons/                       # Icon sources: mark-small.svg, mark-large.svg, render.sh
```

Not in git (local only): `SOLUTIONS.md` (answer key), `Claude Prompt Specification.md` (original spec).

## 2. Running it

- **Play locally:** open `index.html` in any modern browser (double-click works).
- **Serve locally** (closer to production):
  ```bash
  python3 -m http.server 8000
  ```
  Then open http://localhost:8000.
- **Deploy:** pushing to `main` runs `.github/workflows/pages.yml`: it runs `node tools/verify-cases.js`, copies the public files (`index.html`, `cheatsheet.html`, `og-image.png`, icons, `site.webmanifest`) into `_site/` and publishes them to GitHub Pages. Docs, tools and screenshots are not published. Any other static host works too: upload the same files. There's nothing to build.

**Runtime dependencies** (loaded from CDNs, pinned versions):

| Library | Version | Source |
|---|---|---|
| React / ReactDOM (UMD) | 18.3.1 | unpkg |
| @babel/standalone (compiles the JSX in the browser) | 7.24.7 | unpkg |
| Tailwind CSS Play CDN | 3.4.16 | cdn.tailwindcss.com |
| JetBrains Mono, Space Grotesk | — | Google Fonts |

The game needs an internet connection on first load. Babel compiles the JSX on every page load, which adds roughly 0.5–1 s on slow devices. See §11 if that becomes a problem.

## 3. Configuration before release

| What | Where (in `index.html`) | Current value |
|---|---|---|
| Buy Me a Coffee URL | `const BMC_URL` at the top of the main script | `https://buymeacoffee.com/YOUR_USERNAME` |
| Canonical / Open Graph URL | `<link rel="canonical">`, `og:url` | `https://wiks-sq.github.io/regex-noir/` (also in `cheatsheet.html`, as `…/cheatsheet.html`) |
| Social preview image | `og:image`, `twitter:image` | `https://wiks-sq.github.io/regex-noir/og-image.png`. Upload `og-image.png` next to `index.html`; these tags must be absolute URLs |
| JSON-LD `url` | `<script type="application/ld+json">` | `https://wiks-sq.github.io/regex-noir/` |
| Storage key | `const STORAGE_KEY` | `regexNoir.v1` (change it only to deliberately wipe everyone's progress) |

## 4. File anatomy (`index.html`)

The file is split into sections with banner comments (`/* ==== NAME ==== */`). Search for the banner names to jump around.

| Section | Contents |
|---|---|
| `<head>` | SEO meta, Open Graph, Twitter card, JSON-LD (`SoftwareApplication` + `VideoGame`, category `EducationalGame`), favicon links (see §13), CDN scripts, Tailwind config, all custom CSS |
| `CONFIG` | `BMC_URL`, `STORAGE_KEY`, `MAX_MATCHES` |
| `CASE DATA` | The `CASES` array, wrapped in `/*CASES_START*/ … /*CASES_END*/` markers (the verifier relies on these), plus `BADGES` |
| `PERSISTENCE` | `loadProgress`, `saveProgress`, `solvedCount`, `isUnlocked`, `THEMES` |
| `SOUND` | `beep(kind, enabled)`, a Web Audio tone generator with no audio files |
| `REGEX ENGINE WRAPPER` | `runRegex`, `evaluate`, `friendlyError`, `HAS_INDICES` |
| `REGEX EXPLAINER` | `explainRegex`, the tokenizer behind the token-by-token breakdown in the victory modal |
| `SMALL UI PIECES` | `CoffeeButton`, `SupportCard`, `Modal`, `fmtTime` |
| `HEADER` / `CASE STRIP` / `LEFT PANEL — DOSSIER` / `DATA FEED` / `RIGHT PANEL — CONSOLE` | Presentational components |
| `FINAL BADGE` | `MasterEmblem` (SVG), `downloadEmblem` (SVG → PNG), `CompletionModal` |
| `VICTORY MODAL` | Score breakdown, pattern explainer, "Next Case" / "Claim Your Badge" |
| `APP` | Top-level state, game logic (`analyze`, `submit`), layout, footer, modals |

## 5. Case data schema

Each entry in `CASES` follows the schema from the spec, plus a few extra fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Stable key used in `localStorage` (`case-01` … `case-10`). **Never rename a shipped id**, or players lose that case's progress. |
| `title`, `chapter`, `difficulty` | string | Display text. `chapter` is the concept name. |
| `briefing` | string | Story context shown in the dossier |
| `officer` | `{ name, note }` | Teaching aside from the briefing officer |
| `objectives` | string[] | Bulleted goals |
| `lines` | string[] | The target log. `targetText = lines.join("\n")` is computed at startup. |
| `solutionPattern` | string | Reference regex. Use `String.raw` so backslashes don't need doubling. |
| `flags` | string | Flags for the reference solution |
| `startFlags` | string | Flags pre-toggled when the player opens the case |
| `matchMode` | `"full"` \| `"group"` | What gets graded: `match[0]`, or capture group 1 |
| `expectedMatches` | string[] | Exact evidence, **in order** |
| `hint` | string | Revealed by "Request Hint" (−200 points) |
| `conceptUnlocked` | string | Shown in the victory modal |
| `cheats` | `[token, description][]` | Cheat-sheet entries. Clicking one inserts the token, unless it contains a space (e.g. `"g flag"`). |
| `timeLimit` | number (s), optional | Par time; earns a speed bonus. Currently only case 10 (300 s). |

### Adding or changing a case
1. Edit or add the object inside the `CASES_START/END` markers.
2. Write the decoy lines deliberately. Each case should defeat the obvious "almost right" pattern; see the traps in `SOLUTIONS.md` (local only).
3. Add the reference, any alternatives and the traps to `ALTERNATIVES` / `TRAPS` in `tools/verify-cases.js`.
4. Run `node tools/verify-cases.js`. It must print `All cases verified.`
5. Update your local `SOLUTIONS.md`.
6. If the case count changes, review any badge text that hard-codes "10" (`BADGES` descriptions). Everything else uses `CASES.length`.

## 6. Game logic

### Matching (`runRegex`)
1. An empty pattern returns `status: "idle"`.
2. The pattern is first compiled with **only the player's flags**, so syntax errors quote what they typed. It's then recompiled with the extra `d` flag (where supported, see `HAS_INDICES`) to get capture-group positions for highlighting.
3. Without `g`, only one `exec` runs. With `g`, it loops over `exec` and bumps `lastIndex` after zero-length matches so the loop always advances.
4. Safety limits: stops after `MAX_MATCHES` (2000) matches or 300 ms of looping, setting `truncated` / `slow`. **A single catastrophic-backtracking `exec` can still freeze the tab.** The logs are short, so this is unlikely in practice; see §11.
5. `groupCount` is found by compiling `(?:pattern)|` and executing it on `""`.
6. Syntax errors are mapped to plain English by `friendlyError`. The raw engine message is shown underneath.

### Grading (`evaluate`)
- `actual` = `match[0]` per match, or group 1 when `matchMode === "group"` (an unmatched group becomes `"∅"`).
- **Pass = exactly the same array as `expectedMatches`, same order and same length.** Duplicates count; case 10 expects `203.0.113.7` twice.
- The multiset difference (`missing`, `extras`) is used only for feedback messages.
- **Analyze Signal** (Enter) never costs points. **Submit Evidence** (Ctrl/Cmd+Enter) adds a misfire on failure.

### Progression
- `isUnlocked(p, i)`: case 0 is always open. Case *i* opens once case *i−1* is solved (or if case *i* was already solved). In practice, players solve case 10 last.
- Replaying a solved case keeps the **best** score (`score`) and also stores `lastScore`.

### Scoring (in `submit`)
| Component | Points |
|---|---|
| Base | +1000 |
| Each failed submission | −100 |
| Hint requested | −200 |
| Solution declassified (available after 3 misfires) | −500 |
| Efficiency: pattern length ≤ reference length (not after declassifying) | +150 |
| Under par time (timed cases only) | +100 + round(500 × (1 − elapsed/limit)) |
| Floor | 100 minimum |

The timer for a case starts the first time it's opened (`sessions[id].start`) and keeps running across reloads. After a solve, the session resets, so a replay is timed from scratch.

### Badges (`BADGES`)
Badges aren't stored; each one is a predicate over `progress`, recomputed on render.

| id | Name | Condition |
|---|---|---|
| `first` | First Contact | ≥ 1 case solved |
| `clean` | Clean Hands | A case solved without a hint or declassify |
| `lean` | Lean Code | Efficiency bonus earned on any case |
| `flawless` | Flawless | A case solved with 0 misfires |
| `field` | Field Agent | ≥ 5 cases solved |
| `clock` | Beat the Clock | Case 10 solved under par |
| `master` | Master Cryptanalyst | All cases solved, which unlocks the **final badge** |

### Final badge (Master Cryptanalyst emblem)
- Solving the last case opens the victory modal with a **"♛ Claim Your Badge"** button. It opens `CompletionModal`, which shows the `MasterEmblem` SVG with the total score and completion date.
- `progress.completedAt` is set the first time the player reaches 10/10. It's shown on the emblem and kept through replays.
- Once complete, a permanent "Final Commendation Earned" card appears under the commendations, with a **View Badge** button.
- **Download Badge** serializes the SVG, draws it onto a 1200×1200 canvas and saves `regex-noir-master-cryptanalyst.png`. The emblem uses fixed hex colors (`EMBLEM_COLORS`) rather than theme variables, so the PNG looks the same in both themes. Web fonts aren't embedded in the PNG; the system monospace/sans font is used instead.

### Donation placement
The ☕ button appears in the header and footer, inside the victory modal whenever the solved total is a multiple of 3, and as a milestone card on the main page at those same totals. Every link uses `target="_blank" rel="noopener noreferrer"`.

## 7. Persistence (`localStorage["regexNoir.v1"]`)

```jsonc
{
  "solved": {
    "case-01": {
      "score": 1150, "lastScore": 1150,          // best and most recent
      "pattern": "PHANTOM_\\d+", "flags": "g",   // the winning pattern
      "time": 13, "failed": 0,                   // seconds, misfires
      "hintUsed": false, "revealed": false,
      "efficient": true, "underPar": false,
      "solvedAt": 1793966101159
    }
  },
  "sessions": { "case-02": { "failed": 1, "hintUsed": false, "revealed": false, "start": 1793966110000 } },
  "drafts":   { "case-02": { "pattern": "SN.\\d+", "flags": "g" } },  // auto-saved on every keystroke
  "current": 1,                                  // last open case index
  "settings": { "sound": true, "theme": "light" },
  "completedAt": 1793999999999                   // set on first 10/10
}
```

- Every read and write is wrapped in `try/catch`. In private mode or with storage blocked, the game still runs but won't remember anything.
- `loadProgress` merges with `DEFAULT_PROGRESS`, so new fields are safe to add. Unknown theme values (e.g. the old `noir` / `terminal`) fall back to `light`.
- **Reset** (header) clears everything except `settings`.
- To test a fresh start, run `localStorage.removeItem("regexNoir.v1")` in the dev console.

## 8. Theming

Two themes are set with `<html data-theme="…">`; all colors come from CSS custom properties.

| Theme key | Label | Notes |
|---|---|---|
| `light` | **Cream** (default) | 60/30/10 palette |
| `contrast` | **High Contrast** | Black on cream with solid black borders; uses the same token names |

**60/30/10 split in the Cream theme:**

| Share | Tokens | Value | Used for |
|---|---|---|---|
| 60% dominant | `--bg`, `--panel` | `#f8f3e8`, `#fbf7ef` | Page and main card surfaces |
| 30% secondary | `--secondary`, `--bg2`, `--panel2`, `--border` | `#ebe2d0`, `#f1e9da`, `#efe6d5`, `#ddd1bb` | Header, footer, inputs, data feed, inner cards |
| 10% accent | `--accent` (+ `--mark-bg`, `--group-bg`, `--coffee`) | `#1f6f68` deep teal | Primary buttons, active flags and case, tokens, highlights, coffee button |

Text is `--text` `#2d2a24` (warm ink) and `--muted` `#776d5f`. `--ok`, `--err` and `--warn` are muted semantic colors kept to small status text.

To add a theme: add a `[data-theme="x"]` block defining **every** token, add `x` to `THEMES`, and update the toggle in `App` (it currently switches between two values).

Scrollbars are hidden globally (`scrollbar-width: none` / `::-webkit-scrollbar { display: none }`). Scrolling still works with the wheel, trackpad, touch and keyboard.

## 9. Accessibility notes
- Modals use `role="dialog"` and `aria-modal`, and close on Escape and backdrop click.
- Live regions: the solved-count badge and the feedback console (`aria-live="polite"`).
- The flag chips and sound toggle use `aria-pressed`. The regex input sets `aria-invalid` on a syntax error.
- `prefers-reduced-motion` turns off all animations.
- Hidden scrollbars give no visual hint that the case strip and data feed scroll sideways on narrow screens. Revisit this if players miss content.

## 10. Testing

```bash
node tools/verify-cases.js
```

The script checks that every reference pattern produces exactly the expected evidence, that every alternative listed in the script passes, and that every listed trap is rejected. It exits with code 1 on any mismatch, so it can run in CI.

Manual smoke test before shipping:
1. Fresh storage → case 01 open, others locked.
2. Type `(` → friendly "Unclosed parenthesis" error, Submit disabled.
3. Submit a trap → shake, misfire logged, −100.
4. Solve → victory modal with breakdown; Next Case unlocks.
5. Reload → progress, drafts and theme persist.
6. Toggle theme and sound; check the phone layout (375 px) for sideways scrolling.
7. Solve all 10 (use the reference patterns or your local `SOLUTIONS.md`) → "Claim Your Badge" → emblem → Download Badge produces a PNG.

## 11. Known limitations / future work
- **ReDoS:** regexes run on the main thread. To harden this, move `runRegex` into a Web Worker with a timeout and terminate the worker on overrun.
- **In-browser Babel:** for faster loads, precompile the JSX once (e.g. `npx babel --presets @babel/preset-react`) and drop the Babel CDN. The page still ships as one file.
- **Tailwind Play CDN** logs a "not for production" console warning. For production, generate a static CSS build and inline it.
- **Order-sensitive grading:** evidence must be in document order. This is always true for a single left-to-right regex, but it's worth knowing if a case ever grades something other than match order.

## 12. Social preview image (`og-image.png`)
- 1200×630 PNG in the Cream palette: the title and tagline on the left, and a mock regex console solving case 01 on the right.
- The source is `tools/og-image.html`. Edit it, then regenerate from the project root:
  ```bash
  google-chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --virtual-time-budget=8000 --screenshot=og-image.png tools/og-image.html
  ```
  The page loads Google Fonts, so it needs network access. `--virtual-time-budget` gives the fonts time to load before the screenshot.
- `index.html` declares `og:image:width`, `og:image:height` and `og:image:alt`. Keep them in sync if the image size or content changes.
- After deploying, check the preview with a link-preview debugger (e.g. the Facebook Sharing Debugger or LinkedIn Post Inspector). Social networks cache images aggressively.

## 13. Favicon and app icons
Two marks, both cream on the theme's teal accent (`#1f6f68`):

| Source | Shape | Used for |
|---|---|---|
| `tools/icons/mark-small.svg` | Rounded square with a bold **`.*`** ("match anything"), simplified so it reads at 16 px | `favicon.svg`, `favicon.ico` (16/32/48), and the inline favicon in `index.html` |
| `tools/icons/mark-large.svg` | Full-bleed square with **`/.*/`**, kept inside the central 80% so maskable cropping can't cut it | `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` |

How it's wired in `index.html`:
- An **inline SVG data URI** of the small mark is the main favicon, so the game still has a tab icon when `index.html` is opened alone.
- `favicon.ico` covers older browsers, `apple-touch-icon.png` covers iOS home screens, and `site.webmanifest` covers Android/desktop installs. These need the files deployed next to `index.html`.
- When the page is opened straight from disk (`file://`), the browser may log a blocked request for `site.webmanifest`. That's harmless; it works when served over http(s).

**Regenerate** after editing either SVG (needs `google-chrome` and Python with Pillow):
```bash
bash tools/icons/render.sh
```
This rewrites all the icon files in the project root. If you change `mark-small.svg`, also update the inline data URI in `index.html` (the `<link rel="icon" type="image/svg+xml">` tag) to match.
