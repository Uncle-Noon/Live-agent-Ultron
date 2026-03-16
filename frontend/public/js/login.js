/**
 * login.js — entry point for the login page.
 */
import { setEmail, currentEmail } from './modules/auth.js';
import { login } from './modules/api.js';

const form      = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const loginBtn  = document.getElementById('loginBtn');
const statusEl  = document.getElementById('loginStatus');

// Pre-fill if already logged in
const saved = currentEmail();
if (saved) emailInput.value = saved;

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
    window.location.href = '/';
  } catch (err) {
    statusEl.textContent = 'Sign-in failed: ' + err.message;
    statusEl.style.color = '#f87171';
    loginBtn.disabled = false;
  }
});
