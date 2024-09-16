"use strict";

const { ipcMain, BrowserWindow, app } = require("electron");
const { Database } = require("./database");
const { readFileSync } = require("fs");
const { sha256Hash } = require("./utility");
const assert = require("assert");
const path = require("path");
const minimist = require("minimist");
const channels = require("./channels");
const argv = minimist(process.argv);

// To stop app from launching multiple times when installing the application via Squirrel.Windows
if (require("electron-squirrel-startup")) {
  return app.quit();
}

// For hot-reloading for renderer windows
require("electron-reload")(__dirname);

global.farmApp = {
  maximumItemsPerPage: 5,
  browserWindowDefaults: {
    icon: path.resolve(__dirname, "icon.ico"),
    show: false,
    title: "Farm Tracking App Report",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.resolve(__dirname, "preload.js"),
    },
  },

  windows: {
    config: {
      login: {
        view: ["pages", "login", "login.html"],
        name: "login",
        onFinishLoad: (window) =>
          window.webContents.send(channels.bootstrapData, {
            user: global.farmApp.user,
          }),
      },
      error: {
        view: ["pages", "error", "error.html"],
        name: "error",
        onFinishLoad: (window) =>
          window.webContents.send(channels.error, global.farmApp.error),
        onClose: (_window) => (global.farmApp.windows.error = null),
      },
      index: { view: ["pages", "index", "index.html"], name: "index" },
    },

    instances: {
      login: undefined,
      error: undefined,
      index: undefined,
    },
  },

  database: null,
  user: null,
  error: undefined,
};

function setupIpcMainMessageHandlers() {
  ipcMain.on(channels.reload, () => {
    console.info("Request to reload the program received. Performing reload");
    main();
  });

  ipcMain.on(channels.dbRequest, async (e, nonce, route, params) => {
    console.info("Regular DB request received");
    console.info("Params:", params);
    console.info("Route:", route);

    const results = await global.farmApp.database[route](params);

    e.reply(`${nonce}`, results);
  });

  ipcMain.on(channels.pagedDbRequest, async (e, route, nonce, page) => {
    console.info("Paged DB request received:", route);

    const results = await global.farmApp.database.performPagedQuery({
      number: global.farmApp.maximumItemsPerPage,
      offset: (page - 1) * global.farmApp.maximumItemsPerPage,
      user: global.farmApp.user,
      route,
    });

    e.reply(`${nonce}`, results);
  });

  ipcMain.on(channels.credentials, async (e, credentials) => {
    console.info(
      "Received credentials from login page. Verifying proper syntax of data"
    );
    assert(
      credentials && credentials.email && credentials.password,
      "Malformed credentials object"
    );

    const {
      results: [user],
    } = await global.farmApp.database.getUserByEmail(credentials.email);
    const hashedPassword = sha256Hash(credentials.password);

    if (
      !user ||
      hashedPassword.toLowerCase() !== user.password_hash.toLowerCase()
    ) {
      e.reply(channels.error, "Invalid email and password combination");
    } else {
      global.farmApp.user = user;
      openWindow(global.farmApp.windows.config.index);
    }
  });

  ipcMain.on(channels.signout, async () => {
    global.farmApp.user = undefined;
    openWindow(global.farmApp.windows.config.login);
    closeAllWindows("login");
  });

  ipcMain.on(channels.signup, async (e, user) => {
    console.info("Attempting to sign user up:", user.email);
    const { results } = await global.farmApp.database.getUserByEmail(
      user.email
    );

    if (results[0]) {
      console.info("User already exists. Cannot signup");
      e.reply(channels.error, "Email already reigstered");
    } else {
      console.info(
        "User does not exist. Hashing pass and inserting them into the DB"
      );
      const hashedPassword = sha256Hash(user.password_hash);
      await global.farmApp.database.insertEntity(
        {
          ...user,
          password_hash: hashedPassword,
        },
        "users"
      );

      console.info("Setting current user to user that we just inserted");
      global.farmApp.user = (
        await global.farmApp.database.getUserByEmail(user.email)
      ).results[0];
      openWindow(global.farmApp.windows.config.index);
    }
  });
}

function setupDatabase() {
  console.info("Checking if db is setup");
  if (!global.farmApp.database) {
    console.info("DB is not setup");
    console.info("Beginning read of package.json's mysql configuration");

    const packageJsonObject = JSON.parse(
      readFileSync(path.resolve(__dirname, "../package.json"))
    );

    console.info("Performing sanitfy checks on package.json");
    assert(
      packageJsonObject.config,
      "No 'config' entry found in package.json!"
    );
    assert(
      packageJsonObject.config.mysql,
      "No 'mysql' entry within 'config' object in package.json!"
    );

    const { username, password, database, host } =
      packageJsonObject.config.mysql;
    assert(
      packageJsonObject.config.mysql.username,
      "No 'username' entry found within 'mysql' configuration!"
    );
    assert(
      packageJsonObject.config.mysql.password,
      "No 'password' entry found within 'mysql' configuration!"
    );
    assert(
      packageJsonObject.config.mysql.database,
      "No 'database' entry found within 'mysql' configuration!"
    );

    const port = parseInt(packageJsonObject.config.mysql.port);
    console.info(
      "Attempting connection to database using the following parameters"
    );
    console.info(`username:${username}`);
    console.info(`password:${password}`);
    console.info(`database:${database}`);
    console.info(`port:${port}`);
    console.info(`host:${host}`);

    global.farmApp.database = new Database({
      username,
      password,
      database,
      port,
      host,
    });

    console.info("Successfully connected to db", database);
  }
}

function openWindow(windowConfig) {
  console.info(
    `Attempting to open ${windowConfig.name} window. Checking if window is already open`
  );

  if (!global.farmApp.windows[windowConfig.name]) {
    console.info(
      `${windowConfig.name} is not opened already. Created and showing`
    );
    let window = (global.farmApp.windows[windowConfig.name] = new BrowserWindow(
      {
        ...global.farmApp.browserWindowDefaults,
      }
    ));

    window.removeMenu();

    window.on("close", () => {
      if (windowConfig.onClose) {
        windowConfig.onClose(window);
      }
    });

    window.webContents.on("did-finish-load", async () => {
      closeAllWindowsExcept(windowConfig.name);

      if (windowConfig.onFinishLoad) {
        windowConfig.onFinishLoad(window);
      }

      window.show();
    });

    window.loadFile(path.resolve("file://", __dirname, ...windowConfig.view));

    if (argv.showDevTools) {
      window.webContents.openDevTools();
    }
  } else {
    console.info(`${windowConfig.name} is already opened`);
  }
}

function closeAllWindowsExcept(exception) {
  for (const key in global.farmApp.windows.instances) {
    if (
      key !== exception &&
      global.farmApp.windows[key] !== null &&
      global.farmApp.windows[key] !== undefined
    ) {
      console.info("Closing", key, "window");
      global.farmApp.windows[key].close();
      global.farmApp.windows[key] = null;
    }
  }
}

function main() {
  closeAllWindowsExcept("error");
  console.info("Running main");
  console.info("Checking if a user is currently logged in");
  if (global.farmApp.user) {
    console.info("User is logged in");
    openWindow(global.farmApp.windows.config.index);
  } else {
    console.info("No user is logged in");
    openWindow(global.farmApp.windows.config.login);
  }
}

app.on("ready", () => {
  setupDatabase();
  setupIpcMainMessageHandlers();
  main();
});

app.on("window-all-closed", () => {
  console.info("All windows closed. Quitting application");
  app.quit();
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception: ", error);
  console.error("Opening up error window");
  global.farmApp.error = error.stack;
  openWindow(global.farmApp.windows.config.error);
});
