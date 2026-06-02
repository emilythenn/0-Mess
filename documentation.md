# 0-Mess Project Documentation 🎓
*A Centralized, Real-Time Collaboration & Accountability Platform for University Group Assignments*

---

## 1. Planning & Approach

Group projects in universities frequently suffer from the **"free-rider" effect (social loafing)**, coordination friction, and fragmented communication tools. The planning of **0-Mess** focused on solving these human and technical hurdles:
1. **Low Friction Onboarding**: Instant registration and direct team member enrollment via email so teams can begin working immediately.
2. **Transparent Accountability**: A dynamic, multi-metric performance score algorithm (tasks completed + git activity + peer review metric) to ensure contribution is tracked fairly.
3. **Resilience in Unstable Environments**: Since students work on the go (in libraries, cafes, or public transit), the application implements an robust offline-first synchronization engine.
4. **Intelligent Assistance (AI)**: Splitting requirements into fair tasks, and semantic query answering.

---

## 2. Technical Architecture & Tech Stack

```mermaid
graph TD
  Client[React Frontend - Vite + TS] <-->|Realtime PubSub / Auth| Supabase[Supabase / Postgres / Auth]
  Client <-->|REST API / Offline Queue| Express[Express Backend - Node + TS]
  Express <-->|Database Queries & SQL RPC| Supabase
  Express <-->|Embeddings & Chat / Suggestion| Gemini[Google Gemini AI API]
```

### Tech Stack
* **Frontend**: React 19 (TypeScript), Vite, Tailwind CSS, Framer Motion (animations), Lucide React (icons).
* **Backend**: Node.js, Express, TypeScript, Mammoth (DOCX parser), PDF-Parse (PDF parser).
* **AI Engine**: Google Gemini API (`@google/genai`).
* **Database & Realtime**: Supabase (PostgreSQL with `pgvector` for similarity embeddings, JWT Auth, and real-time subscription channels).

---

## 3. Key Technical Decisions & Reasoning

* **Supabase Realtime vs. WebSockets Polling**:
  - We utilized Supabase Realtime client libraries to subscribe to Postgres changes (`postgres_changes`) directly from the React components. This eliminates polling overhead, decreases CPU usage, and reflects teammates' task card drags, commits, and meetings instantly.
* **Offline-First FIFO Queueing & Optimistic UI**:
  - All write operations route through a mutation manager. If the connection fails, mutations are queued in `localStorage` in FIFO order while the UI updates optimistically. A background sync loop checks connection health every 10 seconds and flushes the queue sequentially when online.
* **Cosine Similarity RAG vs. Entire-Document AI Analysis**:
  - **RAG (AI Chatbot)**: Utilizes vector embeddings stored in Supabase `pgvector`. A user prompt is converted into an embedding, and the database runs a cosine similarity match to retrieve the top 8 chunks. This is ideal for quickly answering specific user queries about syllabus files or slide documents.
  - **Entire-Document AI Workload Builder**: For task creation, a similarity query is inadequate because it might skip key guidelines or deliverables. Instead, the backend pulls *all* document chunks matching a file ID sorted by creation time, reassembles the complete document text, and feeds it to Gemini to extract every single coursework deliverable without omission.

---

## 4. Key Feature Flowcharts

### A. Document Indexing Flow
When a student uploads a course rubric or syllabus file:

```mermaid
sequenceDiagram
    autonumber
    actor User as Student
    participant FE as React Frontend
    participant BE as Express Backend
    participant DB as Supabase DB
    participant GEM as Gemini AI API

    User->>FE: Upload Document (.pdf, .docx, .txt)
    FE->>BE: POST /api/files/upload (multipart)
    Note over BE: Parse text using pdf-parse / mammoth
    Note over BE: Split text into 1500char chunks with 200char overlap
    BE->>DB: Insert File metadata record (Get file_id)
    loop For each text chunk
        BE->>GEM: Generate text embedding (gemini-embedding-2)
        GEM-->>BE: Return vector embedding array
    end
    BE->>DB: Bulk insert chunks & embeddings (document_chunks table)
    BE-->>FE: Return upload success & file info
    FE-->>User: Display file in Resources list
```

### B. RAG Chatbot Semantic Query
When a student asks the chatbot a question in the workspace sidebar:

```mermaid
sequenceDiagram
    autonumber
    actor User as Student
    participant FE as React Frontend
    participant BE as Express Backend
    participant GEM as Gemini AI API
    participant DB as Supabase DB

    User->>FE: Ask question ("What is the grading weight for the report?")
    FE->>BE: POST /api/rag/query
    BE->>GEM: Generate embedding for user query
    GEM-->>BE: Return query embedding vector
    BE->>DB: RPC: match_document_chunks (Cosine similarity match)
    DB-->>BE: Return top matching content chunks
    Note over BE: Fetch workspace stats (tasks, member commits, reviews)
    Note over BE: Construct rich prompt (excerpts + current database context)
    BE->>GEM: generateContent (gemini-3.5-flash)
    GEM-->>BE: Return structured answer with citations
    BE-->>FE: Return AI reply and source files metadata
    FE-->>User: Render reply in Chat Sidebar with source list
```

### C. Entire-Document AI Workload Suggestion Engine
When the team uses the AI Workload Suggestion Engine to generate the task list:

```mermaid
sequenceDiagram
    autonumber
    actor User as Group Member
    participant FE as React Frontend
    participant BE as Express Backend
    participant DB as Supabase DB
    participant GEM as Gemini AI API

    User->>FE: Select file & Click "Suggest Balanced Workload"
    FE->>BE: POST /api/ai/split-tasks (fileId, teamSize)
    BE->>DB: SELECT content FROM document_chunks WHERE file_id = ID ORDER BY created_at ASC
    DB-->>BE: Return all sequential text chunks
    Note over BE: Reassemble entire file content in sequence
    Note over BE: Formulate exhaustive summary & distribution prompt
    BE->>GEM: generateContent (gemini-3.5-flash) in JSON Mode
    GEM-->>BE: Return JSON array containing role assignments & subtasks
    BE-->>FE: Return proposed workload distribution
    FE-->>User: Show interactive workload draft cards
    User->>FE: Review and Click "Confirm Workload"
    FE->>DB: Bulk insert tasks & claim assignments
```

### D. Offline-First Mutation & Sync Engine
When a teammate makes changes while offline:

```mermaid
graph TD
    Start[User performs action e.g., Drag task card] --> Check{Is Client Online?}
    Check -->|Yes| SendReq[Send HTTP Request to server]
    SendReq --> Success{Success?}
    Success -->|Yes| UpdateState[Update React view state]
    Success -->|No| QueueAction[Queue in FIFO localStorage & show warning indicator]

    Check -->|No| QueueAction
    QueueAction --> OptimisticUI[Optimistically update UI state locally]

    Timer[10s Background Timer / Reconnect Event] --> HasQueue{Are actions pending in queue?}
    HasQueue -->|No| Idle[Wait for next interval]
    HasQueue -->|Yes| DrainQueue[Drain and send first queue action]
    DrainQueue --> SyncSuccess{Success / Responding?}
    SyncSuccess -->|Yes| ApplyConflict[Apply conflict resolution rules & delete from queue]
    ApplyConflict --> HasQueue
    SyncSuccess -->|No| KeepQueue[Keep remaining actions queued & retry later]
```
