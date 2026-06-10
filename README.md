# SheetORM

Google Apps Script library ສໍາລັບຈັດການ Google Sheets ຄືກັບ ORM.

---

## ສາລະບານ

- [Getting Started](#getting-started)
- [Connection](#connection)
- [Schema & Validation](#schema--validation)
- [CRUD](#crud)
- [Query Builder](#query-builder)
- [Batch Operations](#batch-operations)
- [Migration](#migration)
- [Seeder](#seeder)
- [Error Types](#error-types)
- [Response Format](#response-format)
- [File Structure](#file-structure)

---

## Getting Started

### 1. Copy ໄຟລ໌ໃສ່ Apps Script Editor

ເປີດ [script.google.com](https://script.google.com) → ສ້າງ Project ໃໝ່ → copy ໄຟລ໌ `src/` ທຸກໄຟລ໌ໃສ່.

**ລໍາດັບໄຟລ໌ທີ່ຕ້ອງ load (ສໍາຄັນ):**

```
Errors.gs
Utils.gs
Validator.gs
Connection.gs
Table.gs
Query.gs
Migrator.gs
Seeder.gs
SheetORM.gs
```

> Apps Script load ໄຟລ໌ຕາມ alphabetical order. ຖ້າຊື່ໄຟລ໌ຜິດລໍາດັບ ໃຫ້ rename ໃສ່ prefix ເຊັ່ນ `01_Errors.gs`, `02_Utils.gs`, `03_Validator.gs` ໄປເລື້ອຍໆ.

### 2. ກຽມ Spreadsheet

ສ້າງ Google Spreadsheet ໃໝ່ → ສ້າງ sheet tab ທີ່ຕ້ອງການ → ໃສ່ header row ແຖວທໍາອິດ.

ຕົວຢ່າງ header ສໍາລັບ `users`:

| id | name | role | email | createdAt | updatedAt |
|----|------|------|-------|-----------|-----------|

> ຄ່ອງ `id`, `createdAt`, `updatedAt` ຈະ **auto-fill** ເອງຕອນ `insert`.

---

## Connection

```javascript
const db    = SheetORM.connect("SPREADSHEET_ID");
const users = db.table("users");  // ຊື່ sheet tab
```

---

## Schema & Validation

ກໍານົດ schema ຫຼັງ `table()` ດ້ວຍ `.schema({})` — chainable.  
`insert` ແລະ `update` ຈະ validate ອັດຕະໂນມັດ. `findAll` / `findById` ຈະ cast types ຕາມ schema.

```javascript
const users = db.table("users").schema({
  id:        { type: "string" },
  name:      { type: "string", required: true, minLength: 2, maxLength: 100 },
  role:      { type: "string", required: true, enum: ["admin", "user", "guest"] },
  email:     { type: "string", required: true },
  age:       { type: "number", min: 0, max: 150 },
  active:    { type: "boolean", default: true },
  createdAt: { type: "string" },
  updatedAt: { type: "string" }
});
```

### Validation Rules

| Rule | Types | ຄວາມໝາຍ |
|------|-------|---------|
| `type` | ທຸກ | `"string"` / `"number"` / `"boolean"` — cast ຄ່າໃຫ້ຖືກ type |
| `required` | ທຸກ | field ຕ້ອງບໍ່ຫວ່າງ |
| `default` | ທຸກ | ຄ່າ default ຖ້າ field ຫວ່າງ |
| `min` / `max` | number | ໄລຍະຄ່າຕໍ່າສຸດ / ສູງສຸດ |
| `minLength` / `maxLength` | string | ຄວາມຍາວ string |
| `enum` | string | ລາຍການຄ່າທີ່ຍອມຮັບໄດ້ |

### ຕົວຢ່າງ validation error

```javascript
users.insert({ name: "K", role: "superadmin" });
// → {
//     success: false,
//     type:   "ValidationError",
//     error:  "Validation failed",
//     errors: [
//       { field: "name",  error: "name must be at least 2 characters" },
//       { field: "role",  error: "role must be one of: admin, user, guest" },
//       { field: "email", error: "email is required" }
//     ]
//   }
```

---

## CRUD

### insert

```javascript
users.insert({ name: "Kitti", role: "admin", email: "kitti@example.com" });
// → { success: true, data: { id: "uuid", name: "Kitti", ..., createdAt: "...", updatedAt: "..." } }
```

### findAll

```javascript
users.findAll();
// → { success: true, data: [ {...}, {...} ] }
```

### findById

```javascript
users.findById("some-uuid");
// → { success: true,  data: { id: "some-uuid", ... } }
// → { success: false, type: "NotFoundError", error: "Not found" }
```

### find — exact match (AND logic)

```javascript
users.find({ role: "admin" });
// → { success: true, data: [ {...} ] }
```

### update

```javascript
users.update("some-uuid", { role: "user" });
// → { success: true, data: { id: "some-uuid", role: "user", updatedAt: "..." } }
```

### delete

```javascript
users.delete("some-uuid");
// → { success: true, data: { id: "some-uuid" } }
```

---

## Query Builder

ໃຊ້ `where()` ເປັນ entry point, chain methods ໄດ້ທຸກ order ກ່ອນຮັນ `get()`.

```javascript
users
  .where("role", "=", "admin")
  .where("name", "contains", "kit")
  .orderBy("name", "ASC")
  .limit(10)
  .offset(0)
  .select(["id", "name", "role"])
  .get();
// → { success: true, data: [ {...} ] }
```

### Operators

| Operator | ຄວາມໝາຍ |
|----------|---------|
| `=` | ເທົ່າກັນ |
| `!=` | ບໍ່ເທົ່າກັນ |
| `>` | ໃຫຍ່ກວ່າ |
| `<` | ນ້ອຍກວ່າ |
| `>=` | ໃຫຍ່ກວ່າ ຫຼື ເທົ່າ |
| `<=` | ນ້ອຍກວ່າ ຫຼື ເທົ່າ |
| `contains` | ມີ substring ນີ້ຢູ່ |
| `startsWith` | ເລີ່ມດ້ວຍ |
| `endsWith` | ລົງທ້າຍດ້ວຍ |

### updateMany — ແກ້ໄຂທຸກ row ທີ່ຕົງເງື່ອນໄຂ

```javascript
users.where("role", "=", "guest").updateMany({ role: "user" });
// → { success: true, data: [ {...}, {...} ] }
```

### deleteMany — ລຶບທຸກ row ທີ່ຕົງເງື່ອນໄຂ

```javascript
users.where("active", "=", "false").deleteMany();
// → { success: true, data: { deleted: 3 } }
```

---

## Batch Operations

### insertMany

```javascript
users.insertMany([
  { name: "Som", role: "user", email: "som@example.com" },
  { name: "Keo", role: "user", email: "keo@example.com" },
  { name: "Noi", role: "user", email: "noi@example.com" }
]);
// → { success: true, data: [ {...}, {...}, {...} ] }
```

---

## Migration

ໃຊ້ສໍາລັບຈັດການໂຄງສ້າງ Sheet (ສ້າງ, ລຶບ, ເພີ່ມ/ລຶບ/ປ່ຽນຊື່ column).  
Versions ທີ່ run ແລ້ວຈະຖືກບັນທຶກໃນ sheet `_migrations` ອັດຕະໂນມັດ.

### ກໍານົດ migrations

```javascript
var migrations = [
  {
    version: "001",
    name: "create_users",
    up: function(db) {
      db.createTable("users", ["id", "name", "role", "email", "createdAt", "updatedAt"]);
    },
    down: function(db) {
      db.dropTable("users");
    }
  },
  {
    version: "002",
    name: "add_phone_to_users",
    up: function(db) {
      db.addColumn("users", "phone");
    },
    down: function(db) {
      db.removeColumn("users", "phone");
    }
  },
  {
    version: "003",
    name: "rename_name_to_fullname",
    up: function(db) {
      db.renameColumn("users", "name", "fullName");
    },
    down: function(db) {
      db.renameColumn("users", "fullName", "name");
    }
  }
];
```

### migrate — ຮັນ migrations ທີ່ຍັງ pending

```javascript
SheetORM.migrate(SPREADSHEET_ID, migrations);
// → { success: true, data: { ran: 3, migrations: ["001_create_users", ...] } }
```

### rollback — undo migration ສຸດທ້າຍ

```javascript
SheetORM.rollback(SPREADSHEET_ID, migrations);
// → { success: true, data: { rolledBack: "003_rename_name_to_fullname" } }
```

### migrationStatus — ເບິ່ງສະຖານະ

```javascript
SheetORM.migrationStatus(SPREADSHEET_ID, migrations);
// → {
//     success: true,
//     data: [
//       { version: "001", name: "create_users",            status: "applied" },
//       { version: "002", name: "add_phone_to_users",      status: "applied" },
//       { version: "003", name: "rename_name_to_fullname", status: "pending" }
//     ]
//   }
```

### Schema methods (ໃຊ້ໃນ up / down)

| Method | ໃຊ້ທໍາຫຍັງ |
|--------|-----------|
| `db.createTable(name, headers[])` | ສ້າງ sheet ໃໝ່ |
| `db.dropTable(name)` | ລຶບ sheet |
| `db.addColumn(table, column)` | ເພີ່ມ column ສຸດທ້າຍ |
| `db.removeColumn(table, column)` | ລຶບ column (ຂໍ້ມູນຫາຍ) |
| `db.renameColumn(table, old, new)` | ປ່ຽນຊື່ column |

---

## Seeder

ໃຊ້ສໍາລັບໃສ່ຂໍ້ມູນເລີ່ມຕົ້ນ (initial data) ຫຼື ຂໍ້ມູນທົດສອບ.

### ກໍານົດ seeds

```javascript
var seeds = {
  users: [
    { name: "Admin", role: "admin", email: "admin@example.com" },
    { name: "Kitti", role: "user",  email: "kitti@example.com" }
  ],
  roles: [
    { name: "admin", label: "Administrator" },
    { name: "user",  label: "User" }
  ]
};
```

### seed — insert ສະເພາະ sheet ທີ່ຍັງຫວ່າງ

```javascript
SheetORM.seed(SPREADSHEET_ID, seeds);
// ຖ້າ sheet ມີຂໍ້ມູນຢູ່ແລ້ວ ຈະ skip
// → { success: true, data: { users: { success: true, data: [...] }, roles: {...} } }
```

### freshSeed — ລ້າງຂໍ້ມູນເກົ່າ ແລ້ວ insert ໃໝ່

```javascript
SheetORM.freshSeed(SPREADSHEET_ID, seeds);
// ລ້າງທຸກ data rows (ເກັບ header) ແລ້ວ insert ໃໝ່ທຸກຄັ້ງ
```

---

## Error Types

ທຸກ error response ມີ field `type` ບອກ category:

| type | ສາເຫດ |
|------|-------|
| `ValidationError` | ຂໍ້ມູນບໍ່ຜ່ານ schema — ມີ `errors[]` field-level |
| `NotFoundError` | ຫາ record ດ້ວຍ id ທີ່ລະບຸ ບໍ່ພົບ |
| `ConnectionError` | ເປີດ Spreadsheet ບໍ່ໄດ້ (id ຜິດ ຫຼື ບໍ່ມີ permission) |
| `Error` | ຂໍ້ຜິດພາດທົ່ວໄປ |

```javascript
{ success: false, type: "NotFoundError",   error: "Not found" }
{ success: false, type: "ConnectionError", error: "Cannot open spreadsheet: ..." }
{ success: false, type: "ValidationError", error: "Validation failed", errors: [
    { field: "name", error: "name is required" }
  ]
}
```

---

## Response Format

ທຸກ method return format ດຽວກັນ:

```javascript
// ສໍາເລັດ
{ success: true, data: <object | array> }

// ຜິດພາດ
{ success: false, type: "<ErrorType>", error: "<message>", errors?: [...] }
```

---

## File Structure

```
src/
├── Errors.gs      custom error types (SheetORMError, NotFoundError, ValidationError, ConnectionError)
├── Utils.gs       helper functions (generateId, rowToObject, objectToRow, nowIso)
├── Validator.gs   schema validation + type casting
├── Connection.gs  connect to spreadsheet, select table
├── Table.gs       CRUD + schema() + where() + insertMany()
├── Query.gs       query builder (where/orderBy/limit/offset/select/get/updateMany/deleteMany)
├── Migrator.gs    schema management + version tracking
├── Seeder.gs      seed / freshSeed
└── SheetORM.gs    main entry point
```

> **ລໍາດັບ load:** `Errors` → `Utils` → `Validator` → `Connection` → `Table` → `Query` → `Migrator` → `Seeder` → `SheetORM`
