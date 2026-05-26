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
    supabaseInitialized: !!supabase
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
    let prompt = `You are an expert technical project manager. Your job is to split a university group project into exactly ${sanitizedSize} separate, fair, balanced, and independent workloads (one workload block for each team member).

Project Sprint Deadline: ${deadline || "Next week"}
Core Requirements & Special Guidelines: ${requirements || "General project implementation"}
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
      // Mockup generation if Gemini is offline
      const baseRoles = [
        {
          id: "role_1",
          roleName: "Backend Architecture Lead",
          description: "Focuses on core system logic, server routing, and state machine replication.",
          subtasks: [
            { title: "Core Replica Server Setup", description: `Design leader election handlers to meet ${deadline || "sprint"} goals.`, priority: "URGENT", tags: ["Backend"] },
            { title: "API Gateway Routes Integration", description: `Implement client-entrypoint RPC route handling.`, priority: "HIGH", tags: ["Backend API"] }
          ]
        },
        {
          id: "role_2",
          roleName: "QA & Testing Specialist",
          description: "Responsible for automated test suites, simulation scripts, and validation.",
          subtasks: [
            { title: "Network Disconnect Simulation scripts", description: "Write automated simulation scripts to test consensus partition recovery.", priority: "URGENT", tags: ["Testing"] },
            { title: "Leader Election Verification", description: "Verify election convergence speeds under latency simulation.", priority: "HIGH", tags: ["QA"] }
          ]
        },
        {
          id: "role_3",
          roleName: "Frontend Panel Architect",
          description: "Builds live interactive React charts displaying server topology status and ping monitors.",
          subtasks: [
            { title: "Server Nodes Cluster Monitor UI", description: "Implement active cluster status topology grids with ping delay monitors.", priority: "HIGH", tags: ["React UI"] },
            { title: "Control Node Config Sliders", description: "Build latency sliders that feed simulation delay weights into backend servers.", priority: "MEDIUM", tags: ["React"] }
          ]
        },
        {
          id: "role_4",
          roleName: "Database Storage Specialist",
          description: "Integrates persistence engines, RocksDB logs serialization, and snapshot compactions.",
          subtasks: [
            { title: "RocksDB Log Serialization", description: "Integrate serializing write batches to RocksDB for replica log entries.", priority: "HIGH", tags: ["Database"] },
            { title: "Log Compaction Trigger RPCs", description: "Write memory snapshot checkpoints that truncate stale replica logs.", priority: "MEDIUM", tags: ["Database"] }
          ]
        },
        {
          id: "role_5",
          roleName: "Technical Report Coordinator",
          description: "Focuses on syllabus compliance reviews, IEEE drafts, performance logs and graphs.",
          subtasks: [
            { title: "IEEE Technical Draft Division Paper", description: "Write detailed performance tables and leader re-election evaluations.", priority: "MEDIUM", tags: ["Documentation"] },
            { title: "Figma Slides Outline Layout", description: "Design outline slides detailing leader state recovery strategies.", priority: "LOW", tags: ["Figma Design"] }
          ]
        }
      ];

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
