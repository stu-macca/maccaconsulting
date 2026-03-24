import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import {
  applyBranding,
  buildRedirectUrl,
  clearSensitiveUrlState,
  ensureAuthConfig,
  getAppContext,
  getAuthConfig,
  getNextStepCopy,
  getPageCopy,
  getPasswordValidationErrors,
  readRedirectError,
  setDocumentTitle,
  showNotice
} from "./auth-shared.js";

const pageType = document.body.dataset.authPage;
const appContext = getAppContext();
const copy = getPageCopy(pageType, appContext);
const config = getAuthConfig();

const titleElement = document.getElementById("auth-title");
const subtitleElement = document.getElementById("auth-subtitle");
const noticeElement = document.getElementById("auth-notice");
const loadingPanel = document.getElementById("auth-loading-panel");
const loadingTitle = document.getElementById("auth-loading-title");
const loadingMessage = document.getElementById("auth-loading-message");
const successPanel = document.getElementById("auth-success-panel");
const successTitle = document.getElementById("auth-success-title");
const successMessage = document.getElementById("auth-success-message");
const successNextStep = document.getElementById("auth-success-next-step");
const invalidPanel = document.getElementById("auth-invalid-panel");
const invalidTitle = document.getElementById("auth-invalid-title");
const invalidMessage = document.getElementById("auth-invalid-message");
const retryLink = document.getElementById("auth-invalid-retry-link");
const forgotForm = document.getElementById("forgot-password-form");
const passwordForm = document.getElementById("password-form");
const submitButton = document.getElementById("auth-submit-button");

titleElement.textContent = copy.title;
subtitleElement.textContent = copy.subtitle;
setDocumentTitle(copy.title);
applyBranding(appContext);

let supabase;

try {
  ensureAuthConfig(config);
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: true,
      storageKey: "macca-consulting-shared-auth"
    }
  });
} catch (error) {
  showNotice(noticeElement, error.message, "error");
}

if (pageType === "forgot" && supabase) {
  initialiseForgotPasswordPage();
}

if ((pageType === "reset" || pageType === "set") && supabase) {
  initialisePasswordPage();
}

function initialiseForgotPasswordPage() {
  forgotForm.hidden = false;

  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showNotice(noticeElement, "");

    const formData = new FormData(forgotForm);
    const email = String(formData.get("email") || "").trim();

    if (!email) {
      showNotice(noticeElement, "Enter your email address.", "error");
      return;
    }

    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    submitButton.textContent = "Sending link...";

    try {
      const redirectTo = buildRedirectUrl(config.resetPasswordUrl, appContext.appId);

      // 🔍 DEBUG LOGS
      console.log("resetPasswordForEmail email:", email);
      console.log("resetPasswordForEmail redirectTo:", redirectTo);
      console.log("Supabase URL:", config.supabaseUrl);

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      console.log("Supabase response:", { data, error });

      if (error) {
        console.error("Supabase resetPasswordForEmail error:", error);
        throw error;
      }

      forgotForm.reset();

      showSuccessPanel(
        copy.successTitle,
        copy.successMessage,
        "Use the link in the email to choose a new password."
      );

    } catch (error) {
      console.error("Final caught error:", error);

      showNotice(
        noticeElement,
        error?.message || "We could not send the reset email right now. Try again shortly.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.textContent = originalButtonText;
    }
  });
}

async function initialisePasswordPage() {
  passwordForm.hidden = true;
  setLoadingState(true, copy.loadingTitle, "Please wait while we validate your link.");

  const redirectError = readRedirectError();
  if (redirectError) {
    showInvalidState(copy.invalidTitle, redirectError);
    return;
  }

  try {
    const session = await resolveIncomingSession();
    if (!session) {
      showInvalidState(copy.invalidTitle, copy.invalidMessage);
      return;
    }

    clearSensitiveUrlState();
    setLoadingState(false);
    titleElement.textContent = copy.readyTitle;
    passwordForm.hidden = false;
    attachPasswordSubmitHandler();
  } catch (error) {
    showInvalidState(copy.invalidTitle, error?.message || copy.invalidMessage);
  }
}

async function resolveIncomingSession() {
  const recoverySessionPromise = new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(null), 2000);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        window.clearTimeout(timeoutId);
        subscription.unsubscribe();
        resolve(session);
      }
    });

    window.setTimeout(() => subscription.unsubscribe(), 2100);
  });

  if (typeof supabase.auth.initialize === "function") {
    const { error } = await supabase.auth.initialize();
    if (error) {
      throw error;
    }
  } else {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code && typeof supabase.auth.exchangeCodeForSession === "function") {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        throw error;
      }
    }
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session || recoverySessionPromise;
}

function attachPasswordSubmitHandler() {
  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showNotice(noticeElement, "");

    const formData = new FormData(passwordForm);
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const validationErrors = getPasswordValidationErrors(password, confirmPassword);

    if (validationErrors.length > 0) {
      showNotice(noticeElement, validationErrors[0], "error");
      return;
    }

    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
    submitButton.textContent = pageType === "set" ? "Setting password..." : "Updating password...";

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      await supabase.auth.signOut();
      passwordForm.reset();
      showSuccessPanel(copy.successTitle, copy.successMessage, getNextStepCopy(appContext));
      clearSensitiveUrlState();
    } catch (error) {
      showNotice(
        noticeElement,
        error?.message || "We could not update your password. Request a fresh link and try again.",
        "error"
      );
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
      submitButton.textContent = originalButtonText;
    }
  });
}

function setLoadingState(isLoading, titleText = "", messageText = "") {
  if (!loadingPanel) {
    return;
  }

  loadingPanel.hidden = !isLoading;

  if (isLoading) {
    loadingTitle.textContent = titleText;
    loadingMessage.textContent = messageText;
  }
}

function showInvalidState(titleText, messageText) {
  setLoadingState(false);
  invalidTitle.textContent = titleText;
  invalidMessage.textContent = messageText;
  retryLink.href = appContext.appId
    ? `/auth/forgot-password/?app=${encodeURIComponent(appContext.appId)}`
    : "/auth/forgot-password/";
  invalidPanel.hidden = false;
}

function showSuccessPanel(titleText, messageText, nextStepText) {
  setLoadingState(false);
  forgotForm.hidden = true;
  passwordForm.hidden = true;
  invalidPanel.hidden = true;
  successTitle.textContent = titleText;
  successMessage.textContent = messageText;
  successNextStep.textContent = nextStepText;
  successPanel.hidden = false;
}
