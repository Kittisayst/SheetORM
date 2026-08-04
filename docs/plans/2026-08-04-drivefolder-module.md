# DriveFolder module (Google Drive file management via folder ID)

- **Date:** 2026-08-04
- **Status:** implemented
- **Project:** SheetORM

## ເປົ້າໝາຍ (Goal)

ເພີ່ມ module ໃໝ່ໃສ່ SheetORM ສໍາລັບຈັດການໄຟລ໌ໃນ Google Drive ຜ່ານ `folderId` — ຄ້າຍກັນກັບວິທີທີ່ SheetORM
ຈັດການ Sheet ຜ່ານ `spreadsheetId`. Consumer ຈະເອີ້ນ `SheetORM.driveConnect(folderId)` ແລ້ວໄດ້ object
ທີ່ CRUD ໄຟລ໌/subfolder ພາຍໃນ folder ນັ້ນໄດ້ ດ້ວຍ response contract ດຽວກັນກັບສ່ວນອື່ນຂອງ library
(`{success, data}` / `{success:false, type, error}`).

ການອອກແບບ domain ຖືກ resolve ໄວ້ຄົບຖ້ວນແລ້ວຜ່ານ `/grill-with-docs` session ກ່ອນໜ້ານີ້ — ບັນທຶກໄວ້ໃນ
`CONTEXT.md` (glossary) ແລະ ADR 2 ອັນ:
- `docs/adr/0001-drive-delete-trashes-not-permanent.md`
- `docs/adr/0002-drivefolder-flat-one-level-no-recursion.md`

## Context ປັດຈຸບັນ

SheetORM ປັດຈຸບັນມີແຕ່ Sheet-based module (`Connection` → `Table` → `Query`), load ຕາມ alphabetical
order: `Errors.gs → Utils.gs → Validator.gs → Connection.gs → Table.gs → Query.gs → Migrator.gs →
Seeder.gs → SheetORM.gs`. ທຸກ public method throw internal error class (`Errors.gs`) ແລ້ວ catch/wrap ດ້ວຍ
`errResponse(e)` ຢູ່ boundary — ບໍ່ throw ອອກໄປຫາ caller ໂດຍກົງ.

`Query.gs` ເປັນ generic query builder ທີ່ duck-type ຕໍ່ານ `_table` object ໃດກໍໄດ້ທີ່ມີ `findAll()`,
`update(id,data)`, `delete(id)`, ແລະ `idColumn` — `Table` ໃຊ້ pattern ນີ້ຢູ່ (`src/Table.gs:161-179`)
ແລະ `DriveFolder` ຈະໃຊ້ pattern ດຽວກັນ ໂດຍບໍ່ຕ້ອງແກ້ `Query.gs`.

`Errors.gs` ມີ `ConnectionError`/`NotFoundError` ພ້ອມແລ້ວ — reuse ໄດ້ໂດຍກົງ, ບໍ່ຕ້ອງສ້າງ error type ໃໝ່.

## ແນວທາງ (Approach)

ສ້າງ `src/DriveFolder.gs` ເປັນ constructor + prototype ໃໝ່ (ຄືກັນກັບ `Table`), ຫຸ້ມ Drive `Folder`
object ຂອງ Apps Script. Entry point ຢູ່ `SheetORM.gs` (`driveConnect(folderId)`). ບໍ່ໃຊ້
`Connection`/`.table()` indirection ເພາະ folder ດຽວ = collection ດຽວໂດຍກົງ (ບໍ່ຄືກັນກັບ spreadsheet ທີ່
ມີຫຼາຍ sheet tab).

ຄໍາຕັດສິນໃຈຫຼັກ (ຈາກ grill session, ບໍ່ຕ້ອງ re-litigate):

| ຫົວຂໍ້ | ຄໍາຕັດສິນ |
|---|---|
| `id` | Drive native fileId/folderId, ບໍ່ generate UUID |
| `insert(data)` | `data.blob` → upload file; ບໍ່ມີ `blob` ແຕ່ມີ `name` → ສ້າງ subfolder |
| `findAll`/`find` | metadata ເທົ່ານັ້ນ, ຄືນທັງ file+folder ໜຶ່ງຊັ້ນ, tag `type: "file"\|"folder"` |
| `update` | metadata ເທົ່ານັ້ນ (`name`, `description`) |
| `delete` | trash (`setTrashed(true)`), ບໍ່ permanent (ADR-0001) |
| query builder | ໃຊ້ `Query.gs` ຮ່ວມກັນ |
| recursion | ບໍ່ auto-recurse, ໜຶ່ງຊັ້ນ (ADR-0002) |
| schema/insertMany/Migrator/Seeder ສໍາລັບ Drive | ບໍ່ຢູ່ scope v1 |
| v2 (ບໍ່ເຮັດຕອນນີ້) | `replaceContent`, `moveTo`, `permanentDelete` |

## ຂັ້ນຕອນ (Steps)

1. ສ້າງ `src/DriveFolder.gs`: constructor, `_toRecord()`, `findAll`, `find`, `findById`, `insert`,
   `update`, `delete`, ແລະ query-builder entry points (`where`/`orderBy`/`limit`/`offset`/`select` →
   `new Query(this)`, copy pattern ຈາກ `Table.gs:161-179`).
2. ເພີ່ມ `driveConnect(folderId)` ໃສ່ `src/SheetORM.gs`, wrap `DriveApp.getFolderById` ດ້ວຍ try/catch →
   `ConnectionError`.
3. ເພີ່ມ test suite ໃໝ່ໃສ່ `test/Test.gs` (constant `DRIVE_FOLDER_ID`, helper `getDriveFolder()`/
   `clearDriveFolder()`, ແລະ test function ຄຸມທຸກ method) ແລ້ວລົງທະບຽນໃນ `tests` array ຂອງ
   `runAllTests()`.
4. ອັບເດດ `README.md`, `SKILL.md` (ເພີ່ມ section "Drive"), ແລະ `CLAUDE.md` (file structure/load order
   list) ໃຫ້ຮວມ `DriveFolder.gs`.
5. ຮັນ `runAllTests()` ໃນ Apps Script editor ຕໍ່ folder ທົດສອບຈິງ, ຢືນຢັນ PASS ໝົດ, ບໍ່ມີ regression ຢູ່
   test ເກົ່າ.
6. ປ່ຽນ status ຂອງແຜນນີ້ ແລະ ແຖວໃນ `HISTORY.md` ເປັນ `implemented`.

## Files ທີ່ຈະຖືກກະທົບ

- `src/DriveFolder.gs` — ໃໝ່, core implementation
- `src/SheetORM.gs` — ເພີ່ມ `driveConnect`
- `test/Test.gs` — ເພີ່ມ Drive test suite
- `README.md`, `SKILL.md`, `CLAUDE.md` — ເອກະສານ

## ຄວາມສ່ຽງ / ຄຳຖາມທີ່ຍັງເປີດ (Risks / Open Questions)

- `findById`/`update`/`delete` ຄວນຈໍາກັດໃຫ້ຢູ່ພາຍໃນ direct children ຂອງ folder ນີ້ເທົ່ານັ້ນ (ບໍ່ຮັບ id
  ຈາກ folder ອື່ນ) — ນີ້ແມ່ນ default ທີ່ສົມເຫດສົມຜົນ ຕາມ ADR-0002 ແຕ່ບໍ່ໄດ້ຖືກຖາມໂດຍກົງໃນ grill session,
  ຄວນຢືນຢັນກ່ອນ/ໃນລະຫວ່າງ implement.
- `getDateCreated`/`getLastUpdated` ຂອງ Drive ບໍ່ໄດ້ mean ຄືກັນທຸກຢ່າງກັບ `createdAt`/`updatedAt` ຂອງ
  `Table` (Drive's "last updated" ອາດປ່ຽນຈາກ metadata change ບໍ່ແມ່ນ content change ຢ່າງດຽວ).
- ບໍ່ມີ pagination ສໍາລັບ Drive listing ນອກເໜືອຈາກ in-memory `limit`/`offset` ຂອງ `Query.gs` — ຄືກັນກັບ
  ຂໍ້ຈໍາກັດປັດຈຸບັນຂອງ `Table` ຢູ່ແລ້ວ, ບໍ່ໄດ້ແກ້ໄຂເພີ່ມໃນ v1 ນີ້.
