function DriveFolder(folder) {
  this.folder    = folder;
  this.idColumn  = "id";
}

// ຫາ Drive item ດ້ວຍ id — ຕ້ອງເປັນ direct child ຂອງ folder ນີ້ເທົ່ານັ້ນ
// ໝາຍເຫດ: ທັງ DriveApp.getFileById() ແລະ getFolderById() ບໍ່ validate mimeType — ທັງສອງ throw ສະເພາະຕອນ id
// ບໍ່ມີຢູ່ຈິງ/ບໍ່ມີສິດເຂົ້າເຖິງ, ບໍ່ແມ່ນຕອນ id "ຜິດປະເພດ". ດັ່ງນັ້ນ ຈຶ່ງໃຊ້ getFileById() ດຽວ (ໃຊ້ໄດ້ກັບທັງ file
// ແລະ folder id) ແລ້ວຈໍາແນກປະເພດຈິງດ້ວຍ getMimeType() === MimeType.FOLDER
DriveFolder.prototype._resolveItem = function (id) {
  var item;
  try {
    item = DriveApp.getFileById(id);
  } catch (e) {
    throw new NotFoundError();
  }

  var type = item.getMimeType() === MimeType.FOLDER ? "folder" : "file";

  if (!this._isDirectChild(item)) throw new NotFoundError();
  return { item: item, type: type };
};

DriveFolder.prototype._isDirectChild = function (item) {
  var folderId = this.folder.getId();
  var parents = item.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) return true;
  }
  return false;
};

// ແປງ Drive File/Folder ເປັນ record object (metadata ເທົ່ານັ້ນ)
DriveFolder.prototype._toRecord = function (item, type) {
  var record = {
    id:          item.getId(),
    name:        item.getName(),
    type:        type,
    url:         item.getUrl(),
    description: item.getDescription() || "",
    createdAt:   item.getDateCreated().toISOString(),
    updatedAt:   item.getLastUpdated().toISOString()
  };

  if (type === "file") {
    record.mimeType = item.getMimeType();
    record.size = item.getSize();
  } else {
    record.mimeType = null;
    record.size = null;
  }

  return record;
};

// --- FIND ALL: ຄືນທັງ file ແລະ folder ໜຶ່ງຊັ້ນ, ບໍ່ recurse ---
DriveFolder.prototype.findAll = function () {
  try {
    var self = this;
    var records = [];

    var files = this.folder.getFiles();
    while (files.hasNext()) records.push(self._toRecord(files.next(), "file"));

    var folders = this.folder.getFolders();
    while (folders.hasNext()) records.push(self._toRecord(folders.next(), "folder"));

    return { success: true, data: records };
  } catch (e) {
    return errResponse(e);
  }
};

// --- FIND BY ID ---
DriveFolder.prototype.findById = function (id) {
  try {
    var resolved = this._resolveItem(id);
    return { success: true, data: this._toRecord(resolved.item, resolved.type) };
  } catch (e) {
    return errResponse(e);
  }
};

// --- FIND (exact match, AND logic) ---
DriveFolder.prototype.find = function (query) {
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

// --- INSERT: data.blob → upload file, ບໍ່ມີ blob ແຕ່ມີ name → ສ້າງ subfolder ---
DriveFolder.prototype.insert = function (data) {
  try {
    var item, type;

    if (data.blob) {
      item = this.folder.createFile(data.blob);
      type = "file";
      if (data.name) item.setName(data.name);
      if (data.description) item.setDescription(data.description);
    } else if (data.name) {
      item = this.folder.createFolder(data.name);
      type = "folder";
      if (data.description) item.setDescription(data.description);
    } else {
      throw new Error("insert requires blob or name");
    }

    this._applySharing(item, data.sharing);

    return { success: true, data: this._toRecord(item, type) };
  } catch (e) {
    return errResponse(e);
  }
};

// --- UPDATE: metadata ເທົ່ານັ້ນ (name / description) ---
DriveFolder.prototype.update = function (id, data) {
  try {
    var resolved = this._resolveItem(id);
    var item = resolved.item;

    if (data.name !== undefined) item.setName(data.name);
    if (data.description !== undefined) item.setDescription(data.description);
    this._applySharing(item, data.sharing);

    return { success: true, data: this._toRecord(item, resolved.type) };
  } catch (e) {
    return errResponse(e);
  }
};

// --- DELETE: trash, ບໍ່ permanent (ADR-0001) ---
DriveFolder.prototype.delete = function (id) {
  try {
    var resolved = this._resolveItem(id);
    resolved.item.setTrashed(true);
    return { success: true, data: { id: id } };
  } catch (e) {
    return errResponse(e);
  }
};

// --- IMAGE URL: browser-embeddable <img src> URL for an image file (ADR-0003) ---
// ບໍ່ຄືນ {success,data} ຄືກັນກັບ method ອື່ນ — ນີ້ຄື synchronous string builder, ບໍ່ແມ່ນ CRUD operation
DriveFolder.prototype.getImageUrl = function (fileId) {
  var resolved = this._resolveItem(fileId);
  var mimeType = resolved.item.getMimeType();
  if (mimeType.indexOf("image/") !== 0) {
    throw new Error("File is not an image (mimeType: " + mimeType + "): " + fileId);
  }
  return "https://lh3.googleusercontent.com/d/" + fileId;
};

// --- SHARING: ຕັ້ງ item ໃຫ້ເປັນ "public" (ANYONE + VIEW) — ໃຊ້ຮ່ວມກັນລະຫວ່າງ insert()/update() ---
DriveFolder.prototype._applySharing = function (item, sharing) {
  if (sharing === "public") {
    item.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
  }
};

// --- Query builder entry points ---
DriveFolder.prototype.where = function (field, op, value) {
  return new Query(this).where(field, op, value);
};

DriveFolder.prototype.orderBy = function (field, dir) {
  return new Query(this).orderBy(field, dir);
};

DriveFolder.prototype.limit = function (n) {
  return new Query(this).limit(n);
};

DriveFolder.prototype.offset = function (n) {
  return new Query(this).offset(n);
};

DriveFolder.prototype.select = function (fields) {
  return new Query(this).select(fields);
};
