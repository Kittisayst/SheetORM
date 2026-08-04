function connect(spreadsheetId) {
  return new Connection(spreadsheetId);
}

function driveConnect(folderId) {
  var folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e) {
    throw new ConnectionError(
      "Cannot open Drive folder: " + folderId +
      ". Check the folder ID is correct and that the running account has access — " +
      "see SheetORM.whoAmI() to check which account is executing."
    );
  }
  return new DriveFolder(folder);
}

function whoAmI() {
  return Session.getEffectiveUser().getEmail();
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
