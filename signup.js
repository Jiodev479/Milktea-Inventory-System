// ─── ELEMENTS ─────────────────────────────────────────────
const signupForm = document.getElementById("signupForm");
const newUsername = document.getElementById("newUsername");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const signupError = document.getElementById("signupError");

// ─── TOGGLE PASSWORD VISIBILITY ───────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isText = input.type === "text";
  input.type = isText ? "password" : "text";
  // swap icon opacity to hint state
  btn.style.opacity = isText ? "0.55" : "1";
}

// ─── PASSWORD STRENGTH ────────────────────────────────────
function checkStrength() {
  const pw = newPassword.value;
  const wrap = document.getElementById("strengthWrap");
  const fill = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");

  if (!pw) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "flex";

  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { pct: "20%", color: "#ef4444", text: "Weak" },
    { pct: "40%", color: "#f59e0b", text: "Fair" },
    { pct: "60%", color: "#f59e0b", text: "Fair" },
    { pct: "80%", color: "#22c55e", text: "Good" },
    { pct: "100%", color: "#22c55e", text: "Strong" },
  ];
  const lvl = levels[Math.min(score - 1, 4)] || levels[0];
  fill.style.width = lvl.pct;
  fill.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

// ─── SIGNUP VALIDATION ────────────────────────────────────
signupForm.addEventListener("submit", function (e) {
  e.preventDefault();
  signupError.textContent = "";

  const username = newUsername.value.trim();
  const password = newPassword.value.trim();
  const confirm = confirmPassword.value.trim();

  if (!username || !password || !confirm) {
    signupError.textContent = "All fields are required.";
    return;
  }
  if (username.length < 3) {
    signupError.textContent = "Username must be at least 3 characters.";
    return;
  }
  if (password.length < 5) {
    signupError.textContent = "Password must be at least 5 characters.";
    return;
  }
  if (password !== confirm) {
    signupError.textContent = "Passwords do not match.";
    return;
  }

  // Save user
  localStorage.setItem("user", JSON.stringify({ username, password }));
  alert("Account created successfully! Please sign in.");
  window.location.href = "signin.html";
});
