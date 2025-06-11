// =================================================================
//          YeneHealth Bot Mini App - Direct API
//                (Final, Complete Script)
// =================================================================

document.addEventListener("DOMContentLoaded", function () {
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
  const cancelUpdateBtn = document.getElementById("cancel-update-btn");

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
      welcomeMessage.innerText = `Welcome, ${
        config.employeeName.split(" ")[0]
      }!`;
    }
    const reminders = config.reminders || {};
    remindersEnabledCheckbox.checked = reminders.enabled || false;
    reminderTimesDiv.classList.toggle(
      "hidden",
      !remindersEnabledCheckbox.checked
    );

    if (reminders.times) {
      document.getElementById("time-morning").value = reminders.times.morning;
      document.getElementById("time-lunch-out").value =
        reminders.times.lunchOut;
      document.getElementById("time-lunch-in").value = reminders.times.lunchIn;
      document.getElementById("time-evening").value = reminders.times.evening;
    }
  }

  // --- 4. API Communication ---

  // In app.js
  async function sendApiRequest(payload) {
    payload.chatId = chatId;
    // This function NO LONGER shows or hides the loader.

    const response = await fetch(GAS_API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    return await response.json(); // Let the caller handle this response.
  }

  // --- 5. Event Listeners ---
  // In app.js
  document
    .getElementById("save-config-btn")
    .addEventListener("click", async () => {
      const email = document.getElementById("email-input").value;
      const password = document.getElementById("password-input").value;

      if (!email || !password) {
        tg.showAlert("Please enter both email and password.");
        return;
      }

      showLoading("Saving..."); // Show loader before we start

      try {
        const response = await sendApiRequest({
          action: "save_config",
          email: email,
          password: password,
        });

        if (response && response.success) {
          tg.showAlert("Configuration saved successfully!", () => {
            populateUi(response.config);
            showView("main");
            cancelUpdateBtn.classList.add("hidden");
          });
        } else {
          tg.showAlert(
            `Failed to save: ${response ? response.error : "Unknown error"}`
          );
        }
      } catch (error) {
        console.error("Save config failed:", error);
        tg.showAlert(`An error occurred: ${error.message}`);
      } finally {
        // This block is GUARANTEED to run.
        hideLoading();
      }
    });
  // Handle the main action buttons
  // --- REVISED checkin-btn listener ---
  document.getElementById("checkin-btn").addEventListener("click", async () => {
    showLoading("Checking In..."); // <-- Show loader HERE
    const response = await sendApiRequest({ action: "checkin" });
    hideLoading(); // <-- Hide loader HERE

    if (response && response.success) {
      tg.showAlert("You have been checked in. You can now close this window.");
      tg.close();
    } else {
      tg.showAlert(
        `Check-in failed: ${response ? response.error : "Unknown error"}`
      );
    }
  });

  document
    .getElementById("checkout-btn")
    .addEventListener("click", async () => {
      const response = await sendApiRequest({ action: "checkout" });
      if (response && response.success) {
        tg.showAlert(
          "You have been checked out. You can now close this window."
        );
        tg.close();
      } else {
        tg.showAlert(
          `Check-out failed: ${response ? response.error : "Unknown error"}`
        );
      }
    });

  // --- New event listener for the cancel button ---
  cancelUpdateBtn.addEventListener("click", () => {
    // Simply go back to the main view without saving anything
    showView("main");
  });

  // Handle "Fill in My Missing Times"
  document
    .getElementById("reconcile-btn")
    .addEventListener("click", async () => {
      const response = await sendApiRequest({ action: "reconcile" });
      // The bot will send a message back in the chat, so we just show the response here
      tg.showAlert(response.message || response.error);
    });

  // Handle "Update Credentials"
  document.getElementById("update-creds-btn").addEventListener("click", () => {
    showView("config");
    cancelUpdateBtn.classList.remove("hidden");
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

  async function initializeApp() {
    if (!chatId) {
      tg.showAlert(
        "Could not identify user. Please open this app from the bot's menu button."
      );
      showView("config");
      return;
    }

    showLoading("Loading your profile..."); // Show loader before we start

    try {
      const response = await sendApiRequest({ action: "get_config" });

      if (response && response.success && response.config.credentials) {
        populateUi(response.config);
        showView("main");
      } else {
        showView("config");
        cancelUpdateBtn.classList.add("hidden");
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      tg.showAlert(`Failed to load your profile: ${error.message}`);
      showView("config"); // Show config view on error
    } finally {
      // This block is GUARANTEED to run.
      hideLoading();
    }
  }
  // --- In app.js ---

  const loadingOverlay = document.getElementById("loading-overlay");

  function showLoading(message = "Processing...") {
    loadingOverlay.querySelector("p").innerText = message;
    loadingOverlay.classList.remove("hidden");
    tg.MainButton.hide(); // Hide the default button to avoid confusion
  }

  function hideLoading() {
    loadingOverlay.classList.add("hidden");
  }

  // Run the app initialization
  initializeApp();
});
