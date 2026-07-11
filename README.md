# Vector Shift - Pipeline Builder Submission

Welcome to the **Vector Shift Pipeline Builder** submission. This application is a fully-featured visual node-based workflow editor built with a React frontend and a FastAPI backend. It allows users to design, connect, save, and analyze complex logical DAGs (Directed Acyclic Graphs).

---

## Submission Structure
- `/frontend`: React client containing the visual canvas interface.
- `/backend`: FastAPI Python server containing the database, auth, and DAG validation layers.

---

## Prerequisites
Ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **Python** (v3.9 or higher recommended)
- **npm** (comes packaged with Node.js)

---

## Setup & Running Instructions

### 1. Running the Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install required packages:
   ```bash
   pip install fastapi uvicorn pydantic bcrypt pyjwt resend python-dotenv
   ```
4. Configure environment variables:
   - Rename `.env.example` to `.env`
   - You can configure custom variables (e.g. `RESEND_API_KEY` for email verification, or leave it blank to automatically fallback to Mock print mode).
5. Run the server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
   The backend will be running on `http://localhost:8000`.

### 2. Running the Frontend (React)
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will open in your browser automatically at `http://localhost:3000`.

---

## Key Features & Implementations

### Frontend Highlights
- **Declarative Custom Nodes**: All standard custom nodes are consolidated into a single clean file (`/frontend/src/nodes/standardNodes.js`) using custom reusable field components (`NodeInput`, `NodeDropdown`, `NodeTextareaField`), reducing duplicate boilerplate code by over 50%.
- **Text Node Variable Auto-Spawner**: Typing `{{variable_name}}` inside a Text Node automatically spawns a corresponding input node on the left, titles it, and wires it directly to the target handle of the Text node. Deleting the variable severs the connection wire cleanly.
- **Edge positioning fix**: Implemented a soft-refresh remount of the canvas upon spawning or deleting handles to bypass the React Flow rendering cache and keep connection wires perfectly straight and aligned.
- **Cascading spawn positioning**: Consecutive nodes spawned from the toolbar fan out diagonally instead of stacking directly on top of each other, improving spatial awareness.
- **Custom Branding**: Fully customized layout with custom-drawn mathematical SVG branding.

### Backend Highlights
- **FastAPI Dependency Injection**: Connections to SQLite are managed using a clean context generator `get_db_session()` and injected using `Depends()`. This safely commits transactions on route completion, rolls back on exceptions, and closes connections automatically, preventing DB deadlocks.
- **DAG parsing**: The `/pipelines/parse` endpoint performs a comprehensive depth-first cycle check on pipeline graphs to verify if the layout forms a valid Directed Acyclic Graph (DAG), returning node count, edge count, and DAG validity.
- **Authentication**: Fully-featured auth flow including signup, email verification, login, forgot password resets, and user profile management (including custom geometric avatars).
- **Sandbox Demo Mode**: The application includes a fallback sandbox demo mode allowing users to test pipelines locally without setting up the DB or external APIs.
