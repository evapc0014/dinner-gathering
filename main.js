/*
 * Christmas Eve Dinner — site script
 *
 * FORM_ENDPOINT: where registrations are sent. FormSubmit (formsubmit.co)
 * emails each registration to the organiser.
 *   - First submission ever sends an activation email; click it once.
 *   - After activation, FormSubmit emails a private random string. Replace the
 *     email address below with it, e.g. "https://formsubmit.co/ajax/abc123...",
 *     so the address is no longer visible in the page source.
 * Leave it empty ("") for demo mode: the form validates and shows a
 * thank-you message, but nothing is sent or stored.
 */
const FORM_ENDPOINT = "https://formsubmit.co/ajax/eva.goh@u-connections.com";

/* ----- Mobile navigation ----- */
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");

toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
  toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
  nav.classList.toggle("open", !open);
});

nav.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    nav.classList.remove("open");
  })
);

/* ----- Registration form ----- */
const form = document.getElementById("register-form");
const statusEl = document.getElementById("form-status");
const submitBtn = document.getElementById("submit-btn");

const rules = {
  name: (v) => (v.trim().length >= 2 ? "" : "Please enter your full name."),
  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Please enter a valid email address.",
  phone: (v) =>
    /^[+0-9 ()-]{7,20}$/.test(v.trim()) ? "" : "Please enter a valid phone number (digits, +, spaces).",
};

function validateField(name) {
  const input = form.elements[name];
  const message = rules[name](input.value);
  const field = input.closest(".field");
  field.classList.toggle("invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
  document.getElementById(`${name}-error`).textContent = message;
  return !message;
}

Object.keys(rules).forEach((name) => {
  form.elements[name].addEventListener("blur", () => validateField(name));
  form.elements[name].addEventListener("input", () => {
    if (form.elements[name].closest(".field").classList.contains("invalid")) validateField(name);
  });
});

// "None" is exclusive with the other food restrictions
const dietBoxes = form.querySelectorAll('input[name="diet"]');
dietBoxes.forEach((box) =>
  box.addEventListener("change", () => {
    if (!box.checked) return;
    dietBoxes.forEach((other) => {
      if (box.value === "None" ? other !== box : other.value === "None") other.checked = false;
    });
  })
);

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = `form-status ${type || ""}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  const results = Object.keys(rules).map(validateField);
  if (results.includes(false)) {
    const firstInvalid = form.querySelector(".field.invalid input");
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const diet = [...dietBoxes].filter((b) => b.checked).map((b) => b.value);
  const payload = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    phone: form.elements.phone.value.trim(),
    food_restriction: diet.length ? diet.join(", ") : "Not specified",
    notes: form.elements.notes.value.trim() || "-",
    _subject: `New registration — Christmas Eve Dinner: ${form.elements.name.value.trim()}`,
    _template: "table",
    _captcha: "false",
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";

  try {
    if (FORM_ENDPOINT) {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || String(data.success) === "false") {
        throw new Error(data.message || `Status ${res.status}`);
      }
    } else {
      console.info("Demo mode — registration not sent. Set FORM_ENDPOINT in main.js.", payload);
      await new Promise((r) => setTimeout(r, 500));
    }
    form.reset();
    setStatus(`Thank you, ${payload.name.split(" ")[0]}! Your seat is reserved. See you on 24 December at 7:00 PM.`, "success");
  } catch (err) {
    console.error(err);
    setStatus("Sorry, something went wrong. Please try again in a moment.", "fail");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Register Now";
  }
});
