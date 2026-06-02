# 0-Mess 🎓

A centralized, real-time collaboration and accountability platform tailored for university group assignments. **0-Mess** bridges the coordination gap in student teams by combining synchronized Kanban boards, smart meeting scheduling, anonymous peer review metrics, and an AI workspace helper (using RAG) into a single cohesive dashboard.

🔗 **Live Production Deployment**: [https://0-mess.vercel.app](https://0-mess.vercel.app)

> [!WARNING]
> **Known Issue — Live Deployment (Resource Upload & RAG Chatbot)**
> The backend is hosted on [Render](https://render.com) in a region where Google's **Gemini Embedding API** (`gemini-embedding-2`) returns a `FAILED_PRECONDITION: User location is not supported` error.
> This means:
> - **Uploading a file** to the Resource Hub on the live site will return a 500 error.
> - **The AI Chatbot** cannot perform vector similarity search on uploaded documents.
>
> ✅ **All features work fully when running locally** (see [Local Setup](#️-local-setup-and-installation) below). Please run the app locally to test the full RAG pipeline.

---

## 🚀 Key Features

* **Unified Course Workspaces**: Create or join project teams using password-secured group codes.
* **Direct Teammate Enrollment**: Add registered students to group workspaces instantly by entering their email address (bypassing code/request approvals).
* **AI & Manual Workload Builder**: Split complex assignment requirements into fair task roles automatically using AI suggestions, or manually configure custom project roles and tasks.
* **Teammate Claim Coordination**: Select and claim workspace roles to dynamically populate personal task checklists on the group Kanban board.
* **Semantic AI Workspace Helper (RAG)**: Upload lecture notes, rubrics, or other files to let the workspace AI parse, index, and answer project-specific queries using vector embeddings.
* **Milestone-Driven Overview**: Keep project completion percentages realistic by focusing overview meters strictly on milestone completions (filtering out minor deadlines or meetings).
* **Anonymous Peer Evaluations**: Submit multi-metric peer reviews (quality, reliability, communication, contribution) to coordinate performance scores anonymously.
* **Academic Student Profiles**: Edit details like matriculation number, siswa/university mail, semester, course, and nationality, displayed in a clean academic grid.
* **Resilient Sync Engine**: Features a fallback caching system that seamlessly shifts to local storage if the database server is unconnected, notifying the team via a top-level error banner.

---

## 📡 Offline-First & Conflict Resolution System

**0-Mess** is built with a resilient offline-first architecture to handle unstable network environments and server downtime, ensuring students can keep tracking and updating their group project uninterrupted.

### 1. FIFO Mutation Queueing
* When the client is offline (detected via `navigator.onLine` or HTTP timeouts), all write operations (adding/updating/deleting tasks, logging commits, submitting peer reviews, scheduling events, voting in polls, updating profile, etc.) route through a centralized queue.
* Changes are instantly rendered in the React state (Optimistic UI updates) and serialized to `localStorage` under a FIFO queue (`0mess_pending_actions`).
* A glassmorphic **Offline Indicator Bar** rises in both the Dashboard and Group workspace, showing the count of pending updates.

### 2. Synchronization Engine
* The application listens for `window.onLine` reconnection events and performs a background sync loop every **10 seconds**.
* When connection is recovered, the queue is drained sequentially. Banners display a rotating `"Synchronizing updates..."` state until the cache is fully flushed and real-time listeners are re-established.

### 3. Conflict Resolution Rules
When offline modifications are synced back, the engine compares the local action with the current Supabase server state:
* **Last-Write-Wins (LWW)**: For task status updates, the client compares the local queue timestamp against the server's Postgres update metadata. The client version wins only if it is newer than the server's record.
* **Text Merging**: If a task's description was modified offline by user A while user B updated it on the server, both updates are saved by merging the descriptions:
  ```
  [Server Description Content]
  [Merged Update]: [Client Offline Description Content]
  ```
* **Deletion Precedence**: If a task was deleted on the server while the client was offline making edits to it, the offline updates are discarded to prevent ghost items.

---

## 🤖 Retrieval-Augmented Generation (RAG) & AI Workspace Engine

The **0-Mess** workspace integrates a semantic RAG pipeline to help students extract deliverables and requirements from syllabus sheets, rubrics, and project briefs.

* **Multi-Format Parsing**: Extracts raw text from uploaded PDF instructions (via modern `PDFParse`) and DOCX guides (via `Mammoth`).
* **Semantic Splitting**: Segments parsed documents into overlapping text chunks to ensure context remains unbroken across boundaries.
* **Supabase pgvector**: Leverages the PostgreSQL `pgvector` extension to store document chunk vectors.
* **Cosine Similarity Querying**: Runs vector similarity searches on user queries to retrieve relevant context chunks before passing them to the Google Gemini API (`gemini-2.5-flash`).
* **Exhaustive Workload Splitting**: Commands the AI model to identify all required assignment deliverables from the documents and evenly distribute tasks among active team members so no items are missed.

---

## ⚡ Real-Time Collaborative Synchronization

The platform utilizes a reactive event-driven architecture to keep all active workspace screens synchronized without poll intervals.

* **Supabase Realtime Channels**: Subscribes directly to PostgreSQL replication publications (`postgres_changes`) for tables including `tasks`, `commits`, `feedback`, `polls`, `events`, and `group_members`.
* **Instant UI Reflected Modifications**: When any student moves a task card on the Kanban board, schedules a milestone, or joins the group, the change is broadcasted and rendered on all teammates' screens within milliseconds.

---

## 📊 Weighted Contribution Metrics Engine (Dynamic Accountability)

To discourage "social loafing" (free-riding) in university group assignments, **0-Mess** implements a dynamic, multi-metric accountability algorithm.

* **Unified Contribution Score**: Computes a dynamic score out of `10.0` for each student based on three distinct data sources:
  - **40% Task Completion**: Ratio of completed tasks assigned to the member.
  - **40% Git Commit Activity**: Volume of logged work updates (progress logs).
  - **20% Anonymous Peer Evaluations**: Averaged ratings across Quality, Reliability, Communication, and Contribution submitted anonymously by teammates.
* **Live Performance Visualization**: Displays scores in a clean interactive detail grid, highlighting active contributions and self-claimed workloads.

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

### Live Production Deployment
* **Frontend Web Client (Vercel)**: [https://0-mess.vercel.app](https://0-mess.vercel.app)
* **Backend API Gateway (Render)**: [https://zero-mess.onrender.com](https://zero-mess.onrender.com)

### Development Mode
To launch both the backend server and frontend Vite hot-reload server concurrently, run:
```bash
npm run dev
```
* **Frontend client**: http://localhost:5173
* **Backend API**: http://localhost:5001

### Production Build
To verify typechecks and compile both packages for production, run:
```bash
npm run build
```
The optimized frontend static files will compile into `frontend/dist` and backend files into `backend/dist`.
