function Migrator(spreadsheet) {
  this.spreadsheet = spreadsheet;
  this._ensureMigrationsSheet();
}

// ສ້າງ sheet _migrations ຖ້າຍັງບໍ່ມີ
Migrator.prototype._ensureMigrationsSheet = function () {
  if (!this.spreadsheet.getSheetByName("_migrations")) {
    var sheet = this.spreadsheet.insertSheet("_migrations");
    sheet.getRange(1, 1, 1, 3).setValues([["version", "name", "appliedAt"]]);
  }
};

Migrator.prototype._migrationsSheet = function () {
  return this.spreadsheet.getSheetByName("_migrations");
};

// ດຶງ versions ທີ່ run ໄປແລ້ວ
Migrator.prototype._getApplied = function () {
  var sheet = this._migrationsSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function (r) {
    return String(r[0]);
  });
};

Migrator.prototype._recordMigration = function (version, name) {
  this._migrationsSheet().appendRow([version, name, Utils.nowIso()]);
};

Migrator.prototype._removeLastMigration = function () {
  var sheet = this._migrationsSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.deleteRow(lastRow);
};

// --- Schema operations (ໃຊ້ໃນ up/down functions) ---

Migrator.prototype.createTable = function (name, headers) {
  if (this.spreadsheet.getSheetByName(name)) return;
  var sheet = this.spreadsheet.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
};

Migrator.prototype.dropTable = function (name) {
  var sheet = this.spreadsheet.getSheetByName(name);
  if (sheet) this.spreadsheet.deleteSheet(sheet);
};

Migrator.prototype.addColumn = function (tableName, columnName) {
  var sheet = this.spreadsheet.getSheetByName(tableName);
  if (!sheet) throw new Error("Table not found: " + tableName);
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue(columnName);
};

Migrator.prototype.removeColumn = function (tableName, columnName) {
  var sheet = this.spreadsheet.getSheetByName(tableName);
  if (!sheet) throw new Error("Table not found: " + tableName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var colIdx = headers.indexOf(columnName);
  if (colIdx === -1) throw new Error("Column not found: " + columnName);
  sheet.deleteColumn(colIdx + 1);
};

Migrator.prototype.renameColumn = function (tableName, oldName, newName) {
  var sheet = this.spreadsheet.getSheetByName(tableName);
  if (!sheet) throw new Error("Table not found: " + tableName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var colIdx = headers.indexOf(oldName);
  if (colIdx === -1) throw new Error("Column not found: " + oldName);
  sheet.getRange(1, colIdx + 1).setValue(newName);
};

// --- Run: ຮັນ migrations ທີ່ຍັງບໍ່ໄດ້ apply ---

Migrator.prototype.run = function (migrations) {
  try {
    var applied = this._getApplied();
    var self = this;
    var ran = [];

    migrations.forEach(function (m) {
      if (applied.indexOf(String(m.version)) === -1) {
        m.up(self);
        self._recordMigration(m.version, m.name);
        ran.push(m.version + "_" + m.name);
      }
    });

    return { success: true, data: { ran: ran.length, migrations: ran } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// --- Rollback: undo migration ສຸດທ້າຍ ---

Migrator.prototype.rollback = function (migrations) {
  try {
    var applied = this._getApplied();
    if (applied.length === 0) return { success: false, error: "Nothing to rollback" };

    var lastVersion = applied[applied.length - 1];
    var migration = null;
    for (var i = 0; i < migrations.length; i++) {
      if (String(migrations[i].version) === lastVersion) {
        migration = migrations[i];
        break;
      }
    }

    if (!migration) return { success: false, error: "Migration not found: " + lastVersion };

    migration.down(this);
    this._removeLastMigration();

    return { success: true, data: { rolledBack: lastVersion + "_" + migration.name } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// --- Status: ສະແດງ migrations ທີ່ run ແລ້ວ vs ຍັງຄ້າງ ---

Migrator.prototype.status = function (migrations) {
  try {
    var applied = this._getApplied();
    var rows = migrations.map(function (m) {
      return {
        version: m.version,
        name: m.name,
        status: applied.indexOf(String(m.version)) !== -1 ? "applied" : "pending"
      };
    });
    return { success: true, data: rows };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
