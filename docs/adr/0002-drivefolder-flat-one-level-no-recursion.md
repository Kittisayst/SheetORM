# DriveFolder lists files and subfolders one level deep, with no automatic recursion

A Drive folder can contain both files and subfolders, and subfolders can nest arbitrarily deep. We decided
`DriveFolder.findAll()`/`find()` return only the immediate children of the connected folder — both files
and subfolders, distinguished by a `type: "file" | "folder"` field on the record — and never recurse into
subfolders automatically. To read a subfolder's own contents, a caller reconnects explicitly via
`SheetORM.driveConnect(subfolderRecord.id)`.

The alternative (an automatic recursive/flattened listing, e.g. `findAll({ recursive: true })`) was
rejected: Drive has no batch "list entire tree" call, so recursion means one Apps Script API call per
folder in the tree, which gets slow and can blow execution-time limits on deep or wide folder structures.
Keeping `DriveFolder` a flat, one-level collection — mirroring how `Table` has no concept of nested
tables — keeps the cost of any single call predictable and pushes the choice to traverse deeper onto the
caller.
