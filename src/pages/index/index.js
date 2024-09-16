const { ipcRenderer } = require("electron");
const channels = require("../../channels");
const { dbRequest } = require("../../utility");
const { Toaster } = require("./toaster");

require("../elements/all");

function convertUserTypeToEnglish(type) {
  const conversions = {
    reg_usr: "Regular User",
  };

  return conversions[type];
}

document
  .getElementById("signout-modal")
  .shadowRoot.getElementById("ok-button").onclick = () => {
  ipcRenderer.send(channels.signout);
};

document.getElementById("navbar-signout").onclick = () => {
  document.getElementById("signout-modal").setAttribute("active", "true");
};

document.getElementById("navbar-account").onclick = () => {
  document.getElementById("account-modal").setAttribute("active", "true");
};

ipcRenderer.on(channels.bootstrapData, (_, data) => {
  document
    .getElementById("account-address-tile")
    .setAttribute("value", data.user.address);
  document
    .getElementById("account-email-tile")
    .setAttribute("value", data.user.email);
  document
    .getElementById("account-phone-tile")
    .setAttribute("value", data.user.phone_num);
  document.getElementById(
    "account-full-name"
  ).innerText = `${data.user.first_name} ${data.user.last_name}`;
  document.getElementById("account-user-type").innerText =
    convertUserTypeToEnglish(data.user.user_type);
  document.getElementById("loading-content").classList.add("d-none");
  document.getElementById("main-content").classList.remove("d-none");
});

document
  .getElementById("account-modal-save-button")
  .addEventListener("click", () => {
    document.getElementById("account-modal").setAttribute("active", "");
    new Toaster().showSuccessToast("Saved!");
    dbRequest("performUpdate", {
      table: "users",
      identifyingData: {
        email: document
          .getElementById("account-email-tile")
          .shadowRoot.getElementById("tile-value").textContent,
      },
      dataToUpdate: {
        phone_num: document
          .getElementById("account-phone-tile")
          .shadowRoot.getElementById("tile-value").textContent,
      },
    });
  });
