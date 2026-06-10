var Validator = (function () {

  // Apply defaults + validate data against schema.
  // Mutates data in-place for defaults and type casting.
  // Returns array of { field, error } — empty means valid.
  function validate(schema, data) {
    var errors = [];

    Object.keys(schema).forEach(function (field) {
      var rules = schema[field];
      var value = data[field];

      // apply default
      if ((value === undefined || value === null || value === "") && rules.default !== undefined) {
        data[field] = rules.default;
        value = data[field];
      }

      // required
      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push({ field: field, error: field + " is required" });
        return;
      }

      // skip further checks when empty and not required
      if (value === undefined || value === null || value === "") return;

      // --- type checks + casting ---

      if (rules.type === "number") {
        var num = parseFloat(value);
        if (isNaN(num)) {
          errors.push({ field: field, error: field + " must be a number" });
          return;
        }
        data[field] = num;
        value = num;
        if (rules.min !== undefined && value < rules.min) {
          errors.push({ field: field, error: field + " must be >= " + rules.min });
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push({ field: field, error: field + " must be <= " + rules.max });
        }
      }

      if (rules.type === "boolean") {
        if (value === true  || value === "true")  { data[field] = true;  value = true; }
        else if (value === false || value === "false") { data[field] = false; value = false; }
        else { errors.push({ field: field, error: field + " must be a boolean (true/false)" }); }
      }

      if (rules.type === "string") {
        data[field] = String(value);
        value = data[field];
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push({ field: field, error: field + " must be at least " + rules.minLength + " characters" });
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push({ field: field, error: field + " must be at most " + rules.maxLength + " characters" });
        }
      }

      // enum
      if (rules.enum && rules.enum.indexOf(value) === -1) {
        errors.push({ field: field, error: field + " must be one of: " + rules.enum.join(", ") });
      }
    });

    return errors;
  }

  // Cast types when reading rows back from the sheet
  function cast(schema, data) {
    if (!schema) return data;
    var result = {};
    for (var k in data) result[k] = data[k];

    Object.keys(schema).forEach(function (field) {
      var v = result[field];
      if (v === undefined || v === null || v === "") return;
      var type = schema[field].type;
      if (type === "number")  result[field] = isNaN(parseFloat(v)) ? v : parseFloat(v);
      if (type === "boolean") result[field] = (v === true || v === "true");
      if (type === "string")  result[field] = String(v);
    });

    return result;
  }

  return { validate: validate, cast: cast };

})();
