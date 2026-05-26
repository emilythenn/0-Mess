# 0-Mess 🎓

A centralized, real-time collaboration and accountability platform tailored for university group assignments. **0-Mess** bridges the coordination gap in student teams by combining synchronized Kanban boards, smart meeting scheduling, anonymous peer review metrics, and an AI workspace helper (using RAG) into a single cohesive dashboard.

---

## 🚀 Key Features

* **Unified Course Workspaces**: Create or join project teams using password-secured group codes.
* **AI & Manual Workload Builder**: Split complex assignment requirements into fair task roles automatically using AI suggestions, or manually configure custom project roles and tasks.
* **Teammate Claim Coordination**: Select and claim workspace roles to dynamically populate personal task checklists on the group Kanban board.
* **Semantic AI Workspace Helper (RAG)**: Upload lecture notes, rubrics, or other files to let the workspace AI parse, index, and answer project-specific queries using vector embeddings.
* **Milestone-Driven Overview**: Keep project completion percentages realistic by focusing overview meters strictly on milestone completions (filtering out minor deadlines or meetings).
* **Anonymous Peer Evaluations**: Submit multi-metric peer reviews (quality, reliability, communication, contribution) to coordinate performance scores anonymously.
* **Academic Student Profiles**: Edit details like matriculation number, siswa/university mail, semester, course, and nationality, displayed in a clean academic grid.
* **Resilient Sync Engine**: Features a fallback caching system that seamlessly shifts to local storage if the database server is unconnected, notifying the team via a top-level error banner.

---

## 🛠️ Technology Stack

### Frontend
* **Core**: React 19 (TypeScript), Vite
* **Styling**: Tailwind CSS
* **Animations**: Framer Motion
* **Icons**: Lucide React

### Backend
* **Runtime & Framework**: Node.js, Express, TypeScript
* **AI Engine**: Google Gemini API (`@google/genai`)
* **File Parser**: Mammoth (DOCX), PDF-Parse (PDF)
* **Replication client**: `@supabase/supabase-js`

### Database & Auth
* **Database**: Supabase (PostgreSQL with `pgvector` for document chunks embeddings)
* **Authentication**: Supabase Auth (JWT session management)

---

## 📂 Project Structure

```
0-Mess/
├── backend/                  # Express server & RAG controller
│   ├── src/
│   │   ├── middleware/       # Token validation check
│   │   ├── modules/          # Config, Files, AI, Project, and RAG route layers
│   │   └── index.ts          # Server entrypoint
│   └── supabase_schema.sql   # Clean SQL DDL table schema
├── frontend/                 # React client dashboard
│   ├── src/
│   │   ├── components/       # Profile, Auth, Kanban, Team, and Chat components
│   │   ├── context/          # Sync state machine context
│   │   └── App.tsx           # Inner layout controller
└── package.json              # Workspace scripts to build/run the project
```

---

## ⚙️ Local Setup and Installation

### 1. Database Initialization
1. Create a free project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Paste the contents of [supabase_schema.sql](backend/supabase_schema.sql) and run the script. This creates the required tables (`profiles`, `groups`, `tasks`, etc.) and sets up the vector search similarity index.
4. **Enable Real-Time Replication**: To unlock Notion/Trello-like instant sync, enable postgres replication on your tables by running the following SQL script in your Supabase SQL Editor:
   ```sql
   alter publication supabase_realtime add table tasks;
   alter publication supabase_realtime add table commits;
   alter publication supabase_realtime add table feedback;
   alter publication supabase_realtime add table polls;
   alter publication supabase_realtime add table events;
   alter publication supabase_realtime add table profiles;
   alter publication supabase_realtime add table group_members;
   alter publication supabase_realtime add table group_join_requests;
   ```


### 2. Environment Variables Configuration

#### Backend setup:
Create a `.env` file under `/backend` using [backend/.env.example](backend/.env.example):
```env
PORT=5001
SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
GEMINI_API_KEYS="YOUR_GEMINI_KEY_1,YOUR_GEMINI_KEY_2"
```

#### Frontend setup:
Create a `.env` file under `/frontend` using [frontend/.env.example](frontend/.env.example):
```env
VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_PUBLIC_KEY"
```

### 3. Install Dependencies
From the root workspace directory, run:
```bash
npm run install:all
```
This automatically triggers `npm install` inside both `/frontend` and `/backend` directories.

---

## 🏃 Running the Application

### Development Mode
To launch both the backend server and frontend Vite hot-reload server concurrently, run:
```bash
npm run dev
```
* **Frontend client**: http://localhost:3000
* **Backend API**: http://localhost:5001

### Production Build
To verify typechecks and compile both packages for production, run:
```bash
npm run build
```
The optimized frontend static files will compile into `frontend/dist` and backend files into `backend/dist`.
