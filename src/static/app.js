document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");
  const userIconBtn = document.getElementById("user-icon-btn");
  const userMenu = document.getElementById("user-menu");
  const openLoginBtn = document.getElementById("open-login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const teacherStatus = document.getElementById("teacher-status");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginBtn = document.getElementById("close-login-btn");

  let teacherLoggedIn = false;
  let teacherUsername = null;

  function setTeacherUiState() {
    if (teacherLoggedIn) {
      signupContainer.classList.remove("hidden");
      logoutBtn.classList.remove("hidden");
      openLoginBtn.classList.add("hidden");
      teacherStatus.textContent = `Logged in as ${teacherUsername}`;
    } else {
      signupContainer.classList.add("hidden");
      logoutBtn.classList.add("hidden");
      openLoginBtn.classList.remove("hidden");
      teacherStatus.textContent = "Not logged in";
    }
  }

  async function fetchAuthStatus() {
    const response = await fetch("/auth/status");
    const authStatus = await response.json();
    teacherLoggedIn = authStatus.logged_in;
    teacherUsername = authStatus.username;
    setTeacherUiState();
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginForm.reset();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        teacherLoggedIn
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      if (teacherLoggedIn) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userIconBtn.addEventListener("click", () => {
    userMenu.classList.toggle("hidden");
  });

  openLoginBtn.addEventListener("click", () => {
    userMenu.classList.add("hidden");
    openLoginModal();
  });

  closeLoginBtn.addEventListener("click", closeLoginModal);

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  document.addEventListener("click", (event) => {
    if (!userMenu.contains(event.target) && event.target !== userIconBtn) {
      userMenu.classList.add("hidden");
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("teacher-username").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      teacherLoggedIn = true;
      teacherUsername = result.username;
      setTeacherUiState();
      closeLoginModal();
      fetchActivities();
      showMessage("Teacher login successful", "success");
    } catch (error) {
      showMessage("Failed to login. Please try again.", "error");
      console.error("Login error:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
      teacherLoggedIn = false;
      teacherUsername = null;
      setTeacherUiState();
      fetchActivities();
      userMenu.classList.add("hidden");
      showMessage("Logged out", "success");
    } catch (error) {
      showMessage("Failed to logout. Please try again.", "error");
      console.error("Logout error:", error);
    }
  });

  // Initialize app
  fetchAuthStatus().finally(fetchActivities);
});
