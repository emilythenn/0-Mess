import { supabase } from '../config/supabase';
import { EmbeddingService } from '../embeddings/embedding.service';
import { GeminiService } from '../ai/gemini.service';
import { getGeminiClient } from '../config/gemini';

export class RagService {
  /**
   * Main RAG Query flow:
   * 1. Generates query embedding from question.
   * 2. Query Supabase for top 5-10 similar document chunks in the active group workspace.
   * 3. Construct a context-rich prompt and feed it to the Gemini LLM.
   * 4. Return response + original source files.
   */
  static async queryRAG(question: string, groupId: string, userId: string) {
    // 1. Fetch all layered workspace context from the database
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle();

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    const memberIds = groupMembers ? groupMembers.map((m: any) => m.user_id) : [];
    let membersProfiles: any[] = [];
    if (memberIds.length > 0) {
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberIds);
      if (pData) membersProfiles = pData;
    }

    const { data: tasksList } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', groupId);

    const { data: commitsList } = await supabase
      .from('commits')
      .select('*')
      .eq('group_id', groupId)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Calculate workload metrics per member for heuristics and context builders
    const memberTaskCounts: Record<string, { name: string; pending: number; completed: number; total: number }> = {};
    membersProfiles.forEach((m: any) => {
      memberTaskCounts[m.id] = { name: m.name, pending: 0, completed: 0, total: 0 };
    });

    const activeTasks = tasksList || [];
    let unassignedCount = 0;
    const unassignedTasks: any[] = [];

    activeTasks.forEach((task: any) => {
      const isCompleted = task.status === 'COMPLETED';
      const assignees = task.assignees || [];
      if (assignees.length === 0) {
        unassignedCount++;
        unassignedTasks.push(task);
      } else {
        assignees.forEach((assId: string) => {
          if (!memberTaskCounts[assId]) {
            memberTaskCounts[assId] = { name: `User ${assId.substring(0, 5)}`, pending: 0, completed: 0, total: 0 };
          }
          if (isCompleted) {
            memberTaskCounts[assId].completed++;
          } else {
            memberTaskCounts[assId].pending++;
          }
          memberTaskCounts[assId].total++;
        });
      }
    });

    // Check if Gemini is in offline demo mode
    const client = getGeminiClient();
    if (!client) {
      const lowerPrompt = question.toLowerCase();
      const isWorkloadQuery = lowerPrompt.includes('audit') || lowerPrompt.includes('redistribute') || lowerPrompt.includes('balance') || lowerPrompt.includes('workload') || lowerPrompt.includes('suggest');

      if (isWorkloadQuery) {
        // Run rule-based offline heuristic audit
        let report = `### 📊 Heuristic Workload Distribution Audit (Offline Mode)\n\n`;
        report += `I have analyzed the workspace database to audit tasks and team members contributions. Here is the current workload summary:\n\n`;
        report += `| Member | Pending Tasks | Completed Tasks | Total Tasks | Contribution Score (Estimate) |\n`;
        report += `| :--- | :---: | :---: | :---: | :---: |\n`;

        membersProfiles.forEach((m: any) => {
          const counts = memberTaskCounts[m.id] || { pending: 0, completed: 0, total: 0 };
          const commitsCount = (commitsList || []).filter((c: any) => c.member_id === m.id).length;
          const sTasks = counts.total > 0 ? (counts.completed / counts.total) * 10 : 10;
          const sCommits = Math.min(commitsCount * 2, 10);
          const contributionScore = parseFloat(((sTasks * 0.5) + (sCommits * 0.5)).toFixed(1));
          report += `| **${m.name}** (${m.role || 'Member'}) | ${counts.pending} | ${counts.completed} | ${counts.total} | ${contributionScore} / 10 |\n`;
        });

        if (unassignedCount > 0) {
          report += `| *Unassigned Tasks* | ${unassignedCount} | - | ${unassignedCount} | - |\n`;
        }

        report += `\n`;

        let overloadedId = '';
        let underloadedId = '';
        let maxPending = -1;
        let minPending = 999999;

        Object.keys(memberTaskCounts).forEach((id) => {
          const counts = memberTaskCounts[id];
          if (counts.pending > maxPending) {
            maxPending = counts.pending;
            overloadedId = id;
          }
          if (counts.pending < minPending) {
            minPending = counts.pending;
            underloadedId = id;
          }
        });

        const getMemberName = (id: string) => memberTaskCounts[id]?.name || `Member (${id.substring(0, 6)})`;

        report += `#### 💡 Recommendations:\n`;

        if (unassignedCount > 0 && underloadedId) {
          const nextTask = unassignedTasks[0];
          report += `* **Assign Unassigned Tasks**: **${getMemberName(underloadedId)}** has the lightest pending load (${minPending} tasks). We recommend assigning the unassigned task **"${nextTask.title}"** to them.\n`;
        } else if (overloadedId && underloadedId && overloadedId !== underloadedId && maxPending - minPending >= 2) {
          const taskToMove = activeTasks.find((t: any) => t.status !== 'COMPLETED' && t.assignees.includes(overloadedId));
          if (taskToMove) {
            report += `* **Balance Workload**: **${getMemberName(overloadedId)}** is currently overloaded with **${maxPending}** pending tasks, while **${getMemberName(underloadedId)}** has only **${minPending}** pending tasks. We recommend shifting the task **"${taskToMove.title}"** from **${getMemberName(overloadedId)}** to **${getMemberName(underloadedId)}** to balance the workload.\n`;
          } else {
            report += `* **Workload Balanced**: Pending workloads are relatively balanced. Continue tracking status via the Kanban board.\n`;
          }
        } else {
          report += `* **Workload Balanced**: Team task assignments are currently well balanced (difference is less than 2 pending tasks). Keep up the great work!\n`;
        }

        report += `\n*Note: This audit is running in Offline Heuristic mode because Gemini AI is currently unconfigured or unreachable. Set GEMINI_API_KEYS in the backend environment to enable full workspace-aware LLM auditing.*`;

        return {
          reply: report,
          sources: []
        };
      }

      // Default offline fallback reply
      let fallbackReply = `Hello! I am the 0-Mess Workspace AI Assistant. Gemini AI is currently running in local offline demo mode because no API keys are configured in the environment.

However, I can verify the active workspace stats from the database:
- **Workspace ID**: ${groupId}
- **Project Name**: ${groupData?.name || 'Unnamed Group'}
- **Active Tasks**: ${(tasksList || []).length} total (${(tasksList || []).filter((t: any) => t.status === 'COMPLETED').length} completed)
- **Contribution Logs**: ${(commitsList || []).length} registered commits

If you need a workload audit, type **"Audit Workload"** or click the quick action pill, and I will perform a heuristic task-balancing analysis for your team!`;

      if (lowerPrompt.includes("hello") || lowerPrompt.includes("hi")) {
        fallbackReply = "Hello! I am the 0-Mess Workspace AI assistant. I am currently running in offline demo mode. How can I help coordinate your group assignment today?";
      } else if (lowerPrompt.includes("conflict") || lowerPrompt.includes("disagree")) {
        fallbackReply = "Conflict in group projects is common! Try setting up a precise milestone with a defined lead role, or publish a new Attendance Schedule Ballot under the Team tab.";
      }

      return {
        reply: fallbackReply,
        sources: [],
      };
    }

    // 2. Convert user question into embedding
    const queryEmbedding = await EmbeddingService.generateEmbedding(question);

    // 3. Query Supabase similarity search RPC function for files
    const { data: chunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.15,
      match_count: 8,
      filter_group_id: groupId,
    });

    if (rpcError) {
      console.error('Error invoking Supabase match_document_chunks:', rpcError);
      throw new Error(`Vector similarity query failed: ${rpcError.message}`);
    }

    const contextText = chunks && chunks.length > 0
      ? chunks.map((chunk: any, index: number) => `[Source doc index ${index + 1}]:\n${chunk.content}`).join('\n\n')
      : '';

    // 4. Build Structured Context Details
    const membersListText = membersProfiles.map((m: any) => {
      const counts = memberTaskCounts[m.id] || { pending: 0, completed: 0, total: 0 };
      const commitsCount = (commitsList || []).filter((c: any) => c.member_id === m.id).length;
      return `- **${m.name}** (ID: ${m.id}, Email: ${m.email}, Role: ${m.role || 'Member'}): ${counts.pending} pending tasks, ${counts.completed} completed tasks, ${commitsCount} commits logged.`;
    }).join('\n');

    const tasksListText = (tasksList || []).map((t: any) => {
      const assigneesText = (t.assignees || []).map((id: string) => {
        const profile = membersProfiles.find((p: any) => p.id === id);
        return profile ? profile.name : id;
      }).join(', ') || 'Unassigned';
      return `- [${t.status}] "${t.title}" (Priority: ${t.priority}, Assigned to: ${assigneesText}, Due: ${t.due_date || 'N/A'}, Description: ${t.description || ''})`;
    }).join('\n') || '(No tasks currently created in this group workspace)';

    const recentActivityText = (commitsList || []).map((c: any) => {
      return `- [${c.type}] "${c.title}" by ${c.author_name} (${new Date(c.timestamp).toLocaleString()}) - ${c.description || ''}`;
    }).join('\n') || '(No commits or contribution logs registered yet)';

    const currentUserText = userProfile
      ? `${userProfile.name} (Role: ${userProfile.role || 'Member'}, Email: ${userProfile.email})`
      : `User ${userId}`;

    // 5. Construct prompt with retrieved chunks + dynamic layered database context + user question
    const prompt = `Use the following retrieved database workspace context and document excerpts to answer the user's question.

=== ACTIVE WORKSPACE CONTEXT ===
Group ID: ${groupId}
Group Name: ${groupData?.name || 'Unnamed Group'}
Group Description: ${groupData?.description || 'No description provided.'}

=== REQUESTING USER ===
${currentUserText}

=== TEAM MEMBERS ===
${membersListText}

=== CURRENT TASKS DATABASE ===
${tasksListText}

=== RECENT COMMITS & ACTIVITY ===
${recentActivityText}

=== RETRIEVED SEMANTIC DOCUMENTS ===
${contextText || '(No relevant document excerpts found in uploaded files)'}

=== USER QUERY ===
"${question}"

=== INSTRUCTIONS ===
- Answer the user's question clearly, addressing them as part of the student group.
- Leverage the active workspace context (members, tasks, commits) to answer questions about project status, who is assigned to what, workload distribution, and recent activity.
- If the query asks to audit or redistribute tasks, analyze the team members' tasks and commits, and propose a balanced task redistribution plan using clear markdown tables and recommendations.
- Cite the source indexes (e.g. [Source doc index 1], [Source doc index 2]) in your response where you draw information from the uploaded documents.
- Keep the formatting neat with standard scannable markdown.`;

    const systemInstruction = "You are the friendly '0-Mess AI Assistant' embedded in a university project collaboration dashboard. You are workspace-aware, meaning you have real-time access to the group's tasks database, team member lists, recent commits, and uploaded files. Answer coordination questions using this data.";

    // 6. Generate LLM response
    const reply = await GeminiService.generateAnswer(systemInstruction, prompt);

    // Retrieve unique source file records for metadata returning
    let sources: { id: string; name: string }[] = [];
    if (chunks && chunks.length > 0) {
      const fileIds = Array.from(new Set(chunks.map((c: any) => c.file_id))) as string[];
      if (fileIds.length > 0) {
        const { data: filesData } = await supabase
          .from('files')
          .select('id, name')
          .in('id', fileIds);

        if (filesData) {
          sources = filesData.map((f: any) => ({
            id: f.id,
            name: f.name,
          }));
        }
      }
    }

    return {
      reply,
      sources,
    };
  }
}
