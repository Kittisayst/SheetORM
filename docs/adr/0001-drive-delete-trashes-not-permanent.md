# DriveFolder.delete() trashes files, does not permanently delete them

`Table.delete()` removes a sheet row immediately and irreversibly — there is no intermediate state in a
spreadsheet. Drive, however, has a native two-stage delete: `setTrashed(true)` (recoverable) and permanent
deletion (not recoverable). We decided `DriveFolder.delete(id)` calls `setTrashed(true)`, matching normal
Drive UI behavior, rather than deleting permanently to stay "consistent" with `Table.delete()`. Files are
often higher-stakes than spreadsheet rows (source documents, user uploads), so the safer default was
chosen deliberately even though it makes `Table.delete()` and `DriveFolder.delete()` behave differently.
Permanent deletion is available only via a separate, explicitly-named method (`permanentDelete()`, planned)
so callers can't reach it by accident.
