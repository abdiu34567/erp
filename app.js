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
  //   const loadingView = document.getElementById("loading-view");
  //   const configView = document.getElementById("config-view");
  //   const mainView = document.getElementById("main-view");
  const welcomeMessage = document.getElementById("welcome-message");
  const remindersEnabledCheckbox = document.getElementById("reminders-enabled");
  const reminderTimesDiv = document.getElementById("reminder-times");
  const cancelUpdateBtn = document.getElementById("cancel-update-btn");

  // --- 3. UI Control Functions ---

  function showView(viewName) {
    // hide both first
    ["config-view", "main-view"].forEach((id) => {
      const el = document.getElementById(id);
      el.classList.add("hidden");
      el.style.display = ""; // ← remove inline override
    });

    // then show the requested one
    const view = document.getElementById(`${viewName}-view`);
    if (view) {
      view.classList.remove("hidden");
      view.style.display = "block"; // or "", whichever you prefer
    }
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

  async function sendApiRequest(payload) {
    payload.chatId = chatId;
    console.log("DEBUG: sendApiRequest started with payload:", payload);

    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      console.log("DEBUG: Fetch response received. Status:", response.status);

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }

      const jsonResponse = await response.json();
      console.log("DEBUG: JSON response parsed:", jsonResponse);
      return jsonResponse;
    } catch (error) {
      console.error("DEBUG: API Request Failed inside sendApiRequest:", error);
      // Re-throw the error to be caught by the calling function's catch block
      throw error;
    }
  }

  // --- 5. Event Listeners ---
  // In app.js

  // --- REVISED save-config-btn listener ---
  document.getElementById("save-config-btn").addEventListener("click", () =>
    withProgress(
      document.getElementById("save-config-btn"),
      async () => {
        const email = document.getElementById("email-input").value;
        const password = document.getElementById("password-input").value;

        if (!email || !password) {
          tg.showAlert("Please enter both email and password.");
          return;
        }

        showLoading("Saving..."); // Show loader

        try {
          const response = await sendApiRequest({
            action: "save_config",
            email: email,
            password: password,
          });

          // IMPORTANT: Hide the loader *before* showing the alert.
          hideLoading();

          if (response && response.success) {
            populateUi(response.config);
            showView("main");
            cancelUpdateBtn.classList.add("hidden");
            showToast("Credentials saved ✔️");
          } else {
            tg.showAlert(
              `Failed to save: ${response ? response.error : "Unknown error"}`
            );
          }
        } catch (error) {
          // Also hide the loader if an error occurs
          hideLoading();
          console.error("Save config failed:", error);
          tg.showAlert(`An error occurred: ${error.message}`);
        }
        // REMOVED the finally block here. We handle hiding in the try/catch blocks.
      },
      "Saving credentials…"
    )
  );

  // --- REVISED checkin-btn listener ---
  document.getElementById("checkin-btn").addEventListener("click", () =>
    withProgress(
      document.getElementById("checkin-btn"),
      async () => {
        showLoading("Checking In...");
        try {
          const response = await sendApiRequest({ action: "checkin" });
          hideLoading(); // Hide before showing the alert

          if (response && response.success) {
            // The alert's callback will close the window.
            tg.showAlert(
              "You have been checked in. You can now close this window.",
              () => {
                tg.close();
              }
            );
          } else {
            tg.showAlert(
              `Check-in failed: ${response ? response.error : "Unknown error"}`
            );
          }
        } catch (error) {
          hideLoading();
          tg.showAlert(`An error occurred: ${error.message}`);
        }
      },
      "Checking in…"
    )
  );

  // --- REVISED checkout-btn listener ---
  document.getElementById("checkout-btn").addEventListener("click", async () =>
    withProgress(
      document.getElementById("checkout-btn"),
      async () => {
        showLoading("Checking Out...");
        try {
          const response = await sendApiRequest({ action: "checkout" });
          hideLoading();

          if (response && response.success) {
            tg.showAlert(
              "You have been checked out. You can now close this window.",
              () => {
                tg.close();
              }
            );
          } else {
            tg.showAlert(
              `Check-out failed: ${response ? response.error : "Unknown error"}`
            );
          }
        } catch (error) {
          hideLoading();
          tg.showAlert(`An error occurred: ${error.message}`);
        }
      },
      "Checking out…"
    )
  );
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

  // --- 4. Main App Initialization Logic ---
  async function initializeApp() {
    // Start with the spinner visible by default
    showLoading("Initializing...");

    // We will hide all main views initially
    // document.getElementById("config-view").style.display = "none";
    // document.getElementById("main-view").style.display = "none";

    if (!chatId) {
      tg.showAlert(
        "Could not identify you. Please restart from the bot's menu button."
      );
      // Hide the loader and show an error message or just leave it blank
      hideLoading();
      return;
    }

    try {
      const response = await sendApiRequest({ action: "get_config" });

      if (response && response.success && response.config.credentials) {
        populateUi(response.config);
        showView("main"); // showView still uses classes, which is fine for the sections
      } else {
        showView("config");
      }
    } catch (error) {
      tg.showAlert(`Failed to load your profile: ${error.message}`);
      showView("config"); // Show config as a fallback
    } finally {
      // This will now correctly hide the overlay after everything is done.
      hideLoading();
    }
  }

  function showToast(msg, duration = 2000) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show", "toast"); // ensure base class exists
    setTimeout(() => toast.classList.remove("show"), duration);
    tg.HapticFeedback.notificationOccurred("success"); // nice subtle buzz
  }

  async function withProgress(btn, task, loadingText = "Processing…") {
    btn.disabled = true;
    btn.classList.add("loading");
    const original = btn.innerHTML;
    btn.innerHTML = `<span class="spinner btn-spinner"></span>`;

    try {
      showLoading(loadingText); // ONE place where we show it
      return await task(); // run caller-supplied async work
    } finally {
      hideLoading(); // ONE place where we hide it
      btn.disabled = false;
      btn.classList.remove("loading");
      btn.innerHTML = original;
    }
  }

  function showLoading(message = "Processing…") {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.querySelector("p").innerText = message;
    overlay.classList.add("show");
  }

  function hideLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (!overlay) return;
    overlay.classList.remove("show");
  }

  // Run the app initialization
  initializeApp();
});
