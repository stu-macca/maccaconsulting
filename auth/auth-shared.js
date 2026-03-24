export const APP_METADATA = {
  "droptext-pdf": {
    name: "DropText PDF",
    iconPath: "/assets/apps/pdf-editor/icon-256.png",
    iconAlt: "DropText PDF app icon"
  },
  "submissions-pdf": {
    name: "Submissions PDF",
    iconPath: "/assets/apps/submissions-pdf/icon-256.png",
    iconAlt: "Submissions PDF app icon"
  }
};

const GENERIC_APP = {
  appId: "",
  name: "",
  iconPath: "",
  iconAlt: ""
};

const GENERIC_COPY = {
  forgot: {
    title: "Reset your password",
    subtitle: "Enter the email address you use to sign in and we will send you a secure reset link.",
    submitLabel: "Send reset link",
    successTitle: "Check your email",
    successMessage: "If that email is registered, you will receive a password reset link shortly."
  },
  reset: {
    title: "Reset your password",
    subtitle: "Choose a new password for your account.",
    submitLabel: "Update password",
    successTitle: "Password updated",
    successMessage: "Your password has been updated successfully.",
    readyTitle: "Choose a new password",
    loadingTitle: "Validating your reset link",
    invalidTitle: "This reset link is invalid or expired",
    invalidMessage: "Request a fresh reset link and try again."
  },
  set: {
    title: "Set your password",
    subtitle: "Choose a password to finish setting up your account.",
    submitLabel: "Set password",
    successTitle: "Password set",
    successMessage: "Your password has been set successfully.",
    readyTitle: "Choose your password",
    loadingTitle: "Validating your setup link",
    invalidTitle: "This setup link is invalid or expired",
    invalidMessage: "Request a fresh setup link and try again."
  }
};

export function sanitizeAppId(value) {
  if (!value) {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,64}$/.test(normalized) ? normalized : "";
}

export function getAppContext() {
  const searchParams = new URLSearchParams(window.location.search);
  const appId = sanitizeAppId(searchParams.get("app"));
  const knownApp = appId ? APP_METADATA[appId] : null;

  return {
    appId,
    isKnown: Boolean(knownApp),
    ...(knownApp || GENERIC_APP)
  };
}

export function getAuthConfig() {
  const config = window.AUTH_CONFIG || {};

  return {
    supabaseUrl: typeof config.supabaseUrl === "string" ? config.supabaseUrl.trim() : "",
    supabaseAnonKey: typeof config.supabaseAnonKey === "string" ? config.supabaseAnonKey.trim() : "",
    resetPasswordUrl: typeof config.resetPasswordUrl === "string" ? config.resetPasswordUrl.trim() : "",
    setPasswordUrl: typeof config.setPasswordUrl === "string" ? config.setPasswordUrl.trim() : ""
  };
}

export function ensureAuthConfig(config) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Shared auth is not configured yet. Add the Supabase URL and anon key in /auth/auth-config.js.");
  }
}

export function buildRedirectUrl(baseUrl, appId) {
  if (!baseUrl) {
    throw new Error("The reset password redirect URL is not configured.");
  }

  const resolvedUrl = new URL(baseUrl, window.location.origin);
  if (appId) {
    resolvedUrl.searchParams.set("app", appId);
  }

  return resolvedUrl.toString();
}

export function getPageCopy(pageType, appContext) {
  const baseCopy = GENERIC_COPY[pageType];
  if (!baseCopy) {
    throw new Error(`Unknown auth page type: ${pageType}`);
  }

  if (!appContext.isKnown) {
    return baseCopy;
  }

  const appName = appContext.name;

  if (pageType === "forgot") {
    return {
      ...baseCopy,
      title: `Reset your ${appName} password`,
      subtitle: `Enter the email address you use to sign in to ${appName} and we will send you a secure reset link.`
    };
  }

  if (pageType === "reset") {
    return {
      ...baseCopy,
      title: `Reset your ${appName} password`,
      subtitle: `Choose a new password for your ${appName} account.`,
      readyTitle: `Choose a new ${appName} password`,
      loadingTitle: `Validating your ${appName} reset link`,
      invalidTitle: `This ${appName} reset link is invalid or expired`
    };
  }

  return {
    ...baseCopy,
    title: `Set your ${appName} password`,
    subtitle: `Choose a password to finish setting up your ${appName} account.`,
    readyTitle: `Choose your ${appName} password`,
    loadingTitle: `Validating your ${appName} setup link`,
    invalidTitle: `This ${appName} setup link is invalid or expired`
  };
}

export function getNextStepCopy(appContext) {
  if (appContext.isKnown) {
    return `Return to ${appContext.name} and sign in again.`;
  }

  return "Return to the app and sign in again.";
}

export function getPasswordValidationErrors(password, confirmPassword) {
  const errors = [];

  if (password.length < 8) {
    errors.push("Use at least 8 characters.");
  }

  if (password.trim().length === 0) {
    errors.push("Password cannot be blank.");
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    errors.push("Passwords do not match.");
  }

  return errors;
}

export function readRedirectError() {
  const candidates = [new URLSearchParams(window.location.search)];
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (hash) {
    candidates.push(new URLSearchParams(hash));
  }

  for (const params of candidates) {
    const description = params.get("error_description") || params.get("error");
    if (description) {
      return decodeURIComponent(description.replace(/\+/g, " "));
    }
  }

  return "";
}

export function clearSensitiveUrlState() {
  const currentUrl = new URL(window.location.href);
  const cleanSearch = new URLSearchParams();
  const appId = sanitizeAppId(currentUrl.searchParams.get("app"));

  if (appId) {
    cleanSearch.set("app", appId);
  }

  const cleanUrl = cleanSearch.toString()
    ? `${window.location.pathname}?${cleanSearch.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}

export function setDocumentTitle(title) {
  document.title = `${title} | McMillan Tendering`;
}

export function applyBranding(appContext) {
  const logo = document.getElementById("auth-app-logo");
  const label = document.getElementById("auth-app-label");

  if (!label || !logo) {
    return;
  }

  if (!appContext.isKnown) {
    label.textContent = "Shared account access";
    logo.hidden = true;
    return;
  }

  label.textContent = appContext.name;
  logo.src = appContext.iconPath;
  logo.alt = appContext.iconAlt;
  logo.hidden = false;
}

export function showNotice(element, message, tone = "info") {
  if (!element) {
    return;
  }

  if (!message) {
    element.hidden = true;
    element.textContent = "";
    element.className = "auth-notice";
    return;
  }

  element.hidden = false;
  element.textContent = message;
  element.className = `auth-notice auth-notice-${tone}`;
}
