# SheetORM

Google Apps Script library that wraps Google Workspace containers (Sheets, and now Drive folders) as
queryable, CRUD-able data stores with a uniform response shape.

## Language

**Table**:
The queryable/CRUD-able collection tied to one Sheet tab, identified by name within a `Connection`. Rows are records; row 1 is the header/field-name row.
_Avoid_: Sheet (the underlying Apps Script object), tab

**DriveFolder**:
The queryable/CRUD-able collection tied to one Google Drive folder, identified by its `folderId`. Plays the same structural role as `Table` (a single flat collection you connect to directly), but for Drive files instead of sheet rows. A `DriveFolder` record's `id` is Drive's own native file/folder ID (Google-assigned), never a SheetORM-generated UUID, unlike `Table` records. Records returned by `findAll`/`find` include **both files and subfolders** one level deep — each record carries a `type` (`"file"` or `"folder"`) to distinguish them.
_Avoid_: Table (do not reuse — Drive files have no schema/columns and different operations than sheet rows), Connection

**Image URL**:
The browser-embeddable (`<img src>`-safe) URL for a Drive image record, returned by `DriveFolder.getImageUrl(fileId)`. Distinct from `record.url`, which is Drive's viewer-page link (`drive.google.com/file/d/<id>/view`) and cannot be used as an `<img src>` (blocked by the browser/CDN as an opaque, non-image response). `getImageUrl()` validates the file's mimeType is `image/*` and throws otherwise; it does **not** check or guarantee the file's sharing permissions — the caller is responsible for making the file link-shareable (see `insert()`'s `sharing` option) for the URL to actually render for other viewers.
_Avoid_: embedUrl, record.url (for embedding purposes)
