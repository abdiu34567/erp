// =================================================================
//          YeneHealth Bot Mini App - Direct API
//                (Final, Complete Script)
// =================================================================

// --- 1. Configuration & Initialization ---

// IMPORTANT: Set this to your new Google Apps Script Web App URL
const GAS_API_URL =
  "https://script.google.com/macros/s/AKfycbxFvFa1SrJ3bt677bIHd5NkvgML3SaqvBHHtsKLiXPY_l_TK16ZSOJfGlE4E4QT0KVj/exec";

// Initialize the Telegram Mini App SDK
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // Make the Mini App full-height

// Get user info from Telegram to identify them in API calls
const initData = tg.initDataUnsafe || {};
const chatId = initData.user ? initData.user.id : null;

// --- 2. UI Element References ---
const loadingView = document.getElementById("loading-view");
const configView = document.getElementById("config-view");
const mainView = document.getElementById("main-view");
const welcomeMessage = document.getElementById("welcome-message");
const remindersEnabledCheckbox = document.getElementById("reminders-enabled");
const reminderTimesDiv = document.getElementById("reminder-times");

// --- 3. UI Control Functions ---

function showView(viewName) {
  loadingView.classList.add("hidden");
  configView.classList.add("hidden");
  mainView.classList.add("hidden");

  const view = document.getElementById(`${viewName}-view`);
  if (view) view.classList.remove("hidden");
}

function populateUi(config) {
  if (config.employeeName) {
    welcomeMessage.innerText = `Welcome, ${config.employeeName.split(" ")[0]}!`;
  }
  const reminders = config.reminders || {};
  remindersEnabledCheckbox.checked = reminders.enabled || false;
  reminderTimesDiv.classList.toggle(
    "hidden",
    !remindersEnabledCheckbox.checked
  );

  if (reminders.times) {
    document.getElementById("time-morning").value = reminders.times.morning;
    document.getElementById("time-lunch-out").value = reminders.times.lunchOut;
    document.getElementById("time-lunch-in").value = reminders.times.lunchIn;
    document.getElementById("time-evening").value = reminders.times.evening;
  }
}

// --- 4. API Communication ---

async function sendApiRequest(payload) {
  // Add the user's chat ID to every request so the back-end knows who it is
  payload.chatId = chatId;

  // Show a loading indicator on Telegram's main button
  tg.MainButton.setText("Processing...").show().showProgress();

  try {
    const response = await fetch(GAS_API_URL, {
      method: "POST",
      mode: "cors", // Essential for cross-origin requests
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow", // Important for GAS web apps
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    return await response.json(); // Return the JSON data from the server
  } catch (error) {
    console.error("API Request Failed:", error);
    tg.showAlert(`An error occurred: ${error.message}`);
    return { success: false, error: error.message }; // Return a standard error object
  } finally {
    // Always hide the loading indicator
    tg.MainButton.hideProgress().hide();
  }
}

// --- 5. Event Listeners ---

// Handle the "Save and Continue" button in the config view
document
  .getElementById("save-config-btn")
  .addEventListener("click", async () => {
    const email = document.getElementById("email-input").value;
    const password = document.getElementById("password-input").value;

    if (!email || !password) {
      tg.showAlert("Please enter both email and password.");
      return;
    }

    const response = await sendApiRequest({
      action: "save_config",
      email: email,
      password: password,
    });

    if (response && response.success) {
      tg.showAlert("Configuration saved successfully!", () => {
        // After user clicks OK on the alert, update the UI
        populateUi(response.config);
        showView("main");
      });
    } else {
      tg.showAlert(
        `Failed to save: ${response ? response.error : "Unknown error"}`
      );
    }
  });

// Handle the main action buttons
document.getElementById("checkin-btn").addEventListener("click", async () => {
  const response = await sendApiRequest({ action: "checkin" });
  if (response && response.success) {
    tg.showAlert("You have been checked in. You can now close this window.");
    tg.close();
  } else {
    tg.showAlert(
      `Check-in failed: ${response ? response.error : "Unknown error"}`
    );
  }
});

document.getElementById("checkout-btn").addEventListener("click", async () => {
  const response = await sendApiRequest({ action: "checkout" });
  if (response && response.success) {
    tg.showAlert("You have been checked out. You can now close this window.");
    tg.close();
  } else {
    tg.showAlert(
      `Check-out failed: ${response ? response.error : "Unknown error"}`
    );
  }
});

// Handle "Fill in My Missing Times"
document.getElementById("reconcile-btn").addEventListener("click", async () => {
  const response = await sendApiRequest({ action: "reconcile" });
  // The bot will send a message back in the chat, so we just show the response here
  tg.showAlert(response.message || response.error);
});

// Handle "Update Credentials"
document.getElementById("update-creds-btn").addEventListener("click", () => {
  showView("config");
});

// Handle saving reminder settings
async function saveSettings() {
  const settings = {
    enabled: remindersEnabledCheckbox.checked,
    times: {
      morning: document.getElementById("time-morning").value,
      lunchOut: document.getElementById("time-lunch-out").value,
      lunchIn: document.getElementById("time-lunch-in").value,
      evening: document.getElementById("time-evening").value,
    },
  };

  // Send to back-end but don't wait or show a blocking alert
  sendApiRequest({ action: "save_settings", settings });
  tg.HapticFeedback.notificationOccurred("success"); // Give subtle feedback
}

remindersEnabledCheckbox.addEventListener("change", () => {
  reminderTimesDiv.classList.toggle(
    "hidden",
    !remindersEnabledCheckbox.checked
  );
  saveSettings();
});
["time-morning", "time-lunch-out", "time-lunch-in", "time-evening"].forEach(
  (id) => {
    document.getElementById(id).addEventListener("change", saveSettings);
  }
);

// --- 6. App Initialization ---
async function initializeApp() {
  if (!chatId) {
    tg.showAlert(
      "Could not identify Telegram user. Please open this app from the bot's menu button."
    );
    showView("config"); // Show config as a fallback
    return;
  }

  // Instead of getting config from the URL, we now fetch it from our API
  const response = await sendApiRequest({ action: "get_config" });

  if (response && response.success && response.config.credentials) {
    // User is configured, show the main view
    populateUi(response.config);
    showView("main");
  } else {
    // New user, or failed to get config, show the config/login view
    showView("config");
  }
}

// Run the app initialization
initializeApp();
