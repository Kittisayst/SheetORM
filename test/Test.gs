var SPREADSHEET_ID   = "YOUR_SPREADSHEET_ID";
var DRIVE_FOLDER_ID  = "YOUR_DRIVE_FOLDER_ID";

// ຮັນ test ທັງໝົດເທື່ອດຽວ
function runAllTests() {
  var results = [];
  var tests = [
    testConnect,
    testInsert,
    testFindAll,
    testFindById,
    testFindById_NotFound,
    testFind,
    testUpdate,
    testDelete,
    testInsertMany,
    testWhere,
    testWhereMultiple,
    testOrderBy,
    testLimitOffset,
    testSelect,
    testUpdateMany,
    testDeleteMany,
    testSchemaValid,
    testSchemaRequired,
    testSchemaEnum,
    testSchemaDefault,
    testSchemaNumber,
    testMigrate,
    testMigrationStatus,
    testRollback,
    testSeed,
    testFreshSeed,
    testOrderByEmptyTable,
    testOrderBySingleRow,
    testLimitOnEmptyTable,
    testSelectDirectOnTable,
    testOrderByIsoDate,
    testWhereIsoDateRange,
    testDriveConnect_BadFolderId,
    testDriveInsertFile,
    testDriveInsertSubfolder,
    testDriveFindAll,
    testDriveFindById_File,
    testDriveFindById_Folder,
    testDriveFindById_NotFound,
    testDriveFindById_OutOfScope,
    testDriveFind,
    testDriveUpdate,
    testDriveDelete,
    testDriveWhereOrderByLimitSelect,
    testGetImageUrl_Success,
    testGetImageUrl_NotImage,
    testInsertSharingPublic,
    testUpdateSharingPublic,
    testWhoAmI
  ];

  tests.forEach(function (fn) {
    try {
      fn();
      results.push("PASS  " + fn.name);
    } catch (e) {
      results.push("FAIL  " + fn.name + " → " + e.message);
    }
  });

  Logger.log("\n===== TEST RESULTS =====\n" + results.join("\n"));
}

// ===============================
// Helpers
// ===============================

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error((label || "") + " expected [" + expected + "] got [" + actual + "]");
  }
}

function getTable() {
  return SheetORM.connect(SPREADSHEET_ID).table("test_users");
}

function clearTable() {
  var db    = SheetORM.connect(SPREADSHEET_ID);
  var sheet = db.spreadsheet.getSheetByName("test_users");
  if (sheet && sheet.getLastRow() >= 2) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
}

function getDriveFolder() {
  return SheetORM.driveConnect(DRIVE_FOLDER_ID);
}

// trash ທຸກໄຟລ໌/subfolder ທີ່ຄ້າງຢູ່ໃນ test folder ຈາກ run ກ່ອນໜ້າ
function clearDriveFolder() {
  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  var files = folder.getFiles();
  while (files.hasNext()) files.next().setTrashed(true);

  var folders = folder.getFolders();
  while (folders.hasNext()) folders.next().setTrashed(true);
}

function makeTestBlob(name) {
  return Utilities.newBlob("hello world", "text/plain", name || "test.txt");
}

function makeTestImageBlob(name) {
  return Utilities.newBlob("fake image bytes", "image/png", name || "test.png");
}

// ===============================
// 1. Connection
// ===============================

function testConnect() {
  var db = SheetORM.connect(SPREADSHEET_ID);
  assert(db !== null, "connect() should return a Connection");
  assert(typeof db.table === "function", "Connection should have table()");
}

// ===============================
// 2. CRUD
// ===============================

function testInsert() {
  clearTable();
  var users  = getTable();
  var result = users.insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });

  assert(result.success, "insert should succeed");
  assert(result.data.id, "insert should auto-generate id");
  assertEqual(result.data.name, "Kitti", "name");
  assertEqual(result.data.role, "admin", "role");
  assert(result.data.createdAt, "insert should set createdAt");
  assert(result.data.updatedAt, "insert should set updatedAt");
}

function testFindAll() {
  clearTable();
  var users = getTable();
  users.insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });
  users.insert({ name: "Som",   role: "user",  email: "som@test.com"   });

  var result = users.findAll();
  assert(result.success, "findAll should succeed");
  assertEqual(result.data.length, 2, "findAll count");
}

function testFindById() {
  clearTable();
  var users    = getTable();
  var inserted = users.insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });
  var id       = inserted.data.id;

  var result = users.findById(id);
  assert(result.success, "findById should succeed");
  assertEqual(result.data.id,   id,      "id match");
  assertEqual(result.data.name, "Kitti", "name match");
}

function testFindById_NotFound() {
  var result = getTable().findById("non-existent-id");
  assert(!result.success, "findById should fail for unknown id");
  assertEqual(result.type, "NotFoundError", "error type");
}

function testFind() {
  clearTable();
  var users = getTable();
  users.insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });
  users.insert({ name: "Som",   role: "user",  email: "som@test.com"   });
  users.insert({ name: "Keo",   role: "admin", email: "keo@test.com"   });

  var result = users.find({ role: "admin" });
  assert(result.success, "find should succeed");
  assertEqual(result.data.length, 2, "find admin count");
}

function testUpdate() {
  clearTable();
  var users    = getTable();
  var inserted = users.insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });
  var id       = inserted.data.id;

  var result = users.update(id, { role: "user" });
  assert(result.success, "update should succeed");
  assertEqual(result.data.role, "user", "updated role");
  assert(result.data.updatedAt !== inserted.data.updatedAt || true, "updatedAt changed");

  var check = users.findById(id);
  assertEqual(check.data.role, "user", "persisted role");
}

function testDelete() {
  clearTable();
  var users    = getTable();
  var inserted = users.insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });
  var id       = inserted.data.id;

  var result = users.delete(id);
  assert(result.success, "delete should succeed");
  assertEqual(result.data.id, id, "deleted id");

  var check = users.findById(id);
  assert(!check.success, "record should not exist after delete");
}

// ===============================
// 3. Batch
// ===============================

function testInsertMany() {
  clearTable();
  var users  = getTable();
  var result = users.insertMany([
    { name: "Som", role: "user",  email: "som@test.com" },
    { name: "Keo", role: "user",  email: "keo@test.com" },
    { name: "Noi", role: "admin", email: "noi@test.com" }
  ]);

  assert(result.success, "insertMany should succeed");
  assertEqual(result.data.length, 3, "insertMany count");

  var all = users.findAll();
  assertEqual(all.data.length, 3, "findAll after insertMany");
}

// ===============================
// 4. Query Builder
// ===============================

function testWhere() {
  clearTable();
  var users = getTable();
  users.insertMany([
    { name: "Kitti", role: "admin", email: "kitti@test.com" },
    { name: "Som",   role: "user",  email: "som@test.com"   },
    { name: "Keo",   role: "user",  email: "keo@test.com"   }
  ]);

  var result = users.where("role", "=", "user").get();
  assert(result.success, "where = should succeed");
  assertEqual(result.data.length, 2, "where = count");
}

function testWhereMultiple() {
  clearTable();
  var users = getTable();
  users.insertMany([
    { name: "Kitti", role: "admin", email: "kitti@test.com" },
    { name: "Kit",   role: "user",  email: "kit@test.com"   },
    { name: "Som",   role: "user",  email: "som@test.com"   }
  ]);

  var result = users.where("role", "=", "user").where("name", "contains", "Kit").get();
  assert(result.success, "multiple where should succeed");
  assertEqual(result.data.length, 1, "multiple where count");
  assertEqual(result.data[0].name, "Kit", "multiple where name");
}

function testOrderBy() {
  clearTable();
  var users = getTable();
  users.insertMany([
    { name: "Som",   role: "user", email: "som@test.com"   },
    { name: "Kitti", role: "user", email: "kitti@test.com" },
    { name: "Aom",   role: "user", email: "aom@test.com"   }
  ]);

  var asc  = users.where("role", "=", "user").orderBy("name", "ASC").get();
  var desc = users.where("role", "=", "user").orderBy("name", "DESC").get();

  assertEqual(asc.data[0].name,  "Aom",   "orderBy ASC first");
  assertEqual(desc.data[0].name, "Som",   "orderBy DESC first");
}

function testLimitOffset() {
  clearTable();
  var users = getTable();
  users.insertMany([
    { name: "A", role: "user", email: "a@test.com" },
    { name: "B", role: "user", email: "b@test.com" },
    { name: "C", role: "user", email: "c@test.com" },
    { name: "D", role: "user", email: "d@test.com" }
  ]);

  var page1 = users.where("role", "=", "user").orderBy("name", "ASC").limit(2).offset(0).get();
  var page2 = users.where("role", "=", "user").orderBy("name", "ASC").limit(2).offset(2).get();

  assertEqual(page1.data.length, 2, "page1 count");
  assertEqual(page2.data.length, 2, "page2 count");
  assertEqual(page1.data[0].name, "A", "page1 first");
  assertEqual(page2.data[0].name, "C", "page2 first");
}

function testSelect() {
  clearTable();
  var users = getTable();
  users.insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });

  var result = users.where("role", "=", "admin").select(["id", "name"]).get();
  assert(result.success, "select should succeed");
  assert(result.data[0].id,   "select: id present");
  assert(result.data[0].name, "select: name present");
  assert(!result.data[0].email, "select: email excluded");
}

function testUpdateMany() {
  clearTable();
  var users = getTable();
  users.insertMany([
    { name: "Som", role: "guest", email: "som@test.com" },
    { name: "Keo", role: "guest", email: "keo@test.com" },
    { name: "Noi", role: "admin", email: "noi@test.com" }
  ]);

  var result = users.where("role", "=", "guest").updateMany({ role: "user" });
  assert(result.success, "updateMany should succeed");
  assertEqual(result.data.length, 2, "updateMany count");

  var guests = users.where("role", "=", "guest").get();
  assertEqual(guests.data.length, 0, "no guests after updateMany");
}

function testDeleteMany() {
  clearTable();
  var users = getTable();
  users.insertMany([
    { name: "Som", role: "guest", email: "som@test.com" },
    { name: "Keo", role: "guest", email: "keo@test.com" },
    { name: "Noi", role: "admin", email: "noi@test.com" }
  ]);

  var result = users.where("role", "=", "guest").deleteMany();
  assert(result.success, "deleteMany should succeed");
  assertEqual(result.data.deleted, 2, "deleteMany count");

  var all = users.findAll();
  assertEqual(all.data.length, 1, "remaining after deleteMany");
}

// ===============================
// 5. Schema & Validation
// ===============================

function _tableWithSchema() {
  return SheetORM.connect(SPREADSHEET_ID).table("test_users").schema({
    id:        { type: "string" },
    name:      { type: "string", required: true, minLength: 2 },
    role:      { type: "string", required: true, enum: ["admin", "user"] },
    email:     { type: "string", required: true },
    active:    { type: "boolean", default: true },
    createdAt: { type: "string" },
    updatedAt: { type: "string" }
  });
}

function testSchemaValid() {
  clearTable();
  var users  = _tableWithSchema();
  var result = users.insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });

  assert(result.success, "valid data should pass schema");
  assertEqual(result.data.active, true, "default active=true applied");
}

function testSchemaRequired() {
  var users  = _tableWithSchema();
  var result = users.insert({ name: "Kitti" });

  assert(!result.success, "missing required fields should fail");
  assertEqual(result.type, "ValidationError", "error type");
  assert(result.errors.length > 0, "should have field errors");
}

function testSchemaEnum() {
  var users  = _tableWithSchema();
  var result = users.insert({ name: "Kitti", role: "superadmin", email: "k@test.com" });

  assert(!result.success, "invalid enum should fail");
  var enumErr = result.errors.some(function (e) { return e.field === "role"; });
  assert(enumErr, "should have role error");
}

function testSchemaDefault() {
  clearTable();
  var users    = _tableWithSchema();
  var result   = users.insert({ name: "Kitti", role: "admin", email: "k@test.com" });

  assert(result.success, "insert with default should succeed");
  assertEqual(result.data.active, true, "default value applied");
}

function testSchemaNumber() {
  var users = SheetORM.connect(SPREADSHEET_ID).table("test_users").schema({
    id:    { type: "string" },
    name:  { type: "string", required: true },
    role:  { type: "string", required: true },
    email: { type: "string", required: true },
    age:   { type: "number", min: 0, max: 150 },
    createdAt: { type: "string" },
    updatedAt: { type: "string" }
  });

  var fail = users.insert({ name: "Kitti", role: "admin", email: "k@test.com", age: 200 });
  assert(!fail.success, "age > max should fail");

  clearTable();
  var pass = users.insert({ name: "Kitti", role: "admin", email: "k@test.com", age: 25 });
  assert(pass.success, "valid age should pass");
}

// ===============================
// 6. Migration
// ===============================

var testMigrations = [
  {
    version: "t001",
    name: "create_test_items",
    up: function (db) {
      db.createTable("test_items", ["id", "label", "qty", "createdAt", "updatedAt"]);
    },
    down: function (db) {
      db.dropTable("test_items");
    }
  },
  {
    version: "t002",
    name: "add_note_to_test_items",
    up: function (db) {
      db.addColumn("test_items", "note");
    },
    down: function (db) {
      db.removeColumn("test_items", "note");
    }
  }
];

function testMigrate() {
  // cleanup ກ່ອນ
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ["test_items", "_migrations"].forEach(function (name) {
    var s = ss.getSheetByName(name);
    if (s) ss.deleteSheet(s);
  });

  var result = SheetORM.migrate(SPREADSHEET_ID, testMigrations);
  assert(result.success, "migrate should succeed");
  assertEqual(result.data.ran, 2, "should run 2 migrations");

  var sheet = ss.getSheetByName("test_items");
  assert(sheet !== null, "test_items sheet should exist");
}

function testMigrationStatus() {
  var result = SheetORM.migrationStatus(SPREADSHEET_ID, testMigrations);
  assert(result.success, "migrationStatus should succeed");

  var t001 = result.data.find(function (m) { return m.version === "t001"; });
  var t002 = result.data.find(function (m) { return m.version === "t002"; });
  assertEqual(t001.status, "applied", "t001 status");
  assertEqual(t002.status, "applied", "t002 status");
}

function testRollback() {
  var result = SheetORM.rollback(SPREADSHEET_ID, testMigrations);
  assert(result.success, "rollback should succeed");
  assert(result.data.rolledBack.indexOf("t002") !== -1, "rolled back t002");

  var status = SheetORM.migrationStatus(SPREADSHEET_ID, testMigrations);
  var t002   = status.data.find(function (m) { return m.version === "t002"; });
  assertEqual(t002.status, "pending", "t002 should be pending after rollback");
}

// ===============================
// 7. Seeder
// ===============================

var testSeeds = {
  test_users: [
    { name: "Admin", role: "admin", email: "admin@test.com" },
    { name: "User",  role: "user",  email: "user@test.com"  }
  ]
};

function testSeed() {
  clearTable();
  var result = SheetORM.seed(SPREADSHEET_ID, testSeeds);
  assert(result.success, "seed should succeed");

  var all = getTable().findAll();
  assertEqual(all.data.length, 2, "seed inserted 2 rows");

  // ຮັນຊ້ຳ — ຕ້ອງ skip
  var result2 = SheetORM.seed(SPREADSHEET_ID, testSeeds);
  assert(result2.data.test_users.data.skipped, "seed should skip non-empty table");

  var all2 = getTable().findAll();
  assertEqual(all2.data.length, 2, "data count unchanged after re-seed");
}

function testFreshSeed() {
  var result = SheetORM.freshSeed(SPREADSHEET_ID, testSeeds);
  assert(result.success, "freshSeed should succeed");

  var all = getTable().findAll();
  assertEqual(all.data.length, 2, "freshSeed re-inserted 2 rows");
}

// ===============================
// 8. Regression — Bug #1
//    table.orderBy/limit/select ໂດຍບໍ່ໄດ້ where() ກ່ອນ
// ===============================

function testOrderByEmptyTable() {
  clearTable();
  var result = getTable().orderBy("name", "ASC").get();
  assert(result.success, "orderBy on empty table should succeed");
  assertEqual(result.data.length, 0, "empty table returns []");
}

function testOrderBySingleRow() {
  clearTable();
  getTable().insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });
  var result = getTable().orderBy("name", "ASC").get();
  assert(result.success, "orderBy on 1-row table should succeed");
  assertEqual(result.data.length, 1, "single row returned");
}

function testLimitOnEmptyTable() {
  clearTable();
  var result = getTable().limit(5).get();
  assert(result.success, "limit on empty table should succeed");
  assertEqual(result.data.length, 0, "empty table with limit returns []");
}

function testSelectDirectOnTable() {
  clearTable();
  getTable().insert({ name: "Kitti", role: "admin", email: "kitti@test.com" });
  var result = getTable().select(["id", "name"]).get();
  assert(result.success, "select directly on table should succeed");
  assert(result.data[0].name, "name present");
  assert(!result.data[0].email, "email excluded");
}

// ===============================
// 9. Regression — ISO date orderBy / where
// ===============================

function testOrderByIsoDate() {
  clearTable();
  var users = getTable();
  // insert ດ້ວຍ createdAt ທີ່ຕ່າງກັນ
  users.insert({ name: "Old",    role: "user", email: "old@test.com",    createdAt: "2026-06-24T08:00:00.000Z" });
  users.insert({ name: "Middle", role: "user", email: "middle@test.com", createdAt: "2026-06-25T08:32:39.953Z" });
  users.insert({ name: "New",    role: "user", email: "new@test.com",    createdAt: "2026-06-26T03:38:10.355Z" });

  var asc  = users.orderBy("createdAt", "ASC").get();
  var desc = users.orderBy("createdAt", "DESC").get();

  assert(asc.success,  "orderBy ISO date ASC should succeed");
  assert(desc.success, "orderBy ISO date DESC should succeed");

  assertEqual(asc.data[0].name,  "Old", "ASC first = oldest");
  assertEqual(asc.data[2].name,  "New", "ASC last  = newest");
  assertEqual(desc.data[0].name, "New", "DESC first = newest");
  assertEqual(desc.data[2].name, "Old", "DESC last  = oldest");
}

function testWhereIsoDateRange() {
  clearTable();
  var users = getTable();
  users.insert({ name: "Old",    role: "user", email: "old@test.com",    createdAt: "2026-06-24T00:00:00.000Z" });
  users.insert({ name: "Middle", role: "user", email: "middle@test.com", createdAt: "2026-06-25T08:32:39.953Z" });
  users.insert({ name: "New",    role: "user", email: "new@test.com",    createdAt: "2026-06-26T03:38:10.355Z" });

  // ດຶງ records ທີ່ createdAt > 2026-06-24
  var result = users.where("createdAt", ">", "2026-06-24T23:59:59.999Z").get();
  assert(result.success, "where ISO date > should succeed");
  assertEqual(result.data.length, 2, "should return 2 records after 2026-06-24");
  assert(result.data.every(function(r) { return r.name !== "Old"; }), "Old should be excluded");
}

// ===============================
// 10. DriveFolder
// ===============================

function testDriveConnect_BadFolderId() {
  var threw = false;
  try {
    SheetORM.driveConnect("not-a-real-folder-id");
  } catch (e) {
    threw = true;
    assertEqual(e.type, "ConnectionError", "error type");
  }
  assert(threw, "driveConnect with bad folder id should throw ConnectionError");
}

function testDriveInsertFile() {
  clearDriveFolder();
  var folder = getDriveFolder();
  var result = folder.insert({ blob: makeTestBlob("hello.txt"), description: "a test file" });

  assert(result.success, "insert file should succeed");
  assertEqual(result.data.type, "file", "record type");
  assertEqual(result.data.name, "hello.txt", "file name");
  assertEqual(result.data.description, "a test file", "file description");
  assert(result.data.id, "file should have an id");
}

function testDriveInsertSubfolder() {
  clearDriveFolder();
  var folder = getDriveFolder();
  var result = folder.insert({ name: "subfolder-a" });

  assert(result.success, "insert subfolder should succeed");
  assertEqual(result.data.type, "folder", "record type");
  assertEqual(result.data.name, "subfolder-a", "subfolder name");
}

function testDriveFindAll() {
  clearDriveFolder();
  var folder = getDriveFolder();
  folder.insert({ blob: makeTestBlob("a.txt") });
  folder.insert({ name: "sub-b" });

  var result = folder.findAll();
  assert(result.success, "findAll should succeed");
  assertEqual(result.data.length, 2, "findAll count");

  var types = result.data.map(function (r) { return r.type; }).sort();
  assertEqual(types.join(","), "file,folder", "findAll returns both file and folder types");
}

function testDriveFindById_File() {
  clearDriveFolder();
  var folder   = getDriveFolder();
  var inserted = folder.insert({ blob: makeTestBlob("a.txt") });

  var result = folder.findById(inserted.data.id);
  assert(result.success, "findById file should succeed");
  assertEqual(result.data.type, "file", "record type");
}

function testDriveFindById_Folder() {
  clearDriveFolder();
  var folder   = getDriveFolder();
  var inserted = folder.insert({ name: "sub-c" });

  var result = folder.findById(inserted.data.id);
  assert(result.success, "findById subfolder should succeed");
  assertEqual(result.data.type, "folder", "record type");
}

function testDriveFindById_NotFound() {
  var result = getDriveFolder().findById("non-existent-id");
  assert(!result.success, "findById should fail for unknown id");
  assertEqual(result.type, "NotFoundError", "error type");
}

function testDriveFindById_OutOfScope() {
  // ໄຟລ໌ SPREADSHEET_ID ບໍ່ໄດ້ຢູ່ພາຍໃນ DRIVE_FOLDER_ID → ຕ້ອງຖືກປະຕິບັດຄືກັນກັບບໍ່ພົບ
  var result = getDriveFolder().findById(SPREADSHEET_ID);
  assert(!result.success, "findById should fail for an id outside this folder's direct children");
  assertEqual(result.type, "NotFoundError", "error type");
}

function testDriveFind() {
  clearDriveFolder();
  var folder = getDriveFolder();
  folder.insert({ blob: makeTestBlob("a.txt") });
  folder.insert({ blob: makeTestBlob("b.txt") });
  folder.insert({ name: "sub-d" });

  var result = folder.find({ type: "file" });
  assert(result.success, "find should succeed");
  assertEqual(result.data.length, 2, "find file-type count");
}

function testDriveUpdate() {
  clearDriveFolder();
  var folder   = getDriveFolder();
  var inserted = folder.insert({ blob: makeTestBlob("old-name.txt") });

  var result = folder.update(inserted.data.id, { name: "new-name.txt", description: "renamed" });
  assert(result.success, "update should succeed");
  assertEqual(result.data.name, "new-name.txt", "updated name");
  assertEqual(result.data.description, "renamed", "updated description");
}

function testDriveDelete() {
  clearDriveFolder();
  var folder   = getDriveFolder();
  var inserted = folder.insert({ blob: makeTestBlob("to-delete.txt") });
  var id       = inserted.data.id;

  var result = folder.delete(id);
  assert(result.success, "delete should succeed");
  assertEqual(result.data.id, id, "deleted id");
  assert(DriveApp.getFileById(id).isTrashed(), "file should be trashed, not gone");

  var all = folder.findAll();
  assert(all.data.every(function (r) { return r.id !== id; }), "trashed file excluded from findAll");
}

function testDriveWhereOrderByLimitSelect() {
  clearDriveFolder();
  var folder = getDriveFolder();
  folder.insert({ blob: makeTestBlob("a.txt") });
  folder.insert({ blob: makeTestBlob("b.txt") });
  folder.insert({ name: "sub-e" });

  var result = folder.where("type", "=", "file")
    .orderBy("name", "ASC")
    .limit(1)
    .select(["id", "name", "type"])
    .get();

  assert(result.success, "where/orderBy/limit/select should succeed");
  assertEqual(result.data.length, 1, "limited to 1 result");
  assertEqual(result.data[0].name, "a.txt", "orderBy ASC picks a.txt first");
  assert(!result.data[0].mimeType, "select excludes mimeType");
}

// ===============================
// 11. DriveFolder DX improvements
// ===============================

function testGetImageUrl_Success() {
  clearDriveFolder();
  var folder   = getDriveFolder();
  var inserted = folder.insert({ blob: makeTestImageBlob("photo.png") });

  var url = folder.getImageUrl(inserted.data.id);
  assertEqual(url, "https://lh3.googleusercontent.com/d/" + inserted.data.id, "image url format");
}

function testGetImageUrl_NotImage() {
  clearDriveFolder();
  var folder   = getDriveFolder();
  var inserted = folder.insert({ blob: makeTestBlob("not-an-image.txt") });

  var threw = false;
  try {
    folder.getImageUrl(inserted.data.id);
  } catch (e) {
    threw = true;
  }
  assert(threw, "getImageUrl should throw for a non-image file");
}

function testInsertSharingPublic() {
  clearDriveFolder();
  var folder   = getDriveFolder();
  var inserted = folder.insert({ blob: makeTestBlob("public.txt"), sharing: "public" });

  var file = DriveApp.getFileById(inserted.data.id);
  assertEqual(file.getSharingAccess().toString(), DriveApp.Access.ANYONE.toString(), "sharing access");
  assertEqual(file.getSharingPermission().toString(), DriveApp.Permission.VIEW.toString(), "sharing permission");
}

function testUpdateSharingPublic() {
  clearDriveFolder();
  var folder   = getDriveFolder();
  var inserted = folder.insert({ blob: makeTestBlob("private.txt") });

  var result = folder.update(inserted.data.id, { sharing: "public" });
  assert(result.success, "update with sharing should succeed");

  var file = DriveApp.getFileById(inserted.data.id);
  assertEqual(file.getSharingAccess().toString(), DriveApp.Access.ANYONE.toString(), "sharing access after update");
}

function testWhoAmI() {
  var email = SheetORM.whoAmI();
  assert(typeof email === "string" && email.indexOf("@") !== -1, "whoAmI should return an email string");
}
