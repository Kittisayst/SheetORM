# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SheetORM is a Google Apps Script (GAS) library that wraps a Google Spreadsheet as a database with an
ORM-style API — each sheet tab is a "table", row 1 is the header/field-name row, and `id`, `createdAt`,
`updatedAt` are auto-managed. There is no build step, no npm/package.json, and no bundler — this is plain
`.gs` (V8 JavaScript, ES5-style `function`/`.prototype`) code pushed directly via `clasp` to the Apps
Script runtime.

Consumer projects add SheetORM as an Apps Script **library** dependency (see `SKILL.md`) rather than
copying source files.

## Commands

- `clasp push` — push `src/` to the Apps Script project (requires a local `.clasp.json` with the script ID,
  which is gitignored and not present in this repo checkout).
- `clasp pull` — pull from Apps Script down to `src/`.
- There is no local test runner (no Jest/Mocha, no Node). Tests in `test/Test.gs` only run inside the Apps
  Script editor/execution environment against a real spreadsheet.

### Running tests

1. Push code (including `test/Test.gs`) to an Apps Script project bound to a test spreadsheet.
2. In `test/Test.gs`, set `SPREADSHEET_ID` to that spreadsheet's ID.
3. The spreadsheet needs a `test_users` sheet tab (used by `getTable()`/`clearTable()` helpers) with at
   least the columns the tests expect (`id`, `name`, `role`, `email`, `createdAt`, `updatedAt`, plus
   whatever a given test's schema exercises).
4. Run `runAllTests()` from the Apps Script editor and read `Logger.log` output — each test is a plain
   function added to the `tests` array; failures are caught individually and reported as `FAIL <name> → <message>`
   without stopping the run. There is no assertion library beyond the local `assert()`/`assertEqual()` helpers.
5. To add a test: write a new `function testX() { ... }` using `assert`/`assertEqual` and `getTable()`, and
   add its name to the `tests` array in `runAllTests()`.

## Architecture

### File load order matters

Apps Script concatenates all `.gs` files into one global scope — there are no `require`/`import`
statements. The docs (`README.md`, `SKILL.md`) prescribe this load order:

```
Errors.gs → Utils.gs → Validator.gs → Connection.gs → Table.gs → Query.gs → Migrator.gs → Seeder.gs → DriveFolder.gs → SheetORM.gs
```

Note this is **not** simple alphabetical filename order (`Connection.gs` would sort before `Errors.gs`
alphabetically, but the docs put `Errors.gs` first) — it reflects historical caution rather than a strict
runtime requirement. In practice, GAS/V8 hoists all top-level `function` declarations across the whole
concatenated script before anything runs, so a prototype method that references another file's constructor
or helper only at *call time* (which is true of every cross-file reference in this codebase) works
regardless of file order. Only top-level code that executes immediately at load — the `var Utils = (function
(){...})()` and `var Validator = (function(){...})()` IIFEs — is genuinely order-sensitive, and nothing else
in `src/` depends on them being evaluated before its own top level runs. Still, keep new files roughly in
the documented position (and follow the README/SKILL note about `01_`, `02_`... prefixes if a consumer
project's own alphabetical ordering ever fights this) to avoid relying on the hoisting behavior being
understood by the next reader.

Everything is defined as global constructor functions (`function Table(sheet) {...}`) with
`.prototype` methods — not classes, not modules — to match GAS's execution model.

### Call chain / responsibility split

- **`Errors.gs`** — `SheetORMError` base + `NotFoundError`, `ValidationError`, `ConnectionError` subclasses
  (via `Object.create(SheetORMError.prototype)`), plus `errResponse(e)` which every public method's
  `catch` block funnels through to produce the uniform `{ success, type, error, errors? }` shape.
- **`Utils.gs`** — `generateId`, `rowToObject`/`objectToRow` (header-array ⇄ plain-object conversion),
  `nowIso`.
- **`Validator.gs`** — `Validator.validate(schema, data)` returns field-level error array;
  `Validator.cast(schema, record)` type-casts values read back from the sheet according to a schema.
- **`Connection.gs`** — `Connection(spreadsheetId)` opens the spreadsheet via `SpreadsheetApp.openById`;
  `.table(sheetName)` looks up a sheet tab and returns a `Table`.
- **`Table.gs`** — the core CRUD surface (`insert`, `findAll`, `findById`, `find`, `update`, `delete`,
  `insertMany`) plus `.schema()` (chainable, attaches a schema for validation/casting) and query-builder
  entry points (`where`/`orderBy`/`limit`/`offset`/`select`) that construct a `Query`. Headers are always
  read fresh from row 1 (`_getHeaders`), so schema/column changes on the sheet are picked up without
  restarting anything.
- **`Query.gs`** — chainable query builder returned by `Table.prototype.where(...)` etc.; terminal methods
  are `.get()`, `.updateMany()`, `.deleteMany()`.
- **`Migrator.gs`** — schema-level operations (`createTable`, `dropTable`, `addColumn`, `removeColumn`,
  `renameColumn`) plus `run`/`rollback`/`status`, tracking applied migration versions in an
  auto-created `_migrations` sheet.
- **`Seeder.gs`** — `seed` (skip tables that already have data rows) and `freshSeed` (clear data rows,
  keep header, then insert) for populating tables from a `{ tableName: [rows] }` map.
- **`DriveFolder.gs`** — the Drive counterpart to `Table`: wraps a single Drive folder (via `folder`,
  the underlying Apps Script `Folder` object) as a flat, one-level collection of files *and* subfolders
  (`type: "file" | "folder"` on each record — see `CONTEXT.md` and `docs/adr/0002-*.md`). `id` is Drive's
  own native file/folder ID, never generated. Implements the same CRUD surface as `Table`
  (`insert`/`findAll`/`findById`/`find`/`update`/`delete`) plus the same query-builder entry points
  (`where`/`orderBy`/`limit`/`offset`/`select` → `new Query(this)`), so it plugs into the existing
  `Query.gs` without modification. `delete()` trashes rather than permanently deleting
  (`docs/adr/0001-*.md`); `update()` only touches metadata (`name`/`description`), never content or
  parent folder. `_resolveItem(id)` centralizes the "find by id + must be a direct child of this folder"
  lookup used by `findById`/`update`/`delete`.
- **`SheetORM.gs`** — the library's public entry point: thin functions (`connect`, `driveConnect`,
  `migrate`, `rollback`, `migrationStatus`, `seed`, `freshSeed`) that consumer code calls as
  `SheetORM.connect(...)`, `SheetORM.driveConnect(...)`, etc. When adding a new top-level capability, it
  should be wired through here.

### Uniform response contract

Every public method (CRUD, query builder terminals, migration, seed) returns
`{ success: true, data: ... }` or `{ success: false, type: "<ErrorType>", error: "...", errors?: [...] }` —
never throws to the caller. Internally, methods throw one of the `Errors.gs` subclasses and the outer
`try/catch` converts it via `errResponse(e)`. When adding a new method, follow this same
throw-internally / catch-and-wrap-at-the-boundary pattern rather than returning ad hoc shapes.

The one deliberate exception is the connect step itself: `SheetORM.connect(spreadsheetId)` and
`SheetORM.driveConnect(folderId)` throw directly (a plain `Error` from `Connection.gs`, a `ConnectionError`
from `driveConnect`) rather than returning `{success:false}` — there's no `Table`/`DriveFolder` instance
yet to hang a `try/catch`-wrapped method off of, so failure to connect is a genuine exception the consumer
must catch themselves.

### Schema is optional and attached per-table-instance

`.schema()` is not persisted anywhere — it's set on a `Table` instance in application code
(`db.table("users").schema({...})`) and only affects that instance's validation (on insert/update) and
type casting (on read). A `Table` obtained without `.schema()` does no validation and returns raw
string values from the sheet.

## Language conventions

- ES5-style constructor functions and `.prototype`, not `class`.
- `var`, not `let`/`const` (source is GAS-targeted; `const`/`let` do appear in README examples for
  *consumer* code, but library source in `src/` uses `var`/`function` throughout).
- Docs (`README.md`, `SKILL.md`) are written in Lao; comments in `src/` are a mix of Lao and English.
