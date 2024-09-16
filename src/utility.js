const { ipcRenderer } = require("electron");

function ensureAllInputElementsAreValid(root) {
  let formIsValid = true;
  for (const elem of root.childNodes) {
    if (elem.checkValidity) {
      const currentElementValidity = elem.checkValidity();
      const areAllChildElementsvValid = ensureAllInputElementsAreValid(elem);

      formIsValid =
        formIsValid && currentElementValidity && areAllChildElementsvValid;
      if (!elem.checkValidity()) elem.dispatchEvent(new Event("input"));
    } else {
      const areAllChildElementsvValid = ensureAllInputElementsAreValid(elem);

      formIsValid = formIsValid && areAllChildElementsvValid;
    }
  }

  return formIsValid;
}

async function dbRequest(route, params) {
  return new Promise((resolve) => {
    const nonce = _generateNonce();
    ipcRenderer.once(`${nonce}`, (_, data) => {
      console.info("Resolving DB request");
      resolve(data);
    });

    ipcRenderer.send(channels.dbRequest, nonce, route, params);
  });
}

async function pagedDbRequest(route, pageNumber) {
  return new Promise((resolve) => {
    const nonce = _generateNonce();
    ipcRenderer.once(`${nonce}`, (_, data) => {
      console.info("Resolving DB request");
      resolve(data);
    });

    ipcRenderer.send(channels.pagedDbRequest, route, nonce, pageNumber);
  });
}

function sha256Hash(string) {
  const crypto = require("crypto");
  const hasher = crypto.createHash("sha256");
  return hasher.update(string).digest("hex");
}

function normalizeFieldName(fieldName) {
  return fieldName
    .split("_")
    .map((e) => e[0].toUpperCase() + e.substring(1))
    .join(" ");
}

function _generateNonce() {
  return ~~(Math.random() * 1000);
}

module.exports = {
  dbRequest,
  ensureAllInputElementsAreValid,
  pagedDbRequest,
  sha256Hash,
  normalizeFieldName,
};
