function Table(sheet) {
  this.sheet    = sheet;
  this.idColumn = "id";
  this._schema  = null;
}

// --- SCHEMA: define + chainable ---
Table.prototype.schema = function (schemaDef) {
  this._schema = schemaDef;
  return this;
};

// ດຶງ headers ຈາກ row 1
Table.prototype._getHeaders = function () {
  var lastCol = this.sheet.getLastColumn();
  if (lastCol === 0) return [];
  return this.sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
};

// ດຶງ index ຂອງ row ທີ່ id ຕົງ (1-based, ລວມ header)
Table.prototype._findRowIndex = function (id) {
  var headers = this._getHeaders();
  var idIdx = headers.indexOf(this.idColumn);
  if (idIdx === -1) return -1;

  var lastRow = this.sheet.getLastRow();
  if (lastRow < 2) return -1;

  var data = this.sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 2;
  }
  return -1;
};

// cast + validate helper — ໃຊ້ພາຍໃນ insert/update
Table.prototype._validate = function (data) {
  if (!this._schema) return;
  var errors = Validator.validate(this._schema, data);
  if (errors.length > 0) throw new ValidationError("Validation failed", errors);
};

// cast ຂໍ້ມູນທີ່ອ່ານຈາກ sheet
Table.prototype._cast = function (record) {
  return this._schema ? Validator.cast(this._schema, record) : record;
};

// --- INSERT ---
Table.prototype.insert = function (data) {
  try {
    var headers = this._getHeaders();
    if (headers.length === 0) return { success: false, type: "Error", error: "Sheet has no headers" };

    var now = Utils.nowIso();
    var record = {};
    for (var k in data) record[k] = data[k];
    if (!record[this.idColumn]) record[this.idColumn] = Utils.generateId();
    if (headers.indexOf("createdAt") !== -1 && !record.createdAt) record.createdAt = now;
    if (headers.indexOf("updatedAt") !== -1) record.updatedAt = now;

    this._validate(record);

    this.sheet.appendRow(Utils.objectToRow(headers, record));
    return { success: true, data: record };
  } catch (e) {
    return errResponse(e);
  }
};

// --- FIND ALL ---
Table.prototype.findAll = function () {
  try {
    var headers = this._getHeaders();
    var lastRow = this.sheet.getLastRow();
    if (lastRow < 2) return { success: true, data: [] };

    var self = this;
    var results = this.sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()
      .map(function (row) { return self._cast(Utils.rowToObject(headers, row)); });

    return { success: true, data: results };
  } catch (e) {
    return errResponse(e);
  }
};

// --- FIND BY ID ---
Table.prototype.findById = function (id) {
  try {
    var headers = this._getHeaders();
    var rowIndex = this._findRowIndex(id);
    if (rowIndex === -1) throw new NotFoundError();

    var row = this.sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    return { success: true, data: this._cast(Utils.rowToObject(headers, row)) };
  } catch (e) {
    return errResponse(e);
  }
};

// --- FIND (exact match, AND logic) ---
Table.prototype.find = function (query) {
  try {
    var all = this.findAll();
    if (!all.success) return all;

    var results = all.data.filter(function (record) {
      return Object.keys(query).every(function (key) {
        return String(record[key]) === String(query[key]);
      });
    });

    return { success: true, data: results };
  } catch (e) {
    return errResponse(e);
  }
};

// --- UPDATE ---
Table.prototype.update = function (id, data) {
  try {
    var headers = this._getHeaders();
    var rowIndex = this._findRowIndex(id);
    if (rowIndex === -1) throw new NotFoundError();

    var existing = this._cast(Utils.rowToObject(
      headers,
      this.sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0]
    ));

    var updated = {};
    for (var k in existing) updated[k] = existing[k];
    for (var k in data) {
      if (k !== this.idColumn) updated[k] = data[k];
    }
    if (headers.indexOf("updatedAt") !== -1) updated.updatedAt = Utils.nowIso();

    this._validate(updated);

    this.sheet.getRange(rowIndex, 1, 1, headers.length).setValues([Utils.objectToRow(headers, updated)]);
    return { success: true, data: updated };
  } catch (e) {
    return errResponse(e);
  }
};

// --- DELETE ---
Table.prototype.delete = function (id) {
  try {
    var rowIndex = this._findRowIndex(id);
    if (rowIndex === -1) throw new NotFoundError();

    this.sheet.deleteRow(rowIndex);
    return { success: true, data: { id: id } };
  } catch (e) {
    return errResponse(e);
  }
};

// --- Query builder entry points ---
Table.prototype.where = function (field, op, value) {
  return new Query(this).where(field, op, value);
};

Table.prototype.orderBy = function (field, dir) {
  return new Query(this).orderBy(field, dir);
};

Table.prototype.limit = function (n) {
  return new Query(this).limit(n);
};

Table.prototype.offset = function (n) {
  return new Query(this).offset(n);
};

Table.prototype.select = function (fields) {
  return new Query(this).select(fields);
};

// --- INSERT MANY: batch insert using setValues (faster than appendRow loop) ---
Table.prototype.insertMany = function (rows) {
  try {
    var headers = this._getHeaders();
    if (headers.length === 0) return { success: false, type: "Error", error: "Sheet has no headers" };

    var self = this;
    var idColumn = this.idColumn;
    var now = Utils.nowIso();
    var hasCreatedAt = headers.indexOf("createdAt") !== -1;
    var hasUpdatedAt = headers.indexOf("updatedAt") !== -1;

    var records = rows.map(function (data) {
      var record = {};
      for (var k in data) record[k] = data[k];
      if (!record[idColumn]) record[idColumn] = Utils.generateId();
      if (hasCreatedAt && !record.createdAt) record.createdAt = now;
      if (hasUpdatedAt) record.updatedAt = now;
      self._validate(record);
      return record;
    });

    var rowData = records.map(function (r) { return Utils.objectToRow(headers, r); });
    this.sheet.getRange(this.sheet.getLastRow() + 1, 1, rowData.length, headers.length).setValues(rowData);

    return { success: true, data: records };
  } catch (e) {
    return errResponse(e);
  }
};
