// ===============================
// STORED CREDENTIALS (FOR DEMO)
// ===============================
const correctUsername = "admin";
const correctPassword = "user";

// ===============================
// GET ELEMENTS
// ===============================
const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("errorMessage");
const togglePassword = document.getElementById("togglePassword");

// ===============================
// SHOW / HIDE PASSWORD FUNCTION
// ===============================
togglePassword.addEventListener("click", () => {
  // Check current type
  if (passwordInput.type === "password") {
    passwordInput.type = "text"; // show password
  } else {
    passwordInput.type = "password"; // hide password
  }
});

// ===============================
// GET STORED USER (from signup)
// ===============================
let storedUser = JSON.parse(localStorage.getItem("user"));

// ===============================
// LOGIN VALIDATION
// ===============================
form.addEventListener("submit", function (e) {
  e.preventDefault();

  let username = usernameInput.value.trim();
  let password = passwordInput.value.trim();

  if (username === "" || password === "") {
    errorMessage.textContent = "Please fill in all fields.";
    return;
  }

  // If login is correct
  if (
    storedUser &&
    username === storedUser.username &&
    password === storedUser.password
  ) {
    alert("Login Successful!");

    // Save login session
    localStorage.setItem("isLoggedIn", "true");

    // Redirect to dashboard
    window.location.href = "dashboard.html";
  } else {
    errorMessage.textContent = "Invalid username or password.";
  }
});
