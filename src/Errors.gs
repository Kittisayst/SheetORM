// Base error
function SheetORMError(message, type) {
  this.message = message || "SheetORM error";
  this.type    = type    || "SheetORMError";
  this.name    = this.type;
}
SheetORMError.prototype = Object.create(Error.prototype);
SheetORMError.prototype.constructor = SheetORMError;

// Record not found
function NotFoundError(message) {
  SheetORMError.call(this, message || "Not found", "NotFoundError");
}
NotFoundError.prototype = Object.create(SheetORMError.prototype);
NotFoundError.prototype.constructor = NotFoundError;

// Schema validation failed — carries field-level errors[]
function ValidationError(message, errors) {
  SheetORMError.call(this, message || "Validation failed", "ValidationError");
  this.errors = errors || [];
}
ValidationError.prototype = Object.create(SheetORMError.prototype);
ValidationError.prototype.constructor = ValidationError;

// Spreadsheet connection failed
function ConnectionError(message) {
  SheetORMError.call(this, message || "Connection failed", "ConnectionError");
}
ConnectionError.prototype = Object.create(SheetORMError.prototype);
ConnectionError.prototype.constructor = ConnectionError;

// Helper: wrap any SheetORMError into the standard response format
function errResponse(e) {
  if (e instanceof ValidationError) {
    return { success: false, type: e.type, error: e.message, errors: e.errors };
  }
  if (e instanceof SheetORMError) {
    return { success: false, type: e.type, error: e.message };
  }
  return { success: false, type: "Error", error: e.message };
}
