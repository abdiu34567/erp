// --- Initialize Telegram Web App SDK ---
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // Make the Mini App full-height

// --- Global State ---
let userConfig = {};

// --- UI Element References ---
const loadingView = document.getElementById("loading-view");
const configView = document.getElementById("config-view");
const mainView = document.getElementById("main-view");
const welcomeMessage = document.getElementById("welcome-message");
const remindersEnabledCheckbox = document.getElementById("reminders-enabled");
const reminderTimesDiv = document.getElementById("reminder-times");

// --- Functions to Control UI Visibility ---
function showView(viewName) {
  loadingView.classList.add("hidden");
  configView.classList.add("hidden");
  mainView.classList.add("hidden");

  if (viewName === "config") {
    configView.classList.remove("hidden");
  } else if (viewName === "main") {
    mainView.classList.remove("hidden");
  } else {
    loadingView.classList.remove("hidden");
  }
}

// --- Function to Populate UI from Config ---
function populateUi() {
  if (userConfig.employeeName) {
    welcomeMessage.innerText = `Welcome, ${
      userConfig.employeeName.split(" ")[0]
    }!`;
  }
  remindersEnabledCheckbox.checked = userConfig.reminders?.enabled || false;
  reminderTimesDiv.classList.toggle(
    "hidden",
    !remindersEnabledCheckbox.checked
  );

  if (userConfig.reminders?.times) {
    document.getElementById("time-morning").value =
      userConfig.reminders.times.morning;
    document.getElementById("time-lunch-out").value =
      userConfig.reminders.times.lunchOut;
    document.getElementById("time-lunch-in").value =
      user.reminders.times.lunchIn;
    document.getElementById("time-evening").value =
      user.reminders.times.evening;
  }
}

// --- Event Handlers ---

// Handle the "Save and Continue" button in the config view
document.getElementById("save-config-btn").addEventListener("click", () => {
  // --- STEP 1: Log that the function started ---
  console.log("Save button clicked! The event listener is working.");

  const email = document.getElementById("email-input").value;
  const password = document.getElementById("password-input").value;

  // --- STEP 2: Log the values you captured ---
  console.log("Email value:", email);
  console.log("Password value:", password);

  if (!email || !password) {
    console.log("Validation failed: Email or password is empty.");
    tg.showAlert("Please enter both email and password.");
    return;
  }

  const dataToSend = { action: "save_config", email, password };
  const dataString = JSON.stringify(dataToSend);

  // --- STEP 3: Log the data just before sending ---
  console.log("Preparing to send data:", dataString);

  try {
    tg.sendData(dataString);
    // --- STEP 4: Log success if sendData didn't crash ---
    console.log("tg.sendData() was called successfully.");
  } catch (e) {
    // --- STEP 5: Log any error during the sendData call ---
    console.error("ERROR calling tg.sendData():", e);
  }
});

// Handle the main action buttons
document.getElementById("checkin-btn").addEventListener("click", () => {
  tg.sendData(JSON.stringify({ action: "checkin" }));
  tg.close();
});
document.getElementById("checkout-btn").addEventListener("click", () => {
  tg.sendData(JSON.stringify({ action: "checkout" }));
  tg.close();
});

// Handle "Fill in My Missing Times"
document.getElementById("reconcile-btn").addEventListener("click", () => {
  tg.sendData(JSON.stringify({ action: "reconcile" }));
  tg.close(); // The bot will send messages back in the chat
});

// Handle "Update Credentials"
document.getElementById("update-creds-btn").addEventListener("click", () => {
  // Just show the config view again
  showView("config");
});

// Handle changes to the reminder settings
remindersEnabledCheckbox.addEventListener("change", () => {
  reminderTimesDiv.classList.toggle(
    "hidden",
    !remindersEnabledCheckbox.checked
  );
  // Automatically save changes when the checkbox is toggled
  saveSettings();
});

// Automatically save changes when a time is changed
["time-morning", "time-lunch-out", "time-lunch-in", "time-evening"].forEach(
  (id) => {
    document.getElementById(id).addEventListener("change", saveSettings);
  }
);

function saveSettings() {
  const settings = {
    enabled: remindersEnabledCheckbox.checked,
    times: {
      morning: document.getElementById("time-morning").value,
      lunchOut: document.getElementById("time-lunch-out").value,
      lunchIn: document.getElementById("time-lunch-in").value,
      evening: document.getElementById("time-evening").value,
    },
  };
  tg.sendData(JSON.stringify({ action: "save_settings", settings }));
  // Maybe show a subtle confirmation
  tg.HapticFeedback.notificationOccurred("success");
}

// --- App Initialization ---
function initializeApp() {
  // The Apps Script back-end needs to pass the user's config data
  // when launching the Mini App. This is done via the launch URL parameters.
  const urlParams = new URLSearchParams(window.location.search);
  const configParam = urlParams.get("config");

  if (configParam) {
    try {
      userConfig = JSON.parse(decodeURIComponent(configParam));
    } catch (e) {
      userConfig = {};
    }
  }

  if (userConfig.credentials) {
    // User is configured, show the main view
    populateUi();
    showView("main");
  } else {
    // New user, show the config/login view
    showView("config");
  }
}

// Run the app initialization
initializeApp();
