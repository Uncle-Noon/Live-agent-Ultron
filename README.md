# Ultron AI Assistant

A high-performance AI personal assistant for carrying out local and browser-side commands instantly.

---

## 🛡️ Architecture & Security
This project is built with **100% Decoupled Discrete Microservices** layout architecture to prevent source code leaks and separate Static and API logic boundaries:

*   **`frontend/`: Serves pure Static Files (HTML, JS Module Assets, CSS templates). It is completely stateless and handles browser interactions only.
*   **`backend/`: Serves structure API endpoint streams ONLY. No HTML static exposure, fully rate-limited, and safe directory sanitization controls.

---

## 🚀 Quick Start

1. **Clone the Repository**:
   ```bash
   git clone <your-repo-url>
   cd Live-agent-Ultron
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Services**:
   Simply run standard startup at the root folder to spawn both servers concurrently:
   ```bash
   npm run dev
   ```
4. **Open in Browser**:
   Control + Click the link in the terminal or open `http://localhost:3000` to get into business.

---

> [!IMPORTANT]
> A `.env` file is included in the project. Make sure to paste your own Gemini API key into the `GEMINI_API_KEY` field before running the app.
