# Changelog

Version numbers below refer to Apps Script library versions (`clasp versions` / Project Settings ⚙️),
not this repo's git history — pin `appsscript.json`'s `dependencies.libraries[].version` to the version
that has the feature you need.

## v5 (unreleased — this branch)

- Added `DriveFolder.getImageUrl(fileId)` — returns a browser-embeddable (`<img src>`-safe) image URL.
  Throws if the file isn't an `image/*` mimeType. See `docs/adr/0003-*.md` for why it uses
  `lh3.googleusercontent.com` instead of a documented Drive URL pattern.
- Added `sharing: "public"` option to `DriveFolder.insert()` and `.update()` — sets the file/folder to
  `ANYONE` + `VIEW` access.
- Added `SheetORM.whoAmI()` — returns the email of the account the script is executing as, for debugging
  Drive permission/account-mismatch issues.
- Improved `driveConnect()`'s `ConnectionError` message to point at `whoAmI()` instead of a bare
  "Cannot open Drive folder" message.

## v4

- Added `SheetORM.driveConnect(folderId)` and the `DriveFolder` construct — CRUD (`insert`/`findAll`/
  `findById`/`find`/`update`/`delete`) and query-builder support (`where`/`orderBy`/`limit`/`offset`/
  `select`) for a Google Drive folder, alongside the existing Sheet-backed `Table`. See `CONTEXT.md` and
  `docs/adr/0001-*.md` / `docs/adr/0002-*.md`.

## v3

- No description recorded for this version at publish time.

## v2

- Labeled `v1` in `clasp versions` — Sheet-backed `Table`/`Query`/`Migrator`/`Seeder` functionality
  (no further detail recorded at publish time).

## v1

- `SheetORM v1.0.0` — initial release: `connect`, `Table` CRUD, `Query` builder, schema validation,
  `Migrator`, `Seeder`.
