# DriveFolder DX improvements (image URL, sharing, whoAmI, error message, docs)

- **Date:** 2026-08-04
- **Status:** implemented
- **Project:** SheetORM

## ເປົ້າໝາຍ (Goal)

ແກ້ 5 ບັນຫາທີ່ພົບຈາກການໃຊ້ `DriveFolder` ຈິງໃນ Phase 2 (ອັບໂຫຼດຮູບຫ້ອງ): ບໍ່ມີ URL ທີ່ໃຊ້ໃນ `<img>` ໄດ້ຈິງ,
ບໍ່ມີທາງຕັ້ງ sharing ຕອນ upload, error message ບໍ່ຊ່ວຍ debug, ບໍ່ມີ utility ກວດບັນຊີ script, ແລະ ບໍ່ມີ
ເອກະສານ oauthScopes/version-per-feature. ການອອກແບບຖືກ resolve ຄົບຖ້ວນແລ້ວຜ່ານ `/grill-with-docs` —
ບັນທຶກໄວ້ໃນ `CONTEXT.md` (glossary term "Image URL") ແລະ `docs/adr/0003-image-url-uses-undocumented-google-endpoint.md`.

## Context ປັດຈຸບັນ

`src/DriveFolder.gs` (172 ແຖວ) ມີ `_resolveItem(id)` (ຫາ item + type ດ້ວຍ `getFileById` + `getMimeType()`
check, ບໍ່ໄດ້ໃຊ້ `getFolderById` ອີກຕໍ່ໄປ — ແກ້ bug ໄປແລ້ວຮອບກ່ອນ), `_toRecord(item, type)` (metadata ອອກ
ເປັນ record), `insert(data)` (ຮັບ `blob`/`name`, ບໍ່ຮັບ `sharing` ໃນປັດຈຸບັນ), `update(id, data)` (ຮັບ
`name`/`description` ເທົ່ານັ້ນ), `delete`, query-builder entry points. ບໍ່ມີ `getImageUrl()` ຫຼື
`_setSharing()` helper ໃນປັດຈຸບັນ.

`src/SheetORM.gs` (39 ແຖວ) ມີ `driveConnect(folderId)` throw `ConnectionError("Cannot open Drive folder: "
+ folderId)` ແບບ generic ບໍ່ມີ actionable guidance. ບໍ່ມີ `whoAmI()`.

`src/Errors.gs` ມີ `ConnectionError` ພ້ອມແລ້ວ, reuse ໄດ້ໂດຍກົງ — ບໍ່ຕ້ອງສ້າງ error type ໃໝ່ (grill session
ຕັດສິນໃຈບໍ່ພະຍາຍາມແຍກ "ID ຜິດ"/"ບໍ່ມີສິດ" ເປັນ error type ຄົນລະອັນ).

`SKILL.md` ບໍ່ໄດ້ລະບຸ oauthScopes ທີ່ຈໍາເປັນ. ບໍ່ມີ `CHANGELOG.md` ໃນ repo. `clasp versions` (ໃນ `src/`)
ສະແດງ 4 version ທີ່ publish ໄປແລ້ວ: `1 - SheetORM v1.0.0`, `2 - v1`, `3 - No description`,
`4 - feat: Drive` (version 4 ຄື version ທີ່ເພີ່ມ `DriveFolder`/`driveConnect` ຄັ້ງທໍາອິດ).

## ແນວທາງ (Approach)

ຄໍາຕັດສິນໃຈຫຼັກຈາກ grill session:

| ຫົວຂໍ້ | ຄໍາຕັດສິນ |
|---|---|
| `getImageUrl(fileId)` | ໃໝ່ໃນ `DriveFolder`. ກວດ `mimeType` ຂຶ້ນຕົ້ນ `"image/"`, throw plain `Error` ຖ້າບໍ່ແມ່ນ. ຄືນ `"https://lh3.googleusercontent.com/d/" + fileId` (ADR-0003). ບໍ່ກວດ sharing status. |
| `sharing` ໃນ `insert()`/`update()` | ຮັບ string `"public"` (= `ANYONE` + `VIEW` ຜ່ານ `setSharing()`) ຫຼືບໍ່ໃສ່ (default private/ບໍ່ແຕະ). ໃຊ້ໄດ້ທັງ file ແລະ folder record. |
| `SheetORM.whoAmI()` | ໃໝ່, top-level, ຄືນ `Session.getEffectiveUser().getEmail()` — ບໍ່ຕ້ອງ connect ຫຍັງກ່ອນ. |
| `ConnectionError` message ໃນ `driveConnect()` | ບໍ່ພະຍາຍາມແຍກ "ID ຜິດ"/"ບໍ່ມີສິດ" (Google ອາດຕັ້ງໃຈໃຫ້ error ຄືກັນ) — ປັບ message ໃຫ້ action-oriented, ຊີ້ໄປ `whoAmI()`. |
| ເອກະສານ oauthScopes | `SKILL.md` ຕ້ອງລະບຸ `.../auth/drive` (ເຕັມ, ບໍ່ແມ່ນ `drive.file` — ເພາະ `findAll`/`findById` ຕ້ອງອ່ານໄຟລ໌ທີ່ບໍ່ໄດ້ຖືກສ້າງໂດຍ script ນີ້ເອງນໍາ) ພ້ອມໝາຍເຫດວ່າອາດຫຼຸດ scope ໄດ້ຖ້າ use case ຈໍາກັດ. |
| `CHANGELOG.md` | ໃໝ່ທີ່ root, ມີ entry ຍ້ອນຫຼັງແບບຫຍໍ້ (v1-v4 ອີງໃສ່ `clasp versions` + `git log`) + entry ສໍາລັບ v5 (ການປັບປຸງຮອບນີ້). |

## ຂັ້ນຕອນ (Steps)

1. ເພີ່ມ `getImageUrl(fileId)` ໃສ່ `DriveFolder.prototype` ໃນ `src/DriveFolder.gs` — reuse
   `_resolveItem`/`DriveApp.getFileById` ເພື່ອດຶງ mimeType, throw ຖ້າບໍ່ແມ່ນ `image/*`, ຄືນ string URL
   ໂດຍກົງ (ບໍ່ wrap `{success,data}` ເພາະນີ້ຄື synchronous string builder ບໍ່ແມ່ນ CRUD — ຕ້ອງຢືນຢັນ
   pattern ນີ້ໃນ step review).
2. ເພີ່ມ private helper `_applySharing(item, sharing)` ໃນ `DriveFolder.gs` — ຖ້າ `sharing === "public"`
   ເອີ້ນ `item.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW)`. ເອີ້ນຈາກທັງ `insert()` ແລະ
   `update()` ເມື່ອ `data.sharing` ຖືກລະບຸ.
3. ເພີ່ມ `whoAmI()` ໃສ່ `src/SheetORM.gs` — `function whoAmI() { return Session.getEffectiveUser().getEmail(); }`.
4. ແກ້ `driveConnect()` ໃນ `src/SheetORM.gs` — ປັບ `ConnectionError` message ໃຫ້ຊີ້ໄປ `whoAmI()`.
5. ອັບເດດ `test/Test.gs` — ເພີ່ມ test ສໍາລັບ `getImageUrl` (ຮູບ → URL ຖືກຮູບແບບ, ບໍ່ແມ່ນຮູບ → throw),
   `sharing: "public"` ໃນ insert/update (ກວດ `getSharingAccess()`/`getSharingPermission()` ຫຼັງຈາກນັ້ນ),
   `SheetORM.whoAmI()` ຄືນ string email.
6. ສ້າງ `CHANGELOG.md` ທີ່ root — Keep a Changelog style, entry v1-v4 ຍ້ອນຫຼັງແບບຫຍໍ້ + v5 (ຮອບນີ້).
7. ອັບເດດ `SKILL.md` — ເພີ່ມ oauthScopes ໃນ "Setup in Consumer Project" section, ອັບເດດ Drive Folder
   section ໃຫ້ຮວມ `getImageUrl`/`sharing`/`whoAmI`.
8. ອັບເດດ `README.md` ໃຫ້ຄົບຄ່ຽງກັນ (Drive Folder section, Error Types).

## Files ທີ່ຈະຖືກກະທົບ

- `src/DriveFolder.gs` — ເພີ່ມ `getImageUrl`, `_applySharing`, ແກ້ `insert`/`update`
- `src/SheetORM.gs` — ເພີ່ມ `whoAmI`, ແກ້ `driveConnect` error message
- `test/Test.gs` — ເພີ່ມ test ໃໝ່
- `CHANGELOG.md` — ໄຟລ໌ໃໝ່
- `SKILL.md`, `README.md` — ອັບເດດເອກະສານ

## ຄວາມສ່ຽງ / ຄຳຖາມທີ່ຍັງເປີດ (Risks / Open Questions)

- `getImageUrl()` ອີງໃສ່ undocumented endpoint (`lh3.googleusercontent.com`) — ຄວາມສ່ຽງຖືກບັນທຶກໄວ້ໃນ
  ADR-0003 ແລ້ວ, ຍອມຮັບ trade-off ນີ້ໂດຍເຈດຕະນາ.
- Version 3 ໃນ `clasp versions` ບໍ່ມີ description ("No description") — ບໍ່ຮູ້ແນ່ນອນວ່າມີ feature ຫຍັງຕ່າງ
  ຈາກ v2, `CHANGELOG.md` ຍ້ອນຫຼັງອາດຕ້ອງຂຽນແບບຄາດເດົາ/ຫຍໍ້ ("no notable changes documented") ສໍາລັບ v3.
- `getImageUrl()` ຄືນ string ໂດຍກົງ (ບໍ່ແມ່ນ `{success,data}`) ຕ່າງຈາກ method ອື່ນທັງໝົດຂອງ `DriveFolder` —
  ນີ້ແມ່ນຄວາມບໍ່ສອດຄ່ອງກັບ uniform response contract ຂອງ library (ເບິ່ງ `CLAUDE.md`), ຄວນຢືນຢັນວ່າ
  ຍອມຮັບໄດ້ ຫຼືຄວນ wrap ເປັນ `{success,data}` ຄືກັນໝົດ ກ່ອນ implement ແທ້.
