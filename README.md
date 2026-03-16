# Ultron AI Assistant

A high-performance AI personal assistant for carrying out local and browser-side commands instantly.

---

## 🛡️ Architecture & Security
This project is built with **100% Decoupled Discrete Microservices** layout architecture to prevent source code leaks and separate Static and API logic boundaries:

*   **`frontend/` (Port 3000)**: Serves pure Static Files (HTML, JS Module Assets, CSS templates). It is completely stateless and handles browser interactions only.
*   **`backend/` (Port 5000)**: Serves structure API endpoint streams ONLY. No HTML static exposure, fully rate-limited, and safe directory sanitization controls.

---

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Environment variables**:
   Create a `.env` inside `backend/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. **Run Services**:
   Simply run standard startup at the root folder to spawn both servers concurrently:
   ```bash
   npm run dev
   ```