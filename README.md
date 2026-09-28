# TaskFlow - Hackathon Prototype

TaskFlow is a project management tool equipped with an **AI Team Memory Guard**. It ensures new tasks align with past team decisions, preventing conflicting work.

## Setup Instructions

### 1. Backend (Node.js + Express + SQLite + Gemini)
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file in the `backend` directory and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Start the server (dependencies are already installed):
   ```bash
   node server.js
   ```
   *Note: The SQLite database will automatically create and seed itself with a demo project, 3 tasks, and 1 team decision ("Use MySQL for this project") on the first run.*

### 2. Frontend (React + Vite)
1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Start the dev server (dependencies are already installed):
   ```bash
   npm run dev
   ```
3. Open your browser to the local address provided by Vite (usually `http://localhost:5173`).

## Demo Flow (Under 2 Minutes)
1. The app loads with the seeded "Project Alpha", showing existing tasks in a modern Kanban board.
2. The AI Team Memory Guard is already aware of a seeded team decision: **"Use MySQL for this project"**.
3. Click **+ New Task**.
4. Enter the title: **"Set up a MongoDB database"**.
5. Click **Create Task**.
6. The **AI Team Memory Guard** will intercept the task creation, analyze it against the past decision using the Gemini API, and display an amber warning card explaining the conflict along with a suggested resolution.
7. End on this warning screen — it's the highlight of the pitch!
