# Ultron AI Assistant

A high-performance AI personal assistant for carrying out local and browser-side commands instantly.

---

## 🛡️ Architecture & Security
This project is built with **100% Decoupled Discrete Microservices** layout architecture to prevent source code leaks and separate Static and API logic boundaries:

*   **`frontend/`: Serves pure Static Files (HTML, JS Module Assets, CSS templates). It is completely stateless and handles browser interactions only.
*   **`backend/`: Serves structure API endpoint streams ONLY. No HTML static exposure, fully rate-limited, and safe directory sanitization controls.

---

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment variables**:
   Open the `.env` file inside the root directory and paste your own Gemini API key in place of `YOUR_GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   ```
3. **Run Services**:
   Simply run standard startup at the root folder to spawn both servers concurrently:
   ```bash
   npm run dev
   ```