function Seeder(spreadsheet) {
  this.spreadsheet = spreadsheet;
}

// seed: insert ສະເພາະຕາຕະລາງທີ່ຍັງຫວ່າງ (ບໍ່ overwrite ຂໍ້ມູນທີ່ມີຢູ່)
Seeder.prototype.seed = function (seeds) {
  try {
    var results = {};
    var spreadsheet = this.spreadsheet;

    Object.keys(seeds).forEach(function (tableName) {
      var sheet = spreadsheet.getSheetByName(tableName);
      if (!sheet) {
        results[tableName] = { success: false, error: "Table not found: " + tableName };
        return;
      }
      if (sheet.getLastRow() >= 2) {
        results[tableName] = { success: true, data: { skipped: true, reason: "Table already has data" } };
        return;
      }
      var result = new Table(sheet).insertMany(seeds[tableName]);
      results[tableName] = result;
    });

    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// freshSeed: ລ້າງຂໍ້ມູນເກົ່າ (ເກັບ header) ແລ້ວ insert ໃໝ່
Seeder.prototype.freshSeed = function (seeds) {
  try {
    var results = {};
    var spreadsheet = this.spreadsheet;

    Object.keys(seeds).forEach(function (tableName) {
      var sheet = spreadsheet.getSheetByName(tableName);
      if (!sheet) {
        results[tableName] = { success: false, error: "Table not found: " + tableName };
        return;
      }

      var lastRow = sheet.getLastRow();
      if (lastRow >= 2) {
        sheet.deleteRows(2, lastRow - 1);
      }

      var result = new Table(sheet).insertMany(seeds[tableName]);
      results[tableName] = result;
    });

    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
