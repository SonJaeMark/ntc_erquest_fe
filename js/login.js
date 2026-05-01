import { login } from "./apiClient/authApi.js";

document.addEventListener("DOMContentLoaded", () => {

  // ============================================================
  // CONSTANTS & CONFIGURATION
  // ============================================================

  const AUTH_TOKEN_KEY = "ntc_access_token";
  const AUTH_REFRESH_KEY = "ntc_refresh_token";
  const AUTH_ROLE_KEY = "ntc_user_role";
  const form = document.getElementById("login-form");
  const submitBtn = document.getElementById("submit-btn");
  const btnText = document.getElementById("btn-text");
  const errorEl = document.getElementById("login-error");

  if (!form) return;

  // ============================================================
  // AUTO-REDIRECT IF LOGGED IN
  // ============================================================
  const existingToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
  const existingRole = sessionStorage.getItem(AUTH_ROLE_KEY);

  if (existingToken && existingRole) {
    try {
      const role = String(existingRole).trim().toUpperCase();
      if (role === "STUDENT") {
        window.location.replace("student-dashboard.html");
        return;
      }
      if (role === "ADMIN" || role === "REGISTRAR") {
        window.location.replace("registrar-dashboard.html");
        return;
      }
    } catch (e) {
      sessionStorage.clear();
      localStorage.clear();
    }
  }

  // ============================================================
  // HELPERS: Loading state
  // ============================================================

  const setLoading = () => {
    submitBtn.disabled = true;
    btnText.textContent = "Signing in...";
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.id = "btn-spinner";
    submitBtn.prepend(spinner);
  };

  const resetLoading = () => {
    submitBtn.disabled = false;
    btnText.textContent = "Sign In";
    const spinner = document.getElementById("btn-spinner");
    if (spinner) spinner.remove();
  };

  const showError = (message) => {
    errorEl.textContent = message || "Invalid email or password. Please try again.";
    errorEl.classList.remove("hidden");
  };

  const hideError = () => {
    errorEl.classList.add("hidden");
  };

  // ============================================================
  // HELPERS: Auth
  // ============================================================

  const getRoleFromResponse = (data) => {
    const rawRole =
      data?.role ??
      data?.user?.role ??
      data?.data?.role ??
      data?.accountType ??
      "";
    return String(rawRole).trim().toUpperCase();
  };

  const storeAuthData = (data) => {
    sessionStorage.setItem(AUTH_TOKEN_KEY, data.accessToken);
    localStorage.setItem(AUTH_REFRESH_KEY, data.refreshToken);
    sessionStorage.setItem("userId", data.userId);
    sessionStorage.setItem("email", data.email);
    sessionStorage.setItem("role", data.role);
    sessionStorage.setItem(AUTH_ROLE_KEY, data.role);
  };

  const redirectByRole = (role) => {
    switch (role) {
      case "STUDENT":
        window.location.replace("student-dashboard.html");
        return;
      case "ADMIN":
      case "REGISTRAR":
        window.location.replace("registrar-dashboard.html");
        return;
      default:
        throw new Error(`Unknown role returned by API: ${role || "empty response"}`);
    }
  };

  // ============================================================
  // FORM SUBMISSION
  // ============================================================

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError();
    setLoading();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const data = await login(email, password);

      if (!data || !data.accessToken) {
        throw new Error("Invalid response from server. Please try again.");
      }

      const role = getRoleFromResponse(data);
      storeAuthData(data);
      redirectByRole(role);
    } catch (error) {
      console.error("Login error:", error.message);
      showError("Invalid email or password. Please try again.");
      resetLoading();
    }
  });

});
