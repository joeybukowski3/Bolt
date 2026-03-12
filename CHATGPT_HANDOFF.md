# Bolt ChatGPT Handoff

## Goal
Use this as context for reviewing Bolt and planning a new feature page that reuses existing research + age pipelines without breaking API contracts.

## Core files
- `index.js` (main search UX, replacement table rendering, compare flow, serial decode + age range UI merge)
- `api/search.js` (research-fast, research-detail, and legacy age mode)
- `item-age.js` (standalone item age page flow)
- `api/age-lookup.js` (Smart Lookup POST endpoint with HVAC quick decode + AI fallback)
- `decoder-data.js` and `decoding-methods*.csv` (decode reference inputs)
- `index.html`, `global.css`, `shared.css` (page structure + shared styling)

## Architecture at a glance
1. Frontend search flow in `index.js`:
   - `performSearch()` triggers parallel calls:
     - `/api/search?mode=research-fast&query=...`
     - `/api/search?mode=research-detail&query=...` (if detail sections are enabled)
   - `renderFast()` renders overview, age, valuation metrics.
   - `renderDetail()` renders Replacement Options table, LKQ guidance, diagnostics, recall/error/failure/manual sections.
2. Frontend age flow:
   - `item-age.js` uses `/api/search?mode=age&query=...` for serial/model age text.
   - Main page (`index.js`) also has local serial decode (`tryDecodeSerial`) that can return:
     - exact age (month/week + year)
     - estimated age range (`ageMin`-`ageMax`) when only year is known
3. Backend research API (`api/search.js`):
   - `mode=research-fast` -> compact summary payload.
   - `mode=research-detail` -> replacement table + diagnostics payload.
   - `mode=age` -> backwards-compatible lightweight age JSON for `item-age.js`.
   - Sanitizers enforce shape and keep degraded fallback responses valid.
4. Backend Smart Lookup API (`api/age-lookup.js`):
   - POST endpoint with `query` body.
   - Rate limiting + Redis cache.
   - HVAC serial quick decode path before AI.
   - Gemini first, Groq fallback.

## API contracts you should preserve

### GET `/api/search?mode=research-fast&query=...`
Primary response blocks:
- `searchTier` (1-4)
- `analysis` (entered/model/tier/category/specs/pricing/status)
- `releaseDate` (`productionEra`, `discontinuation`, `estimatedAge`, `ageNumeric`)
- `availability`, `refineTip`, `variations[]`
- `meta` (mode/version/as_of)

### GET `/api/search?mode=research-detail&query=...`
Primary response blocks:
- `searchTier`, `tableMode` (`standard|product-line|tiered`)
- `table[]`, `dynamicRows[]`, `tableNote`, `narrowYourResults`, `whatToConsider[]`
- `itemNotes`, `howItWorks`, `recalls`, `errorCodes`, `failures`, `repairParts`
- `manual`, `manufacturerPage`, `troubleshooting`, `technicalSpecs`, `serviceLife`
- `meta` (mode/version/as_of)

### GET `/api/search?mode=age&query=...`
Compatibility response used by `item-age.js`:
- `releaseDate.estimatedAge`
- `releaseDate.productionEra`
- `analysis.decodingMethod`
- `howItWorks`

### POST `/api/age-lookup`
Body:
- `{ "query": "..." }`

Response (normal):
- `brand`, `model`, `estimatedYear`, `yearRange`
- `specificityLevel`, `inventionSummary`, `refinementSuggestion`
- `notes`, `evidence[]`, `serialLocation`, `serialRule`
- `exampleModelNumber`, `suggestedModelNumbers[]`
- internal flags: `_source`, `_fallbackUsed`

Response (degraded):
- `{ "errorCode": "AI_UNAVAILABLE", "message": "..." }`

## High-value frontend anchors
- `index.js`:
  - `performSearch()` -> parallel API orchestration and cache (`sessionStorage`)
  - `renderFast(data)` -> summary/age/valuation metrics
  - `renderDetail(data)` -> Replacement Options and diagnostics rendering
  - `tryDecodeSerial(serial)` + `handleSerialDecode()` -> local serial decode and age range/age exact handling
  - `runComparison()` -> compare tool using additional fast/detail calls
- `item-age.js`:
  - `performAgeLookup(method)` -> age query flow for serial/model forms

## High-value backend anchors
- `api/search.js`:
  - `getResearchFastPrompt()`
  - `getResearchDetailPrompt()`
  - `sanitizeFastPayload()`
  - `sanitizeDetailPayload()`
  - `runFastMode()` / `runDetailMode()` / `runAgeMode()`
  - default `handler(req,res)` mode router
- `api/age-lookup.js`:
  - `decodeHvacSerial()`
  - `applyEraHints()` and brand-specific hint helpers
  - `callGroq()` fallback
  - default `handler(req,res)`

## Suggested new feature page pattern
1. Add `new-feature.html` with page-specific layout and controls.
2. Add `new-feature.js` to orchestrate calls to existing APIs (`/api/search` and/or `/api/age-lookup`).
3. Reuse shared styles from `shared.css`; add targeted styles in `global.css` or `new-feature.css`.
4. Keep API payload contracts unchanged; adapt only in the new page rendering layer.
5. If additional backend data is needed, add optional fields only (non-breaking), and preserve sanitizer defaults.

## Known constraints and behavior
- `index.js` expects stable keys from fast/detail payloads; missing keys degrade UI gracefully but can hide sections.
- `searchTier` controls visibility and table mode behavior.
- Age can come from:
  - research payload (`releaseDate.estimatedAge`, `ageNumeric`)
  - local serial decode (exact or range)
  - standalone age lookup endpoints
- `api/age-lookup` is POST and rate limited.
- `api/search` is GET and includes daily/time-scoped caching metadata.

## Good review asks for ChatGPT
Use this prompt with the attached files:

"Review architecture and extension points for a new Bolt feature page. Preserve existing `/api/search` and `/api/age-lookup` contracts. Provide:
1. implementation plan,
2. exact file-level diffs,
3. data-flow diagram (text),
4. regression risk list,
5. tests/checklist for replacement tables and age-range logic."

## Files to attach first
- `index.js`
- `api/search.js`
- `item-age.js`
- `api/age-lookup.js`
- `decoder-data.js`

Optional for UI work:
- `index.html`
- `global.css`
- `shared.css`
- `smart-lookup.js`
