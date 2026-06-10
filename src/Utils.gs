var Utils = (function () {

  function generateId() {
    return Utilities.getUuid();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // ["id","name"] + ["1","Kitti"] → { id:"1", name:"Kitti" }
  function rowToObject(headers, row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i] !== undefined ? row[i] : "";
    }
    return obj;
  }

  // headers + { name:"Kitti", id:"1" } → ["1","Kitti","",""]
  function objectToRow(headers, data) {
    return headers.map(function (h) {
      return data[h] !== undefined ? data[h] : "";
    });
  }

  return {
    generateId: generateId,
    nowIso: nowIso,
    rowToObject: rowToObject,
    objectToRow: objectToRow
  };

})();
