# Zine Creator — v1 Spec

A browser app for making printable fold-and-cut zines. You fill pages in reading order; the app imposes them onto an A4 sheet and exports a print-ready PDF.

## Platform

- Static, client-only web app. No backend, no accounts, no analytics.
- React + TypeScript + Vite. State: Zustand + Immer + zundo (undo). Styling: CSS Modules.
- PDF generation in the browser with `pdf-lib`.
- Deployed to GitHub Pages via a GitHub Actions workflow on every push to `main`.
- Desktop/laptop browsers first, usable on tablet. Phones show a "best on a bigger screen" notice.
- English-only UI.

## Modes

A project's mode and page orientation are chosen at creation and cannot be changed.

Page maps are listed by sheet row, left to right, as seen on the printed side. `↻` = panel rotated 180°.

### A4 8-panel mini zine

- Sheet: A4 landscape, 4 columns × 2 rows, panels run edge to edge.
- Page size: 74.25 × 105 mm.
- Page map:

  ```
  row1   7↻  6↻  5↻  4↻
  row2   8   1   2   3
  ```

- Cut: horizontal slit along the middle line, spanning columns 2–3. All other panel boundaries are folds.

### Micro mini zine (16 pages)

- Sheet: A4 portrait, 4 columns × 4 rows, panels run edge to edge.
- Page size: 52.5 × 74.25 mm (A8 portrait).
- Page map:

  ```
  row1   9↻  8↻  7↻  6↻
  row2   10  11  4   5
  row3   13↻ 12↻ 3↻  2↻
  row4   14  15  16  1
  ```

- Cuts:
  - "I" shape in the centre: horizontal cut on the row1/row2 line across columns 2–3; horizontal cut on the row3/row4 line across columns 2–3; vertical cut on the column2/column3 line joining them through rows 2–3.
  - Side cuts on the row2/row3 line across all of column 1 and all of column 4.
  - All other panel boundaries are folds.
- Reference: [`micro-mini-reference.jpg`](micro-mini-reference.jpg) (thick lines = cuts).

### TCG 8-panel zine

- Same grid and page map as the A4 8-panel mini zine, but each cell is 63 × 88 mm (trading-card size). The 252 × 176 mm grid is centred on A4 landscape.
- Crop marks are always printed. Assembly: trim to the crop marks, then fold and cut as for the A4 8-panel.
- Bleed: 3 mm on the outer edges of the grid only (no bleed on internal fold/cut edges). Per-project setting, on by default, also toggleable in the export dialog. Crop marks sit outside the bleed.

### Page orientation

- **Portrait** (default): the page maps above. The booklet opens sideways, like a book.
- **Landscape**: same sheet, page map, folds and cuts, with every page turned a quarter turn anticlockwise in its slot (page width and height swap). The finished booklet is the portrait booklet turned a quarter turn clockwise: the spine runs along the top of the front cover, pages flip upward like a calendar, and facing pages sit one above the other.
- Bleed, printer-margin guides and the instructions diagram follow the turned page. Landscape exports add a step telling the reader to flip upward. Test sheets come in both orientations.

### Imposition data

Each mode's imposition is pure data: a table mapping each sheet slot to a page number and rotation (0° or 180°), plus the mode's cut and fold segments. Instruction diagrams and guide lines are derived from the same data.

## Content model

- A project has a name, a mode, an orientation, and exactly 8 or 16 pages.
- Page 1 is labelled "Front cover", the last page "Back cover".
- Pages can be reordered by dragging thumbnails. Pages cannot be added or deleted.
- Each page has:
  - **Background colour** — default white.
  - **At most one image** — cover-fill by default; drag to pan, slider to zoom; "fit whole image" toggle. No rotation, filters or multiple images.
  - **Merged with its facing page** (optional), see below.
  - **Any number of text boxes** — move freely; width is set by the user, height grows to fit the text. Properties: font, size, colour, alignment (left/centre/right), optional solid background colour. Plain text only (no mixed styles within a box).
- No automatic page numbers.

### Merged pages

- The two pages of a facing pair (2–3, 4–5, … — never the covers, and never across spreads such as 3–4) can be merged so one image runs across both, for wide photos.
- Every facing pair is printed side by side across a fold, so a merged image prints as one continuous picture.
- The image lives on the pair's first page and is laid out over both trim boxes (plus the bleed of both pages, when on). Each page keeps its own background and text boxes.
- Merging keeps the first page's image (or the second's if the first has none) and recentres it. Splitting leaves the image on the first page.
- Reordering moves a merged pair as a whole, and only onto another facing pair. A single-page move that would split a merged pair or shift it off its facing pair is not allowed.

### Images

- On import, images are downscaled to at most ~3000 px on the long edge.
- A warning badge shows on a page when its image's effective resolution falls below 150 DPI at the current zoom.

## Fonts

- All fonts live in `src/fonts/`. Every font file there is discovered at build time via `import.meta.glob`; the display name derives from the filename (`Special-Elite.woff2` → "Special Elite").
- Each font's licence file (OFL or Apache 2.0) sits next to it as `<Name>.LICENSE.txt`.
- Fonts are loaded via the `FontFace` API and awaited before any render, so canvas output never uses a fallback font.
- Adding a font = drop the file in the folder and redeploy. No user-uploaded fonts in v1.
- Starting set: Inter, Special Elite, Permanent Marker, Caveat, Bebas Neue, Libre Baskerville.

## Editor

- Pages are edited in reading order, with a thumbnail strip and an open-book spread preview (1 alone, then 2–3, 4–5, …, last page alone). Landscape spreads are stacked vertically.
- A separate read-only "Print sheet" view shows the imposed sheet.
- Rendering: a single `renderPage(page, scale)` canvas function is used by both the editor and the export. A DOM overlay handles interaction only (selection handles, drag regions, in-place textarea while editing text).
- Editor-only guides (never rendered into the PDF):
  - Printer-margin zone: outer ~3–5 mm of the sheet, A4 modes.
  - Fold/cut safe zone: 2 mm inside every page edge.
  - TCG bleed strip (dimmed), shown when bleed is on.
- Undo/redo: Ctrl+Z / Ctrl+Shift+Z. History is in memory only and resets when a project is reopened.

## Persistence

- Multiple projects stored in IndexedDB. Home screen lists them with thumbnails.
- New project flow: pick mode, enter name.
- Autosave: every change is persisted (debounced). No Save button.
- Backup/transfer: save and load a project as a `.zine` file (zip of project JSON + image files). Version 2 added orientation and merged pages; version 1 files still open (as portrait, nothing merged).

## Export

- Each page is rendered to canvas at 300 DPI and placed into the PDF as an image, then imposed onto the sheet (with rotation) per the mode's table.
- Export dialog options:
  - Fold lines (faint dashed) — on by default.
  - Cut lines — on by default.
  - Crop marks — always on in TCG mode.
  - Bleed — TCG only, see above.
  - Instructions page — off by default. A second PDF page with numbered steps for the mode (trim, fold, cut, assemble) and a diagram of the sheet drawn from the imposition data, cut lines in red.
- An unobtrusive "Print at 100% / actual size" note on the sheet.
- Filename: `<project-name>-<mode>.pdf`.

## Testing

- Vitest unit tests for the imposition tables and the `.zine` save/load round trip.
- Imposition is verified by printing and folding a real sheet for each mode.
- No browser end-to-end tests in v1.
