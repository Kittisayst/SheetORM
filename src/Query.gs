function Query(table) {
  this._table = table;
  this._conditions = [];   // [{ field, op, value }]
  this._orderField = null;
  this._orderDir = "ASC";
  this._limitVal = null;
  this._offsetVal = 0;
  this._selectFields = null;
}

// --- Builder methods (chainable) ---

Query.prototype.where = function (field, op, value) {
  this._conditions.push({ field: field, op: op, value: value });
  return this;
};

Query.prototype.orderBy = function (field, dir) {
  this._orderField = field;
  this._orderDir = (dir || "ASC").toUpperCase();
  return this;
};

Query.prototype.limit = function (n) {
  this._limitVal = n;
  return this;
};

Query.prototype.offset = function (n) {
  this._offsetVal = n;
  return this;
};

Query.prototype.select = function (fields) {
  this._selectFields = fields;
  return this;
};

// --- Internal: test one record against all conditions ---

Query.prototype._match = function (record) {
  return this._conditions.every(function (c) {
    var val = String(record[c.field] !== undefined ? record[c.field] : "");
    var cval = String(c.value);
    switch (c.op) {
      case "=":          return val === cval;
      case "!=":         return val !== cval;
      case ">":          return _coerce(val) > _coerce(cval);
      case "<":          return _coerce(val) < _coerce(cval);
      case ">=":         return _coerce(val) >= _coerce(cval);
      case "<=":         return _coerce(val) <= _coerce(cval);
      case "contains":   return val.indexOf(cval) !== -1;
      case "startsWith": return val.indexOf(cval) === 0;
      case "endsWith":   return val.slice(-cval.length) === cval;
      default:           return false;
    }
  });
};

// coerce value to number for comparison:
// - pure number string → number
// - ISO date string    → timestamp (ms)
// - else              → NaN
function _coerce(s) {
  var n = Number(s);
  if (!isNaN(n)) return n;
  var d = new Date(s);
  return isNaN(d.getTime()) ? NaN : d.getTime();
}

// --- GET: execute query, return filtered/sorted/paged results ---

Query.prototype.get = function () {
  try {
    var all = this._table.findAll();
    if (!all.success) return all;

    var self = this;
    var results = all.data.filter(function (r) { return self._match(r); });

    // sort
    if (this._orderField) {
      var field = this._orderField;
      var dir = this._orderDir;
      results.sort(function (a, b) {
        var av = a[field], bv = b[field];
        // numeric / ISO-date path
        var an = _coerce(av), bn = _coerce(bv);
        if (!isNaN(an) && !isNaN(bn)) return dir === "ASC" ? an - bn : bn - an;
        // string fallback (also works for ISO dates lexicographically)
        var as = String(av), bs = String(bv);
        if (as < bs) return dir === "ASC" ? -1 : 1;
        if (as > bs) return dir === "ASC" ? 1 : -1;
        return 0;
      });
    }

    // pagination
    results = results.slice(this._offsetVal);
    if (this._limitVal !== null) results = results.slice(0, this._limitVal);

    // field projection
    if (this._selectFields) {
      var fields = this._selectFields;
      results = results.map(function (r) {
        var obj = {};
        fields.forEach(function (f) { obj[f] = r[f]; });
        return obj;
      });
    }

    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// --- UPDATE MANY: update all matched rows ---

Query.prototype.updateMany = function (data) {
  try {
    var all = this._table.findAll();
    if (!all.success) return all;

    var self = this;
    var matched = all.data.filter(function (r) { return self._match(r); });
    var updated = [];

    matched.forEach(function (r) {
      var result = self._table.update(r[self._table.idColumn], data);
      if (result.success) updated.push(result.data);
    });

    return { success: true, data: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

// --- DELETE MANY: delete all matched rows ---
// ລຶບຈາກ row ລຸ່ມຂຶ້ນເທິງ ເພື່ອບໍ່ໃຫ້ row index shift

Query.prototype.deleteMany = function () {
  try {
    var all = this._table.findAll();
    if (!all.success) return all;

    var self = this;
    var matched = all.data.filter(function (r) { return self._match(r); });

    matched.slice().reverse().forEach(function (r) {
      self._table.delete(r[self._table.idColumn]);
    });

    return { success: true, data: { deleted: matched.length } };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
