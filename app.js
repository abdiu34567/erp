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
  const email = document.getElementById("email-input").value;
  const password = document.getElementById("password-input").value;

  if (!email || !password) {
    tg.showAlert("Please enter both email and password.");
    return;
  }

  tg.showConfirm(
    "Are you sure you want to save these credentials?",
    (isConfirmed) => {
      if (isConfirmed) {
        // Send data to the bot back-end to be saved
        tg.sendData(JSON.stringify({ action: "save_config", email, password }));
        // We assume the back-end will reply with a message and then we close.
        // A more advanced app would wait for a success response.
        tg.showAlert("Credentials saved! The app will now reload.");
        // Reload the mini app to fetch the new state
        window.location.reload();
      }
    }
  );
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
