function connect(spreadsheetId) {
  return new Connection(spreadsheetId);
}

function migrate(spreadsheetId, migrations) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  return new Migrator(ss).run(migrations);
}

function rollback(spreadsheetId, migrations) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  return new Migrator(ss).rollback(migrations);
}

function migrationStatus(spreadsheetId, migrations) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  return new Migrator(ss).status(migrations);
}

function seed(spreadsheetId, seeds) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  return new Seeder(ss).seed(seeds);
}

function freshSeed(spreadsheetId, seeds) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  return new Seeder(ss).freshSeed(seeds);
}
