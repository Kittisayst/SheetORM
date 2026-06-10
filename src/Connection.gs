function Connection(spreadsheetId) {
  try {
    this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    throw new Error("Cannot open spreadsheet: " + spreadsheetId);
  }
}

Connection.prototype.table = function (sheetName) {
  var sheet = this.spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Sheet not found: " + sheetName);
  }
  return new Table(sheet);
};
