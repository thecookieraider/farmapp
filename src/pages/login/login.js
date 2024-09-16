const { ipcRenderer } = require("electron");
const channels = require("../../channels");
require("../elements/form-input");

const passwordInputLoginPage = document.getElementById("login-password-input");
const emailInputLoginPage = document.getElementById("login-email-input");
const signupFormError = document.getElementById("form-error-signup");
const loginFormError = document.getElementById("form-error-login");
const signupButtonOnSignupPage = document.getElementById("signup-btn-signup");
const loginButtonOnSignupPage = document.getElementById("login-btn-signup");
const signupButtonOnLoginPage = document.getElementById("signup-btn-login");
const loginButtonOnLoginPage = document.getElementById("login-btn-login");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const { ensureAllInputElementsAreValid } = require("../../utility");

ipcRenderer.on(channels.error, (_, error) => {
  console.info("Received error in login page: ", error);
  signupButtonOnSignupPage.classList.remove("loading");
  loginButtonOnLoginPage.classList.remove("loading");

  if (loginForm.classList.contains("d-none")) {
    signupFormError.classList.add("text-error");
    signupFormError.scrollIntoView({
      behavior: "smooth",
    });
    signupFormError.textContent = error;
  } else {
    loginFormError.classList.add("text-error");
    loginFormError.scrollIntoView({
      behavior: "smooth",
    });
    loginFormError.textContent = error;
  }
});

signupButtonOnSignupPage.addEventListener("click", () => {
  signupButtonOnSignupPage.classList.add("loading");

  let formIsValid = ensureAllInputElementsAreValid(signupForm);

  if (!formIsValid) {
    signupButtonOnSignupPage.classList.remove("loading");
    return false;
  }

  const email = document.getElementById("email-input").value;
  const password_hash = document.getElementById("password-input").value;
  const first_name = document.getElementById("first-name-input").value;
  const last_name = document.getElementById("last-name-input").value;
  const address = document.getElementById("address-input").value;
  const zip_code = document.getElementById("zip-input").value;
  const phone_num = document.getElementById("phone-input").value;
  const user_type = "reg_usr";

  ipcRenderer.send(channels.signup, {
    email,
    first_name,
    last_name,
    address,
    zip_code,
    phone_num,
    user_type,
    password_hash,
  });
});

loginButtonOnLoginPage.addEventListener("click", () => {
  loginButtonOnLoginPage.classList.add("loading");

  let formIsValid = ensureAllInputElementsAreValid(loginForm);

  if (!formIsValid) {
    loginButtonOnLoginPage.classList.remove("loading");
    return false;
  }

  ipcRenderer.send(channels.credentials, {
    email: emailInputLoginPage.value,
    password: passwordInputLoginPage.value,
  });
});

signupButtonOnLoginPage.addEventListener("click", () => {
  signupForm.classList.remove("d-none");
  loginForm.classList.add("d-none");
});

loginButtonOnSignupPage.addEventListener("click", () => {
  loginForm.classList.remove("d-none");
  signupForm.classList.add("d-none");
});
