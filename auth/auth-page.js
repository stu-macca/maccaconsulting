document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("auth-retired-message");
  if (status) {
    status.textContent = "This website no longer uses a website-managed app sign-in or reset flow. Please return to the Tools page for current product availability.";
  }
});
