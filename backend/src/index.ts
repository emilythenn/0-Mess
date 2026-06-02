import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { verifySupabaseToken, AuthenticatedRequest } from './middleware/auth';
import fileRoutes from './modules/files/file.routes';
import ragRoutes from './modules/rag/rag.routes';
import projectRoutes from './modules/project/project.routes';
import { getGeminiClient, executeWithRotation } from './modules/config/gemini';
import { supabase } from './modules/config/supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Mount modular routes
app.use('/api/files', fileRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/project', projectRoutes);

// Protected Profile Route
app.get('/api/profile', verifySupabaseToken, (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'Profile retrieved successfully.',
    user: req.user
  });
});

// Public Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: '0-mess-backend',
    supabaseInitialized: !!supabase,
    geminiInitialized: !!getGeminiClient()
  });
});


// Chat with AI Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format. Expected an array." });
    }

    const client = getGeminiClient();

    if (!client) {
      const userPrompt = messages[messages.length - 1]?.content || "";
      const lowerPrompt = userPrompt.toLowerCase();
      let fallbackReply = "I am the project workspace assistant. Note: The Gemini AI capabilities are currently running in local offline demo mode because no API keys are configured in the server environment.";

      if (lowerPrompt.includes("hello") || lowerPrompt.includes("hi")) {
        fallbackReply = "Hello! I am the project assistant. How can I help coordinate your group assignment today?";
      } else if (lowerPrompt.includes("conflict") || lowerPrompt.includes("disagree")) {
        fallbackReply = "Conflict in group projects is common! Try setting up a precise milestone with a defined lead role, or publish a new Attendance Schedule Ballot under the Team tab.";
      } else if (lowerPrompt.includes("syllabus") || lowerPrompt.includes("objective")) {
        fallbackReply = "You can upload your syllabus PDF under the Resources or Overview tab, and we can reference it for our group's tasks.";
      } else if (lowerPrompt.includes("task") || lowerPrompt.includes("kanban")) {
        fallbackReply = "Our Sprint Kanban Board allows you to log tasks, assign owners, and track development progress in real-time.";
      } else if (lowerPrompt.includes("vote") || lowerPrompt.includes("ballot")) {
        fallbackReply = "You can publish a meeting poll under the Team tab. Members can cast their availability votes to finalize the best slot.";
      }

      return res.json({ reply: fallbackReply });
    }

    // Convert message history to format expected by @google/genai SDK
    // { role: 'user' | 'model', parts: [{ text: string }] }
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    if (formattedContents.length === 0) {
      return res.json({ reply: "Hello! How can I help your group project succeed today?" });
    }

    const reply = await executeWithRotation(async (activeClient) => {
      const response = await activeClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: "You are the friendly '0-Mess AI Assistant' embedded in a university project collaboration interface. Guide the students on assignments, suggest fair task distributions, help coordinate syllabus objectives, resolve teammate conflicts, index backlog tasks, and provide upbeat structured feedback. Address them as part of the student group and keep formatting neat with standard scannable markdown.",
        }
      });
      return response.text || "I was unable to synthesize a response. Let me know if there's anything else I can coordinate!";
    });

    res.json({ reply });
  } catch (err: any) {
    console.error("Gemini API error during chat call:", err);
    res.status(500).json({ error: err?.message || "Internal Server Error" });
  }
});

interface OfflineSubtask {
  title: string;
  description: string;
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
}

interface OfflineRole {
  roleName: string;
  description: string;
  subtasks: OfflineSubtask[];
}

function getOfflineMockRoles(teamSize: number, searchText: string, deadline: string): OfflineRole[] {
  const lower = searchText.toLowerCase();

  // 1. Biology / Science Lab Report
  if (
    lower.includes('biology') || 
    lower.includes('lab') || 
    lower.includes('experiment') || 
    lower.includes('science') || 
    lower.includes('chemistry') || 
    lower.includes('yeast') || 
    lower.includes('report') ||
    lower.includes('spec')
  ) {
    return [
      {
        roleName: "Lead Lab Investigator",
        description: "Coordinates experimental setup, drafts lab methodology, and oversees lab safety.",
        subtasks: [
          { title: "Formulate Scientific Hypothesis", description: "Define key hypotheses and compile the laboratory equipment list.", priority: "HIGH", tags: ["Lab", "Research"] },
          { title: "Write Introduction & Methodology", description: "Draft the theoretical background and methodology sections of the report.", priority: "MEDIUM", tags: ["Writing", "Biology"] }
        ]
      },
      {
        roleName: "Data Analyst & Statistician",
        description: "Gathers trial raw data, performs statistical validation, and designs result charts.",
        subtasks: [
          { title: "Run Statistical T-Tests", description: "Perform significance tests on respiration trial variations.", priority: "URGENT", tags: ["Statistics", "Excel"] },
          { title: "Plot Graph Visualizations", description: "Generate scatter plots and bar charts showing experimental dependencies.", priority: "HIGH", tags: ["Data Analysis"] }
        ]
      },
      {
        roleName: "IEEE Report Compiler",
        description: "Integrates individual team sections, formats citations, and drafts the discussion/conclusions.",
        subtasks: [
          { title: "Draft Discussion and Limitations", description: "Interpret results in context of literature and list experimental sources of error.", priority: "HIGH", tags: ["Writing", "IEEE"] },
          { title: "IEEE Citation Referencing", description: "Compile bibliographies and double-check format compliance.", priority: "MEDIUM", tags: ["IEEE"] }
        ]
      },
      {
        roleName: "Slide Deck Presentation Lead",
        description: "Designs the slide templates and coordinates speech outlines.",
        subtasks: [
          { title: "Structure 10-Slide Deck Layout", description: "Create slide layouts outlining thesis, methodologies, and findings.", priority: "URGENT", tags: ["Design", "Slides"] },
          { title: "Compile Oral Speech Outline", description: "Write presenter speaking notes for the final 15-minute sync.", priority: "MEDIUM", tags: ["Slides"] }
        ]
      }
    ];
  }

  // 2. Business / Marketing / Case Study
  if (
    lower.includes('business') || 
    lower.includes('marketing') || 
    lower.includes('case') || 
    lower.includes('audit') || 
    lower.includes('strategy') || 
    lower.includes('financial')
  ) {
    return [
      {
        roleName: "Market Research Specialist",
        description: "Conducts competitor analysis, SWOT evaluation, and gathers market share figures.",
        subtasks: [
          { title: "SWOT Analysis Outline", description: "Map strengths, weaknesses, opportunities, and threats for the target firm.", priority: "HIGH", tags: ["Business", "Research"] },
          { title: "Competitor Metrics Matrix", description: "Compile market share and pricing comparisons from reports.", priority: "MEDIUM", tags: ["Market Research"] }
        ]
      },
      {
        roleName: "Financial Model Analyst",
        description: "Builds financial forecasts, revenue models, and budget spreadsheets.",
        subtasks: [
          { title: "Revenue Projection Spreadsheets", description: "Build 3-year cash flow projections and NPV spreadsheets.", priority: "URGENT", tags: ["Finance", "Excel"] },
          { title: "Prepare Cost-Benefit Report", description: "Write the financial viability write-up summarizing capital expenses.", priority: "HIGH", tags: ["Excel"] }
        ]
      },
      {
        roleName: "Strategy Coordinator",
        description: "Formulates strategic recommendations, executive summaries, and action plans.",
        subtasks: [
          { title: "Draft Strategic Recommendations", description: "Formulate 3 key strategic recommendations for company growth.", priority: "HIGH", tags: ["Strategy", "Writing"] },
          { title: "Write Executive Summary", description: "Synthesize the entire case report into a 1-page summary.", priority: "MEDIUM", tags: ["Writing"] }
        ]
      },
      {
        roleName: "Pitch Presentation Designer",
        description: "Designs the corporate slide pitch deck and plans delivery timings.",
        subtasks: [
          { title: "Pitch Deck Design", description: "Design a professional, sleek slide deck in Figma or Canva.", priority: "URGENT", tags: ["Design", "Slides"] },
          { title: "Speech Outline Coordination", description: "Prepare speaking prompts and Q&A defense slides.", priority: "MEDIUM", tags: ["Slides"] }
        ]
      }
    ];
  }

  // 3. Humanities / Essay / Literature
  if (
    lower.includes('history') || 
    lower.includes('literature') || 
    lower.includes('essay') || 
    lower.includes('writing') || 
    lower.includes('english') || 
    lower.includes('philosophy')
  ) {
    return [
      {
        roleName: "Primary Source Researcher",
        description: "Identifies historical archives, literature sources, and drafts the bibliography.",
        subtasks: [
          { title: "Source Material Annotation", description: "Annotate at least 5 primary historical/literary texts.", priority: "HIGH", tags: ["Humanities", "Research"] },
          { title: "Compile Bibliography & Citations", description: "Draft the reference page according to MLA/APA style manuals.", priority: "MEDIUM", tags: ["Writing"] }
        ]
      },
      {
        roleName: "Theoretical Thesis Designer",
        description: "Drafts the core arguments, outline chapters, and refines the central thesis.",
        subtasks: [
          { title: "Formulate Thesis Arguments", description: "Write a detailed outline of core arguments supporting the thesis statement.", priority: "URGENT", tags: ["Thesis", "Writing"] },
          { title: "Draft Core Chapters Overview", description: "Outline key paragraphs for body chapters and logical flow.", priority: "HIGH", tags: ["Writing"] }
        ]
      },
      {
        roleName: "Critical Analysis Writer",
        description: "Drafts critical interpretations, comparisons, and counter-arguments.",
        subtasks: [
          { title: "Analyze Cultural Counter-Arguments", description: "Write sections evaluating opposing critiques and counter-evidence.", priority: "HIGH", tags: ["Analysis", "Writing"] },
          { title: "Draft Conclusion Narrative", description: "Draft concluding remarks highlighting broad implications.", priority: "MEDIUM", tags: ["Writing"] }
        ]
      },
      {
        roleName: "Oral Defense Coordinator",
        description: "Prepares presentation outlines and visual aids summarizing arguments.",
        subtasks: [
          { title: "Create Defense Slides Template", description: "Design a minimal, clear presentation highlighting main thesis points.", priority: "URGENT", tags: ["Slides"] },
          { title: "Draft Thesis Speaking Guide", description: "Write presenter notes explaining core critical points.", priority: "MEDIUM", tags: ["Slides"] }
        ]
      }
    ];
  }

  // 4. Default: Software Engineering / Computer Science
  return [
    {
      roleName: "Backend Architecture Lead",
      description: "Focuses on core system logic, server routing, and state machine replication.",
      subtasks: [
        { title: "Core Replica Server Setup", description: `Design leader election handlers to meet ${deadline || "sprint"} goals.`, priority: "URGENT", tags: ["Backend"] },
        { title: "API Gateway Routes Integration", description: "Implement client-entrypoint RPC route handling.", priority: "HIGH", tags: ["Backend API"] }
      ]
    },
    {
      roleName: "QA & Testing Specialist",
      description: "Responsible for automated test suites, simulation scripts, and validation.",
      subtasks: [
        { title: "Network Disconnect Simulation scripts", description: "Write automated simulation scripts to test consensus partition recovery.", priority: "URGENT", tags: ["Testing"] },
        { title: "Leader Election Verification", description: "Verify election convergence speeds under latency simulation.", priority: "HIGH", tags: ["QA"] }
      ]
    },
    {
      roleName: "Frontend Panel Architect",
      description: "Builds live interactive React charts displaying server topology status and ping monitors.",
      subtasks: [
        { title: "Server Nodes Cluster Monitor UI", description: "Implement active cluster status topology grids with ping delay monitors.", priority: "HIGH", tags: ["React UI"] },
        { title: "Control Node Config Sliders", description: "Build latency sliders that feed simulation delay weights into backend servers.", priority: "MEDIUM", tags: ["React"] }
      ]
    },
    {
      roleName: "Database Storage Specialist",
      description: "Integrates persistence engines, RocksDB logs serialization, and snapshot compactions.",
      subtasks: [
        { title: "RocksDB Log Serialization", description: "Integrate serializing write batches to RocksDB for replica log entries.", priority: "HIGH", tags: ["Database"] },
        { title: "Log Compaction Trigger RPCs", description: "Write memory snapshot checkpoints that truncate stale replica logs.", priority: "MEDIUM", tags: ["Database"] }
      ]
    },
    {
      roleName: "Technical Report Coordinator",
      description: "Focuses on syllabus compliance reviews, IEEE drafts, performance logs and graphs.",
      subtasks: [
        { title: "IEEE Technical Draft Division Paper", description: "Write detailed performance tables and leader re-election evaluations.", priority: "MEDIUM", tags: ["Documentation"] },
        { title: "Figma Slides Outline Layout", description: "Design outline slides detailing leader state recovery strategies.", priority: "LOW", tags: ["Figma Design"] }
      ]
    }
  ];
}

// AI task-splitting endpoint
app.post("/api/ai/split-tasks", verifySupabaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { teamSize, deadline, requirements, fileId, suggestion, currentDistribution } = req.body;
    
    const sanitizedSize = Math.max(1, Math.min(10, parseInt(teamSize) || 3));
    
    // 1. Fetch file context if fileId is provided
    let fileContent = "";
    if (fileId) {
      const { data: chunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('content')
        .eq('file_id', fileId)
        .order('created_at', { ascending: true });

      if (chunksError) {
        console.error("Error fetching document chunks:", chunksError);
      } else if (chunks) {
        fileContent = chunks.map((c: any) => c.content).join("\n\n");
      }
    }

    // 2. Build the prompt
    let prompt = `You are an expert academic project manager. Your job is to read the ENTIRE provided project specification document and requirements, summarize all deliverables and tasks that need to be done, and split them into exactly ${sanitizedSize} separate, fair, balanced, and independent student workloads (one workload block for each team member).

STRICT DIRECTIVES:
1. READ THE ENTIRE provided document content and requirements from beginning to end. Do not skip any sections.
2. IDENTIFY AND SUMMARIZE ALL coursework deliverables, submission requirements, grading criteria, and coursework tasks that need to be completed for the assignment.
3. DIVIDE ALL identified deliverables and tasks across exactly ${sanitizedSize} workload slots. DO NOT MISS ANY TASKS OR DELIVERABLES. Every single requirement/deliverable identified in the document must be covered by at least one workload slot.
4. Distribute the actual academic workload (e.g., system analysis, requirements collection, drafting specific report sections, drawing specific UML diagrams, designing mockups, slide creation, etc.) rather than suggesting roles for implementing/coding the software in the case study, unless the document explicitly states that students must submit a functioning software prototype.
5. If no explicit deliverables are mentioned in the provided text, infer logical academic deliverables based on the project topic, requirements, and deadline.

Project Sprint Deadline: ${deadline || "Next week"}
Core Requirements & Student Deliverables: ${requirements || "General coursework implementation"}
`;

    if (fileContent) {
      prompt += `\nProject Specification Document Content:\n${fileContent}\n`;
    }

    if (currentDistribution) {
      prompt += `\nPreviously generated workload distribution:\n${JSON.stringify(currentDistribution)}\n`;
      if (suggestion) {
        prompt += `\nUser's feedback/suggested changes to refine this workload distribution: "${suggestion}"\n`;
      }
    }

    prompt += `
Please output a JSON array containing exactly ${sanitizedSize} workload objects.
Each object must represent a workload slot and have the following JSON structure:
{
  "id": "role_[number]",
  "roleName": "[Brief role title, e.g. Core Consensus Engineer]",
  "description": "[1-2 sentence description of this workload's main focus]",
  "subtasks": [
    {
      "title": "[Short task title]",
      "description": "[1 sentence detail of what to build or write]",
      "priority": "URGENT" | "HIGH" | "MEDIUM" | "LOW",
      "tags": ["Tag1", "Tag2"]
    }
  ]
}

Strict Rules:
1. Output ONLY a valid JSON array matching the schema above. Do NOT include markdown code blocks (e.g. \`\`\`json ... \`\`\`), HTML tags, or any leading/trailing chat text.
2. The number of objects in the array must be EXACTLY ${sanitizedSize}.
3. Ensure tasks are concrete and relevant to the requirements, project description, and deadline.
4. Each task must have a valid priority string: "URGENT", "HIGH", "MEDIUM", or "LOW".
`;

    const client = getGeminiClient();
    let replyText = "";
    
    if (!client) {
      console.log("[AI Split Tasks] Gemini client is not initialized. Returning categorized offline mock roles.");
      const searchText = ((fileContent || "") + " " + (requirements || "")).toLowerCase();
      const baseRoles = getOfflineMockRoles(sanitizedSize, searchText, deadline);
      
      const generatedRoles = [];
      for (let i = 0; i < sanitizedSize; i++) {
        const template = baseRoles[i % baseRoles.length];
        generatedRoles.push({
          id: `role_${i + 1}`,
          roleName: `${template.roleName} (Slot ${i + 1})`,
          description: template.description,
          subtasks: template.subtasks.map(st => ({
            ...st,
            title: st.title + (suggestion ? " (Refined)" : "")
          }))
        });
      }
      return res.json({ distribution: generatedRoles });
    }

    replyText = await executeWithRotation(async (activeClient) => {
      const response = await activeClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional project manager AI. You split projects into balanced team workloads. You output ONLY raw JSON arrays conforming strictly to the requested schema. No code blocks, no chat conversational wrappers.",
          responseMimeType: "application/json"
        }
      });
      return response.text || "[]";
    });

    let resultJson;
    try {
      let cleanText = replyText.trim();
      if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
      }
      resultJson = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON parse error on AI response:", replyText);
      return res.status(500).json({ error: "AI returned invalid JSON format. Please try again." });
    }

    res.json({ distribution: resultJson });
  } catch (err: any) {
    console.error("Error in split-tasks:", err);
    res.status(500).json({ error: err.message || "Failed to split tasks using AI" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
