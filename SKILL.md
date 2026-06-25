# SKILL: SheetORM

- **Repository:** https://github.com/Kittisayst/SheetORM
- **Platform:** Google Apps Script Library
- **Docs:** See `README.md` for full reference, `SKILL.md` for quick reference

## Overview
SheetORM is a Google Apps Script library that wraps Google Sheets as a database with ORM-style API.
- Each **Sheet tab** = a table
- **Row 1** = column headers (field names)
- Fields `id`, `createdAt`, `updatedAt` are auto-managed

---

## Setup in Consumer Project

### 1. ຕັ້ງຄ່າ `appsscript.json`

ໃນ project ທີ່ຢາກໃຊ້ SheetORM ໃຫ້ເພີ່ມ library entry ເຂົ້າໃນ `appsscript.json`:

```json
{
  "timeZone": "Asia/Vientiane",
  "dependencies": {
    "libraries": [
      {
        "userSymbol": "SheetORM",
        "libraryId": "SHEETORM_SCRIPT_ID",
        "version": "2",
        "developmentMode": false
      }
    ]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

> - `userSymbol` ຕ້ອງເປັນ `"SheetORM"` — ຈຶ່ງໃຊ້ `SheetORM.connect()` ໄດ້
> - `libraryId` = Script ID ຂອງ SheetORM project (ຫາໄດ້ຈາກ Project Settings ⚙️)
> - `developmentMode: true` = ໃຊ້ HEAD version (ສຳລັບ dev), `false` = ໃຊ້ version ທີ່ລະບຸ

### 2. ຕັ້ງຄ່າ `.clasp.json` ສຳລັບ push code

ສ້າງ `.clasp.json` ທີ່ root ຂອງ consumer project:

```json
{
  "scriptId": "YOUR_PROJECT_SCRIPT_ID",
  "rootDir": "src"
}
```

> - `scriptId` = Script ID ຂອງ **project ຕົນເອງ** (ບໍ່ແມ່ນ SheetORM)
> - `rootDir` = folder ທີ່ມີ `.gs` files ແລະ `appsscript.json`
> - ຮັນ `clasp push` ຈາກ root ໄດ້ເລີຍ — clasp ຈະ push ສະເພາະໄຟລ໌ໃນ `rootDir`

```bash
clasp push         # push ໄຟລ໌ທັງໝົດ
clasp push --force # force push (ຖ້າ skip)
clasp pull         # pull ໄຟລ໌ຈາກ Apps Script ລົງ local
```

### 3. ໃຊ້ SheetORM ໂດຍກົງ — ບໍ່ຕ້ອງ copy code

```javascript
// ✅ ໃຊ້ SheetORM ຜ່ານ library identifier ໄດ້ເລີຍ
const db    = SheetORM.connect("SPREADSHEET_ID");
const users = db.table("users");

// ❌ ບໍ່ຕ້ອງ copy/paste code ຈາກ SheetORM repo
// ❌ ບໍ່ຕ້ອງ import Table.gs, Query.gs ໃສ່ project ຕົນເອງ
```

### ໂຄງສ້າງ project ທີ່ໃຊ້ SheetORM

```
my-backend/
├── .clasp.json          ← scriptId ຂອງ project ຕົນເອງ, rootDir: "src"
└── src/
    ├── appsscript.json  ← ມີ SheetORM ໃນ dependencies.libraries
    ├── Code.gs          ← doGet / doPost handler
    ├── Users.gs         ← user-specific logic
    └── ...
```

---

## Usage

```javascript
// ໃຊ້ SheetORM ໃນ src/Code.gs ຫຼື src/*.gs ໃດກໍໄດ້
const db    = SheetORM.connect("SPREADSHEET_ID");
const users = db.table("users");           // basic
const users = db.table("users").schema({}); // with validation
```

---

## CRUD Methods

### insert(data) → `{ success, data }`
```javascript
users.insert({ name: "Kitti", role: "admin", email: "kitti@example.com" });
// auto-fills: id (UUID), createdAt, updatedAt
```

### findAll() → `{ success, data: [] }`
```javascript
users.findAll();
```

### findById(id) → `{ success, data }` or `{ success:false, type:"NotFoundError" }`
```javascript
users.findById("uuid-string");
```

### find(query) → `{ success, data: [] }` — exact match AND logic
```javascript
users.find({ role: "admin" });
users.find({ role: "admin", active: "true" });
```

### update(id, data) → `{ success, data }` — auto-updates updatedAt, cannot change id
```javascript
users.update("uuid", { role: "user" });
```

### delete(id) → `{ success, data: { id } }`
```javascript
users.delete("uuid");
```

### insertMany(rows[]) → `{ success, data: [] }` — batch insert (fast)
```javascript
users.insertMany([
  { name: "Som", role: "user", email: "som@example.com" },
  { name: "Keo", role: "user", email: "keo@example.com" }
]);
```

---

## Query Builder

Chain from `where()`, end with `get()` / `updateMany()` / `deleteMany()`.

```javascript
users
  .where("role",  "=",        "admin")  // add condition
  .where("name",  "contains", "kit")    // AND condition
  .orderBy("name", "ASC")               // sort: ASC | DESC
  .limit(10)                            // max rows
  .offset(0)                            // skip rows (pagination)
  .select(["id", "name", "role"])       // pick columns
  .get();                               // execute → { success, data:[] }

// update all matched
users.where("role", "=", "guest").updateMany({ role: "user" });
// → { success, data: [ updated rows ] }

// delete all matched
users.where("active", "=", "false").deleteMany();
// → { success, data: { deleted: N } }
```

### Operators
| Operator | Description |
|----------|-------------|
| `=` | equals |
| `!=` | not equals |
| `>` `<` `>=` `<=` | numeric comparison |
| `contains` | substring match |
| `startsWith` | prefix match |
| `endsWith` | suffix match |

---

## Schema & Validation

Define after `table()`. Validates on `insert`/`update`. Casts types on read.

```javascript
const users = db.table("users").schema({
  id:        { type: "string" },
  name:      { type: "string",  required: true, minLength: 2, maxLength: 100 },
  role:      { type: "string",  required: true, enum: ["admin", "user", "guest"] },
  email:     { type: "string",  required: true },
  age:       { type: "number",  min: 0, max: 150 },
  active:    { type: "boolean", default: true },
  createdAt: { type: "string" },
  updatedAt: { type: "string" }
});
```

### Rules Reference
| Rule | Type | Description |
|------|------|-------------|
| `type` | all | `"string"` / `"number"` / `"boolean"` — auto-cast on read |
| `required` | all | must not be empty |
| `default` | all | value applied when field is empty |
| `enum` | string | allowed values list |
| `minLength` / `maxLength` | string | length range |
| `min` / `max` | number | value range |

---

## Migration

Tracks applied versions in `_migrations` sheet (auto-created).

```javascript
var migrations = [
  {
    version: "001",
    name:    "create_users",
    up:   function(db) { db.createTable("users", ["id","name","role","createdAt","updatedAt"]); },
    down: function(db) { db.dropTable("users"); }
  },
  {
    version: "002",
    name:    "add_email_to_users",
    up:   function(db) { db.addColumn("users", "email"); },
    down: function(db) { db.removeColumn("users", "email"); }
  }
];

SheetORM.migrate(SPREADSHEET_ID, migrations);
// → { success, data: { ran: N, migrations: ["001_create_users", ...] } }

SheetORM.rollback(SPREADSHEET_ID, migrations);
// → { success, data: { rolledBack: "002_add_email_to_users" } }

SheetORM.migrationStatus(SPREADSHEET_ID, migrations);
// → { success, data: [{ version, name, status: "applied"|"pending" }] }
```

### Schema Operations (inside up/down)
| Method | Description |
|--------|-------------|
| `db.createTable(name, headers[])` | create new sheet with headers |
| `db.dropTable(name)` | delete sheet |
| `db.addColumn(table, column)` | append column to end |
| `db.removeColumn(table, column)` | delete column (data lost) |
| `db.renameColumn(table, old, new)` | rename column header |

---

## Seeder

```javascript
var seeds = {
  users: [
    { name: "Admin", role: "admin", email: "admin@example.com" },
    { name: "User",  role: "user",  email: "user@example.com"  }
  ]
};

SheetORM.seed(SPREADSHEET_ID, seeds);
// skips tables that already have data
// → { success, data: { users: { success, data:[...] } | { success, data:{ skipped:true } } } }

SheetORM.freshSeed(SPREADSHEET_ID, seeds);
// clears data rows (keeps header) then inserts
```

---

## Response Format

Every method returns the same shape:

```javascript
// success
{ success: true,  data: <object | array> }

// error
{ success: false, type: "NotFoundError",   error: "Not found" }
{ success: false, type: "ValidationError", error: "Validation failed",
  errors: [{ field: "name", error: "name is required" }] }
{ success: false, type: "ConnectionError", error: "Cannot open spreadsheet: ..." }
{ success: false, type: "Error",           error: "..." }
```

---

## Error Types
| type | trigger |
|------|---------|
| `NotFoundError` | `findById`, `update`, `delete` with unknown id |
| `ValidationError` | `insert` / `update` fails schema rules |
| `ConnectionError` | wrong Spreadsheet ID or no access |
| `Error` | unexpected runtime error |

---

## Common Patterns

### Pagination
```javascript
function getPage(page, perPage) {
  return users.where("active", "=", "true")
              .orderBy("createdAt", "DESC")
              .limit(perPage)
              .offset((page - 1) * perPage)
              .get();
}
```

### Upsert pattern
```javascript
function upsert(email, data) {
  var found = users.find({ email: email });
  if (found.data.length > 0) {
    return users.update(found.data[0].id, data);
  }
  return users.insert(Object.assign({ email: email }, data));
}
```

### Safe delete with check
```javascript
function safeDelete(id) {
  var check = users.findById(id);
  if (!check.success) return check;  // NotFoundError
  return users.delete(id);
}
```

---

## File Load Order (Apps Script)
```
Errors.gs → Utils.gs → Validator.gs → Connection.gs →
Table.gs → Query.gs → Migrator.gs → Seeder.gs → SheetORM.gs
```
Rename with `01_`, `02_`... prefix if alphabetical order is wrong.
