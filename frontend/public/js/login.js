/**
 * login.js — entry point for the login page.
 */
import { setEmail, clearEmail, currentEmail } from './modules/auth.js';
import { login } from './modules/api.js';

const form       = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const loginBtn   = document.getElementById('loginBtn');
const statusEl   = document.getElementById('loginStatus');

// Always require login — clear any stored session on page load
clearEmail();

// Pre-fill the email field with the last used address (convenience)
const lastEmail = localStorage.getItem('ultronLastEmail');
if (lastEmail) emailInput.value = lastEmail;

// Enter to login
emailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();

  if (!email || !email.includes('@')) {
    statusEl.textContent = 'Please enter a valid email address.';
    statusEl.style.color = '#f87171';
    return;
  }

  loginBtn.disabled = true;
  statusEl.style.color = 'var(--text-muted)';
  statusEl.textContent = 'Signing in…';

  try {
    await login(email);
    setEmail(email);
    localStorage.setItem('ultronLastEmail', email);
    window.location.href = '/chat';
  } catch (err) {
    statusEl.textContent = 'Sign-in failed: ' + err.message;
    statusEl.style.color = '#f87171';
    loginBtn.disabled = false;
  }
});
