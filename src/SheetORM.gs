var SheetORM = (function () {

  function _open(spreadsheetId) {
    try {
      return SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      throw new Error("Cannot open spreadsheet: " + spreadsheetId);
    }
  }

  function connect(spreadsheetId) {
    return new Connection(spreadsheetId);
  }

  function migrate(spreadsheetId, migrations) {
    return new Migrator(_open(spreadsheetId)).run(migrations);
  }

  function rollback(spreadsheetId, migrations) {
    return new Migrator(_open(spreadsheetId)).rollback(migrations);
  }

  function migrationStatus(spreadsheetId, migrations) {
    return new Migrator(_open(spreadsheetId)).status(migrations);
  }

  function seed(spreadsheetId, seeds) {
    return new Seeder(_open(spreadsheetId)).seed(seeds);
  }

  function freshSeed(spreadsheetId, seeds) {
    return new Seeder(_open(spreadsheetId)).freshSeed(seeds);
  }

  return {
    connect: connect,
    migrate: migrate,
    rollback: rollback,
    migrationStatus: migrationStatus,
    seed: seed,
    freshSeed: freshSeed
  };

})();
