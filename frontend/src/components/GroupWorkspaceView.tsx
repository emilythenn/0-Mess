import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { Task, Member, Commit, MeetingPoll, Event } from '../types';
import { 
  FileText, Cpu, CheckCircle, Clock, Calendar, Sparkles, 
  Plus, Upload, Shield, ChevronRight, Mail, Compass, HelpCircle,
  ExternalLink, UserCheck, CheckSquare, MessageSquare, PlusCircle, Trash, Play, AlertCircle, Eye, EyeOff, Pencil, Key, RefreshCw, WifiOff
} from 'lucide-react';

const renderFormattedMessage = (text: string, role: 'user' | 'model') => {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, idx) => {
    const trimmedLine = line.trim();
    
    // Check if it's a bullet list item
    const isBullet = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ');
    let processedLine = line;
    let bulletOffsetClass = "";

    if (isBullet) {
      const bulletChar = trimmedLine.startsWith('- ') ? '- ' : '* ';
      const index = line.indexOf(bulletChar);
      processedLine = line.substring(index + 2);
      bulletOffsetClass = "ml-3 my-0.5 flex items-start space-x-1.5";
    }

    // Check if it's a numbered list item
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
    let isNumbered = false;
    let numberString = "";
    if (numberedMatch) {
      isNumbered = true;
      numberString = numberedMatch[1];
      const index = line.indexOf(numberedMatch[1] + '.');
      processedLine = line.substring(index + numberedMatch[1].length + 2);
      bulletOffsetClass = "ml-3 my-0.5 flex items-start space-x-1.5";
    }

    // Process bold tags: **text**
    const parts = processedLine.split('**');
    const parsedContent = parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <strong 
            key={i} 
            className={`font-extrabold ${role === 'user' ? 'text-white underline' : 'text-[#4F46E5]'}`}
          >
            {part}
          </strong>
        );
      }
      return part;
    });

    const bulletColorClass = role === 'user' ? 'text-white' : 'text-[#4F46E5]';

    if (isBullet) {
      return (
        <div key={idx} className={bulletOffsetClass}>
          <span className={`${bulletColorClass} font-bold shrink-0`}>•</span>
          <span className="flex-1 text-[11px] leading-relaxed">{parsedContent}</span>
        </div>
      );
    }

    if (isNumbered) {
      return (
        <div key={idx} className={bulletOffsetClass}>
          <span className={`${bulletColorClass} font-bold shrink-0 font-mono`}>{numberString}.</span>
          <span className="flex-1 text-[11px] leading-relaxed">{parsedContent}</span>
        </div>
      );
    }

    if (trimmedLine === '') {
      return <div key={idx} className="h-1.5" />;
    }

    return (
      <div key={idx} className="my-0.5 text-[11px] leading-relaxed">
        {parsedContent}
      </div>
    );
  });
};

export const GroupWorkspaceView: React.FC = () => {
  const { 
    members, 
    tasks, 
    commits, 
    polls, 
    events, 
    currentUser, 
    isLoggedIn, 
    addTask, 
    updateTaskStatus, 
    deleteTask, 
    votePollSlot, 
    createMeetingPoll,
    addEvent,
    toggleEventCompleted,
    addCommit,
    activeGroupId,
    setActiveGroupId,
    groups,
    feedback,
    submitFeedback,
    approveJoinRequest,
    declineJoinRequest,
    updateGroupEvaluationDate,
    updateGroupSettings,
    dbError,
    pendingActionsCount
  } = useProject();

  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'resources' | 'meetings' | 'team' | 'settings'>('overview');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  
  // Course evaluation date editing states
  const [isEditingEvalDate, setIsEditingEvalDate] = useState<boolean>(false);
  const [tempEvalDate, setTempEvalDate] = useState<string>('');
  
  // Collapsible AI panel toggle
  const [showAiPanel, setShowAiPanel] = useState<boolean>(true);
  
  // Workload Builder States
  const [workloadBuilderMode, setWorkloadBuilderMode] = useState<'ai' | 'manual'>('ai');
  
  // Peer Feedback submission form states
  const [feedbackQuality, setFeedbackQuality] = useState<number>(5);
  const [feedbackReliability, setFeedbackReliability] = useState<number>(5);
  const [feedbackCommunication, setFeedbackCommunication] = useState<number>(5);
  const [feedbackContribution, setFeedbackContribution] = useState<number>(5);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  
  // AI Chat Assistant States
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
  }>>([
    {
      id: 'welcome',
      role: 'model',
      content: "Hello! I am your 0-Mess AI Assistant. I can help summarize syllabus topics, coordinate task distributions, suggest calendar schedules, or outline code templates. What would you like to achieve today?",
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingToAi, setIsSendingToAi] = useState<boolean>(false);
  
  // Assignment Upload Simulator state
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; text?: string } | null>({
    name: "CS402_Project_Syllabus.pdf",
    size: "240 KB"
  });

  
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggested Task Breakdowns from AI (that users can add to workspace list)
  const [suggestedTasks, setSuggestedTasks] = useState([
    {
      id: "s_1",
      title: "Consensus Log Compaction RPCs",
      description: "Implement log compaction checkpoints to avoid infinite disk consumption in server nodes.",
      priority: "HIGH" as const,
      tags: ["Core Backend", "Logs"],
      assignees: ["mem_ethan"]
    },
    {
      id: "s_2",
      title: "Draft State Synchronization Section",
      description: "Write explanations for candidate split-brain logs election scenarios in the technical PDF.",
      priority: "MEDIUM" as const,
      tags: ["Technical Docs"],
      assignees: ["mem_mia", "user_alex"]
    },
    {
      id: "s_3",
      title: "Write Split-Brain Split partition Integration Tests",
      description: "Perform simulated networks disconnection scripts to verify leader election convergence states.",
      priority: "URGENT" as const,
      tags: ["Testing Suite"],
      assignees: ["user_alex", "mem_ethan"]
    }
  ]);

  // Resources state
  const [resources, setResources] = useState([
    { id: "r_1", title: "Shared Google Drive Folder", type: "Google Drive", category: "Google Drive", url: "https://drive.google.com", date: "Mapped 2 days ago", author: "Alex" },
    { id: "r_2", title: "Figma Interactive Mockup Canvas", type: "Figma", category: "Figma", url: "https://figma.com", date: "Mapped 3 days ago", author: "Sophia" },
    { id: "r_3", title: "Project Shared Code & Works", type: "GitHub", category: "GitHub", url: "https://github.com", date: "Mapped 1 day ago", author: "Liam" },
    { id: "r_4", title: "Raft Paper Official Specification Document", type: "Documents", category: "Documents", url: "https://raft.github.io/raft.pdf", date: "Uploaded 5 days ago", author: "Mia" }
  ]);

  // Add Resource state
  const [showAddResource, setShowAddResource] = useState<boolean>(false);
  const [resourceMode, setResourceMode] = useState<'link' | 'file'>('link');
  const [newResTitle, setNewResTitle] = useState<string>('');
  const [newResType, setNewResType] = useState<string>('Google Drive');
  const [newResUrl, setNewResUrl] = useState<string>('');
  const [newResDesc, setNewResDesc] = useState<string>('');

  // Edit Resource State
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editUrl, setEditUrl] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [selectedFileToUpload, setSelectedFileToUpload] = useState<File | null>(null);

  // Customizable category states
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Compute union of all category names: defaults + db-derived + newly created session categories
  const dbCategories = Array.from(new Set(resources.map(r => (r as any).category || r.type)));
  const allCategories = Array.from(new Set([
    'Google Drive',
    'Figma',
    'GitHub',
    'Documents',
    ...dbCategories,
    ...customCategories
  ]));

  // AI Planner & Task Completion state variables
  const [activeWorkloadTab, setActiveWorkloadTab] = useState<'board' | 'aiPlanner'>('board');
  const [inputTeamSize, setInputTeamSize] = useState<number>(5);
  const [inputDeadline, setInputDeadline] = useState<string>('2026-06-05');
  const [inputRequirements, setInputRequirements] = useState<string>('Implement leader election protocol states, split-brain testing simulation scripts, RocksDB consensus logs serialize, compaction checkpoints and live node visualizer monitors.');
  const [isGeneratingDistribution, setIsGeneratingDistribution] = useState<boolean>(false);
  const [activeDistribution, setActiveDistribution] = useState<null | any[]>(null);
  const [claimedRoleIds, setClaimedRoleIds] = useState<Record<string, string>>({});
  const [isTeammatesClaiming, setIsTeammatesClaiming] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);

  // Customizable task-splitting states
  const [fileSourceMode, setFileSourceMode] = useState<'upload' | 'hub'>('upload');
  const [selectedDescriptionFileId, setSelectedDescriptionFileId] = useState<string>('');
  const [refineSuggestion, setRefineSuggestion] = useState<string>('');
  const [isWorkloadConfirmed, setIsWorkloadConfirmed] = useState<boolean>(false);
  
  // Progress logging form state
  const [activeLogTask, setActiveLogTask] = useState<Task | null>(null);
  const [progressDesc, setProgressDesc] = useState<string>('');
  const [linkedResourceId, setLinkedResourceId] = useState<string>('');

  // Propose meeting poll state
  const [pollTitle, setPollTitle] = useState<string>('');
  const [pollDesc, setPollDesc] = useState<string>('');
  const [proposedSlots, setProposedSlots] = useState<string[]>(['Monday 4:00 PM - 5:30 PM', 'Wednesday 5:00 PM - 6:30 PM']);
  const [newSlotText, setNewSlotText] = useState<string>('');
  const [tempMeetingDateTime, setTempMeetingDateTime] = useState<string>('');

  // Add Milestone state
  const [showAddMilestoneForm, setShowAddMilestoneForm] = useState<boolean>(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<string>('');
  const [newMilestoneDate, setNewMilestoneDate] = useState<string>('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState<string>('');

  useEffect(() => {
    if (currentUser?.id) {
      setSelectedMemberId(currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (members && members.length > 0 && inputTeamSize > members.length) {
      setInputTeamSize(members.length);
    }
  }, [members, inputTeamSize]);

  const currentGroupObj = groups.find(g => g.id === activeGroupId) || groups[0];

  useEffect(() => {
    if (currentGroupObj && currentGroupObj.evaluationDate) {
      setTempEvalDate(currentGroupObj.evaluationDate);
    } else {
      setTempEvalDate('');
    }
  }, [currentGroupObj?.evaluationDate]);

  // Drag-and-drop mechanics
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileUpload = async (file: File, title?: string, description?: string, category?: string): Promise<string | null> => {
    setUploadedFile({
      name: title || file.name,
      size: (file.size / 1024).toFixed(0) + " KB"
    });
    setToastMessage("AI is indexing and generating embeddings for your file...");
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groupId', activeGroupId || 'CS402-G4');
      if (title) formData.append('title', title);
      if (description) formData.append('description', description);
      if (category) formData.append('category', category);

      const token = localStorage.getItem('firebase_id_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload and index file.');
      }

      const data = await response.json();
      setToastMessage(`Success! File "${title || file.name}" has been uploaded and indexed with ${data.chunksCount} chunks.`);
      
      // Fetch latest persistent files list from backend
      fetchUploadedFiles();
      return data.fileId || null;
    } catch (err: any) {
      console.error('File upload failed:', err);
      setToastMessage(`Upload failed: ${err.message}`);
      return null;
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const token = localStorage.getItem('firebase_id_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/files?groupId=${activeGroupId || 'CS402-G4'}`, {
        headers
      });
      if (response.ok) {
        const data = await response.json();
        setResources(prev => {
          // Keep only static links (whose IDs start with r_ and are not database files)
          const staticResources = prev.filter(r => r.id.startsWith('r_') && !(r as any).dbId);
          const dbResources = (data.files || []).map((file: any) => {
            const isLink = file.url && file.url !== '#';
            const dateStr = file.updated_at
              ? `Edited ${new Date(file.updated_at).toLocaleDateString()} ${new Date(file.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : `Uploaded ${new Date(file.created_at).toLocaleDateString()} ${new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            
            return {
              id: `db_${file.id}`,
              dbId: file.id,
              title: file.name,
              type: isLink ? (file.mime_type || 'Google Drive') : (file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT'),
              category: file.mime_type || 'Documents',
              url: file.url || '#',
              description: file.description || '',
              date: dateStr,
              author: 'Teammate'
            };
          });
          return [...staticResources, ...dbResources];
        });
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const handleDeleteResource = async (resId: string, dbId?: string) => {
    if (!dbId) {
      // Static resource, filter out locally
      setResources(prev => prev.filter(r => r.id !== resId));
      return;
    }

    setToastMessage("Removing file from AI context...");
    try {
      const token = localStorage.getItem('firebase_id_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`/api/files/${dbId}`, {
        method: 'DELETE',
        headers
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file.');
      }
      setToastMessage("File successfully deleted and removed from AI knowledge base.");
      setResources(prev => prev.filter(r => r.id !== resId));
    } catch (err: any) {
      console.error('Failed to delete file:', err);
      setToastMessage(`Delete failed: ${err.message}`);
    }
  };

  useEffect(() => {
    if (activeGroupId) {
      fetchUploadedFiles();
    }
  }, [activeGroupId]);


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleAddSuggestedTask = (su: typeof suggestedTasks[0]) => {
    addTask({
      title: su.title,
      description: su.description,
      status: 'NOT_STARTED',
      priority: su.priority,
      assignees: su.assignees.map(id => id === 'user_alex' ? currentUser.id : id),
      dueDate: '2026-06-03',
      tags: su.tags,
      groupId: activeGroupId || 'CS402-G4'
    });
    setSuggestedTasks(prev => prev.filter(t => t.id !== su.id));
  };

  // AI Workload Distribution API call
  const handleSuggestWorkloadDistribution = async () => {
    setIsGeneratingDistribution(true);
    setGenerationProgress(20);
    setToastMessage("Contacting AI task splitting service...");
    setIsWorkloadConfirmed(false);
    setClaimedRoleIds({});
    
    try {
      setGenerationProgress(50);
      setToastMessage("AI is analyzing requirements and documents...");
      
      const token = localStorage.getItem('firebase_id_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/ai/split-tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          teamSize: inputTeamSize,
          deadline: inputDeadline,
          requirements: inputRequirements,
          fileId: selectedDescriptionFileId || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to split tasks using AI.');
      }

      const data = await response.json();
      setGenerationProgress(100);
      setActiveDistribution(data.distribution || []);
      setToastMessage("AI workload distribution draft generated successfully! Review, edit, or regenerate with suggestions.");
    } catch (err: any) {
      console.error('Workload generation failed:', err);
      setToastMessage(`Failed to generate workloads: ${err.message}`);
    } finally {
      setIsGeneratingDistribution(false);
    }
  };

  // Regenerate workload with feedback suggestion
  const handleRegenerateWorkload = async () => {
    if (!activeDistribution) return;
    setIsGeneratingDistribution(true);
    setGenerationProgress(30);
    setToastMessage("Sending feedback suggestions to AI...");
    
    try {
      setGenerationProgress(60);
      setToastMessage("AI is refining workload distribution draft...");
      
      const token = localStorage.getItem('firebase_id_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/ai/split-tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          teamSize: inputTeamSize,
          deadline: inputDeadline,
          requirements: inputRequirements,
          fileId: selectedDescriptionFileId || null,
          suggestion: refineSuggestion.trim(),
          currentDistribution: activeDistribution
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refine tasks using AI.');
      }

      const data = await response.json();
      setGenerationProgress(100);
      setActiveDistribution(data.distribution || []);
      setRefineSuggestion('');
      setToastMessage("Workload distribution draft refined and regenerated successfully!");
    } catch (err: any) {
      console.error('Workload refinement failed:', err);
      setToastMessage(`Failed to refine workloads: ${err.message}`);
    } finally {
      setIsGeneratingDistribution(false);
    }
  };

  // Manual inline task editing utilities
  const handleUpdateTaskInWorkload = (workloadId: string, subtaskIndex: number, updatedFields: any) => {
    setActiveDistribution(prev => prev ? prev.map(w => {
      if (w.id !== workloadId) return w;
      const newSubtasks = [...w.subtasks];
      newSubtasks[subtaskIndex] = { ...newSubtasks[subtaskIndex], ...updatedFields };
      return { ...w, subtasks: newSubtasks };
    }) : null);
  };

  const handleRemoveTaskFromWorkload = (workloadId: string, subtaskIndex: number) => {
    setActiveDistribution(prev => prev ? prev.map(w => {
      if (w.id !== workloadId) return w;
      return { ...w, subtasks: w.subtasks.filter((_, idx) => idx !== subtaskIndex) };
    }) : null);
  };

  const handleAddTaskToWorkload = (workloadId: string) => {
    setActiveDistribution(prev => prev ? prev.map(w => {
      if (w.id !== workloadId) return w;
      return {
        ...w,
        subtasks: [
          ...w.subtasks,
          { title: "New Task Item", description: "Task description", priority: "MEDIUM" as const, tags: ["Development"] }
        ]
      };
    }) : null);
  };

  // Teammates selection simulator
  const handleClaimRole = (roleId: string) => {
    if (isTeammatesClaiming) return;

    // Assign to current user
    const newClaims = {
      ...claimedRoleIds,
      [currentUser.id]: roleId
    };
    setClaimedRoleIds(newClaims);
    setToastMessage("You claimed the role! Teammates are coordinating their selections live...");

    // Check if everything is claimed immediately (e.g. if team size is 1)
    if (Object.keys(newClaims).length === activeDistribution?.length) {
      setTimeout(() => {
        handleEnrolWorkloadTasksDirect(newClaims);
      }, 800);
      return;
    }

    setIsTeammatesClaiming(true);

    const colleagues = members.filter(m => m.id !== currentUser.id);
    const availableRoles = activeDistribution 
      ? activeDistribution.filter(r => r.id !== roleId)
      : [];
    
    const unclaimedRoleIds = availableRoles.map(r => r.id);
    const claimingColleagues = colleagues.slice(0, unclaimedRoleIds.length);

    let currentClaims = { ...newClaims };

    claimingColleagues.forEach((colleague, index) => {
      setTimeout(() => {
        if (unclaimedRoleIds.length > 0) {
          const selectedId = unclaimedRoleIds.shift();
          if (selectedId) {
            currentClaims = {
              ...currentClaims,
              [colleague.id]: selectedId
            };
            setClaimedRoleIds(currentClaims);

            const roleNameMatched = activeDistribution?.find(r => r.id === selectedId)?.roleName;
            setToastMessage(`${colleague.name} claimed '${roleNameMatched}'`);

            if (Object.keys(currentClaims).length === activeDistribution?.length) {
              setTimeout(() => {
                handleEnrolWorkloadTasksDirect(currentClaims);
              }, 800);
            }
          }
        }

        if (index === claimingColleagues.length - 1) {
          setIsTeammatesClaiming(false);
        }
      }, (index + 1) * 700);
    });
  };

  // Turn claimed roles and subtasks into live Kanban tasks automatically
  const handleEnrolWorkloadTasksDirect = (claimedMap: Record<string, string>) => {
    if (!activeDistribution) return;

    let totalAdded = 0;
    activeDistribution.forEach(role => {
      const assignedId = Object.keys(claimedMap).find(mId => claimedMap[mId] === role.id);
      const assigneesToSet = assignedId ? [assignedId] : [];

      role.subtasks.forEach((st: any) => {
        addTask({
          title: st.title,
          description: st.description,
          status: 'NOT_STARTED',
          priority: st.priority,
          assignees: assigneesToSet,
          dueDate: inputDeadline,
          tags: st.tags || [],
          groupId: activeGroupId || 'CS402-G4'
        });
        totalAdded++;
      });
    });

    setToastMessage(`Success! Automatically synchronized workloads and pushed ${totalAdded} personalized tasks into the 'To Do' Sprint Kanban board column.`);
    setActiveDistribution(null);
    setClaimedRoleIds({});
    setIsWorkloadConfirmed(false);
    setActiveWorkloadTab('board');
  };

  // Submit task progress update and click Done
  const handleLogProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLogTask) return;

    const resObj = resources.find(r => r.id === linkedResourceId);
    const linkedAttachment = resObj 
      ? { name: resObj.title, size: "Resource Asset", type: "resource" }
      : undefined;

    // Determine the assignee ID
    const primaryAssigneeId = activeLogTask.assignees.length > 0 
      ? activeLogTask.assignees[0] 
      : currentUser.id;
    const actorMember = members.find(m => m.id === primaryAssigneeId) || currentUser;

    // Complete the task in status state
    updateTaskStatus(activeLogTask.id, 'COMPLETED');

    // Add a custom contribution commit to context
    const progressTitle = `Completed: ${activeLogTask.title}`;
    const descText = progressDesc.trim() || `Successfully resolved tasks workload requirements. Linked reference asset: ${resObj?.title || 'None'}`;
    
    addCommit(
      progressTitle, 
      descText, 
      'code', 
      linkedAttachment, 
      { id: actorMember.id, name: actorMember.name }
    );

    // Done
    setActiveLogTask(null);
    setProgressDesc('');
    setLinkedResourceId('');
    setToastMessage(`Logged completed task work for ${actorMember.name}! Contribution logs successfully populated.`);
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCategoryName = newCategoryName.trim();
    if (!formattedCategoryName) return;

    if (allCategories.includes(formattedCategoryName)) {
      setToastMessage(`Category "${formattedCategoryName}" already exists!`);
      return;
    }

    setCustomCategories(prev => [...prev, formattedCategoryName]);
    // Automatically select the new category for upload form
    setNewResType(formattedCategoryName);
    setNewCategoryName('');
    setShowCreateCategoryModal(false);
    setToastMessage(`Category "${formattedCategoryName}" created successfully!`);
  };

  const handlePublishResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResTitle.trim()) return;

    if (resourceMode === 'link') {
      if (!newResUrl.trim()) return;
      setToastMessage("Saving shared resource link...");
      try {
        const token = localStorage.getItem('firebase_id_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/files/link', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: newResTitle.trim(),
            url: newResUrl.trim(),
            category: newResType,
            description: newResDesc.trim(),
            groupId: activeGroupId || 'CS402-G4'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit link.');
        }

        setToastMessage("Shared resource link saved successfully.");
        setNewResTitle('');
        setNewResUrl('');
        setNewResDesc('');
        setShowAddResource(false);
        fetchUploadedFiles();
      } catch (err: any) {
        console.error('Link submission failed:', err);
        setToastMessage(`Submission failed: ${err.message}`);
      }
    } else {
      if (!selectedFileToUpload) {
        setToastMessage("Please select a file to upload.");
        return;
      }
      await handleFileUpload(selectedFileToUpload, newResTitle, newResDesc, newResType);
      setSelectedFileToUpload(null);
      setNewResTitle('');
      setNewResDesc('');
      setShowAddResource(false);
    }
  };

  const handleEditResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource || !editTitle.trim()) return;

    setToastMessage("Updating resource details...");
    try {
      const token = localStorage.getItem('firebase_id_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/files/${editingResource.dbId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          url: editingResource.url !== '#' ? editUrl.trim() : '#'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update resource.');
      }

      setToastMessage("Resource details updated successfully.");
      setEditingResource(null);
      setEditTitle('');
      setEditUrl('');
      setEditDesc('');
      
      // Fetch latest persistent resource list
      fetchUploadedFiles();
    } catch (err: any) {
      console.error('Resource update failed:', err);
      setToastMessage(`Update failed: ${err.message}`);
    }
  };

  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !newMilestoneDate.trim()) return;
    addEvent(
      newMilestoneTitle,
      newMilestoneDate,
      'milestone',
      newMilestoneDesc || "No description provided."
    );
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setNewMilestoneDesc('');
    setShowAddMilestoneForm(false);
  };

  const handleMeetingPollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollTitle.trim() || proposedSlots.length === 0) return;
    createMeetingPoll(pollTitle, pollDesc || "Scheduled Team Synchronization Ballot", proposedSlots);
    setPollTitle('');
    setPollDesc('');
    setProposedSlots([]);
  };

  const handleAddProposedSlot = () => {
    if (tempMeetingDateTime) {
      const dateObj = new Date(tempMeetingDateTime);
      if (!isNaN(dateObj.getTime())) {
        const options: Intl.DateTimeFormatOptions = { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: 'numeric', 
          hour12: true 
        };
        const formattedDate = dateObj.toLocaleDateString('en-US', options);
        setProposedSlots(prev => [...prev, formattedDate]);
        setTempMeetingDateTime('');
        return;
      }
    }
    if (!newSlotText.trim()) return;
    setProposedSlots(prev => [...prev, newSlotText.trim()]);
    setNewSlotText('');
  };

  const handleSendChat = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || chatInput).trim();
    if (!textToSend || isSendingToAi) return;

    setChatInput('');

    const userMsg = {
      id: Math.random().toString(),
      role: 'user' as const,
      content: textToSend,
      timestamp: new Date()
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setIsSendingToAi(true);

    try {
      const token = localStorage.getItem('firebase_id_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: textToSend,
          groupId: activeGroupId || 'CS402-G4'
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'model' as const,
          content: data.reply,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'model' as const,
          content: "Oops! I encountered an issue connecting with the 0-Mess AI chat endpoint. Make sure the backend server or connection is active.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsSendingToAi(false);
    }
  };

  const milestoneEvents = events.filter(e => e.type === 'milestone');
  const completionPercent = milestoneEvents.length > 0
    ? Math.round((milestoneEvents.filter(e => e.completed).length / milestoneEvents.length) * 100)
    : 0;

  // Guard Clause: If the database is loading, empty, or the selected workspace cannot be resolved in the active groups list,
  // return a clean, user-friendly fallback view rather than triggering a component crash due to undefined references.
  if (!currentGroupObj) {
    return (
      <div className="flex h-screen w-full select-none font-sans overflow-hidden bg-white">
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 text-center">
          <div className="max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-6.5 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-[#111111] mb-2">Workspace Not Found</h2>
            <p className="text-[#666666] text-xs mb-6 leading-relaxed">
              We couldn't retrieve the selected group workspace. This could occur if the workspace has been deleted or your database connection is offline.
            </p>
            <button
              onClick={() => setActiveGroupId(null)}
              className="cursor-pointer bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full select-none font-sans overflow-hidden bg-white">
      {/* Centered Workspace Panel Layout */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 md:px-10 py-6">
        
        {/* Offline/Sync Status Banner */}
        {pendingActionsCount > 0 && (
          <div className={`border rounded-xl p-3.5 flex items-center justify-between text-xs font-medium mb-4 animate-fade-in shrink-0 ${
            navigator.onLine 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center space-x-2.5">
              {navigator.onLine ? (
                <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {navigator.onLine ? 'Synchronizing Updates: ' : 'Offline Mode: '}
                </span>
                <span>
                  {navigator.onLine 
                    ? `Merging ${pendingActionsCount} queued update${pendingActionsCount === 1 ? '' : 's'} with Supabase server...`
                    : `${pendingActionsCount} update${pendingActionsCount === 1 ? '' : 's'} queued to sync. Changes will save automatically when online.`
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top-Level Database Error connection/warning banner */}
        {dbError && !dbError.includes('Offline Mode') && !dbError.includes('Synchronizing') && !dbError.includes('connection issue') && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-rose-900 font-medium mb-6 animate-fade-in shrink-0">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Cloud Sync Suspended: </span>
                <span>Database tables missing. Local Storage caching is active. Run </span>
                <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-[10px] text-rose-800">backend/supabase_schema.sql</code>
                <span> in Supabase SQL editor to enable database replication sync.</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Breadcrumb Sub-Header */}
        <div className="flex items-center space-x-2 text-[10px] text-[#888888] font-mono mb-4">
          <button 
            onClick={() => setActiveGroupId(null)}
            className="hover:text-[#4F46E5] uppercase tracking-wider font-bold transition-colors cursor-pointer"
          >
            Workspaces
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-slate-900">{currentGroupObj.name}</span>
        </div>

        {/* Workspace Title Suffix */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-[#111111] tracking-tight">{currentGroupObj.name}</h1>
            <p className="text-[#666666] text-xs mt-0.5">{currentGroupObj.description}</p>
          </div>
          
          <div className="flex items-center space-x-2.5">
            {/* Toggle Collapsible AI Button */}
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className={`cursor-pointer inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 border rounded-lg transition-all ${
                showAiPanel 
                  ? 'bg-indigo-55 text-white bg-[#4F46E5] border-[#4F46E5]' 
                  : 'bg-white text-slate-600 border-[#E5E7EB] hover:bg-[#FAFAFA]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{showAiPanel ? "Hide AI Chat" : "Chat with AI"}</span>
            </button>
          </div>
        </div>

        {/* Tab Row Selector */}
        <div className="flex space-x-5 border-b border-[#F3F4F6] text-xs font-semibold mb-8">
          {([
            'overview', 'tasks', 'resources', 'meetings', 'team',
            ...(currentGroupObj.ownerId === currentUser.id ? ['settings'] : [])
          ] as ('overview' | 'tasks' | 'resources' | 'meetings' | 'team' | 'settings')[]).map((tab) => (

            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer pb-2.5 px-0.5 border-b-2 text-xs transition-all relative ${
                activeTab === tab 
                  ? 'border-[#4F46E5] text-[#111111] font-bold' 
                  : 'border-transparent text-[#666666] hover:text-[#111111]'
              }`}
            >
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Inner Tab Viewport */}
        <div className="flex-1">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">


              {/* Deadline progress bar */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5.5">
                <div className="flex justify-between items-center text-xs font-bold text-[#111111] mb-2">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-[#4F46E5]" />
                    <span>Group Project Progress</span>
                  </div>
                  <span className="font-mono text-[#4F46E5]">{completionPercent}% done</span>
                </div>
                
                {/* Horizontal Progress bar */}
                <div className="w-full bg-[#F3F4F6] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] h-full duration-500 ease-in-out transition-all" 
                    style={{ width: `${completionPercent}%` }} 
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#666666] mt-2.5">
                  <span>{milestoneEvents.filter(e => e.completed).length} of {milestoneEvents.length} milestones reached</span>
                  <div className="flex items-center space-x-1.5 font-mono">
                    {isEditingEvalDate ? (
                      <div className="flex items-center space-x-1 bg-slate-50 p-1 border border-slate-200 rounded-lg">
                        <input
                          type="date"
                          value={tempEvalDate}
                          onChange={(e) => setTempEvalDate(e.target.value)}
                          className="bg-white border border-[#E5E7EB] rounded px-1.5 py-0.5 text-[10px] text-slate-800 focus:outline-hidden focus:border-[#4F46E5]"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (currentGroupObj) {
                              await updateGroupEvaluationDate(currentGroupObj.id, tempEvalDate);
                            }
                            setIsEditingEvalDate(false);
                          }}
                          className="bg-[#4F46E5] text-white rounded px-2 py-0.5 text-[9px] font-semibold hover:bg-[#4338CA] cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTempEvalDate(currentGroupObj?.evaluationDate || '');
                            setIsEditingEvalDate(false);
                          }}
                          className="bg-slate-200 text-slate-700 rounded px-2 py-0.5 text-[9px] font-semibold hover:bg-slate-350 hover:bg-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <span>
                          Course evaluation: {currentGroupObj?.evaluationDate ? (
                            (() => {
                              try {
                                const date = new Date(currentGroupObj.evaluationDate);
                                const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                date.setHours(0, 0, 0, 0);
                                const diffTime = date.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                let remainingText = "";
                                if (diffDays > 0) {
                                  remainingText = ` (${diffDays} days remaining)`;
                                } else if (diffDays === 0) {
                                  remainingText = " (Today)";
                                } else {
                                  remainingText = ` (${Math.abs(diffDays)} days ago)`;
                                }
                                
                                return `${formatted}${remainingText}`;
                              } catch (e) {
                                return currentGroupObj.evaluationDate;
                              }
                            })()
                          ) : (
                            <span className="text-slate-400">Not set</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTempEvalDate(currentGroupObj?.evaluationDate || '');
                            setIsEditingEvalDate(true);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Set course evaluation date"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* Upcoming milestones timeline & Activity feed split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                
                {/* Milestones timeline */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5.5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider font-mono text-[#888888]">Upcoming Milestones</h3>
                      <button 
                        onClick={() => setShowAddMilestoneForm(!showAddMilestoneForm)}
                        className="cursor-pointer text-[10px] font-bold text-[#4F46E5] hover:text-[#4338CA] flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{showAddMilestoneForm ? "Cancel" : "Add Milestone"}</span>
                      </button>
                    </div>

                    {showAddMilestoneForm && (
                      <form onSubmit={handleAddMilestoneSubmit} className="mb-4 p-3 bg-slate-50 border border-[#E5E7EB] rounded-xl space-y-2.5 animate-fade-in text-xs">
                        <div>
                          <label className="block text-[9px] font-mono font-bold uppercase mb-1 text-slate-500">Milestone Title</label>
                          <input 
                            required
                            type="text" 
                            placeholder="e.g. Iteration 1 Core Finished" 
                            value={newMilestoneTitle}
                            onChange={(e) => setNewMilestoneTitle(e.target.value)}
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded text-xs font-medium focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-mono font-bold uppercase mb-1 text-slate-500">Due Date</label>
                            <input 
                              required
                              type="date" 
                              value={newMilestoneDate}
                              onChange={(e) => setNewMilestoneDate(e.target.value)}
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded text-xs focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono font-bold uppercase mb-1 text-slate-500">Milestone Phase/Type</label>
                            <select 
                              className="w-full bg-white border border-[#E5E7EB] p-2 rounded text-xs select-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
                              disabled
                            >
                              <option>Milestone Event</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono font-bold uppercase mb-1 text-slate-500">Deliverables / Description</label>
                          <textarea 
                            rows={2}
                            placeholder="Briefly state key targets to achieve in this sprint..." 
                            value={newMilestoneDesc}
                            onChange={(e) => setNewMilestoneDesc(e.target.value)}
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded text-xs focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
                          />
                        </div>
                        <button 
                          type="submit"
                          className="cursor-pointer w-full bg-[#111111] hover:bg-[#4F46E5] text-white text-[10px] font-bold py-1.5 rounded transition-all"
                        >
                          Publish Milestone Event
                        </button>
                      </form>
                    )}

                    <div className="space-y-4">
                      {milestoneEvents.map((evt, idx) => {
                        const isCompleted = !!evt.completed;
                        return (
                          <div key={evt.id} className={`flex space-x-3 text-left p-2.5 rounded-xl border transition-all ${
                            isCompleted 
                              ? 'bg-emerald-50/25 border-emerald-100/60' 
                              : 'bg-white border-transparent hover:bg-[#FAFAFA]'
                          }`}>
                            <div className="flex flex-col items-center shrink-0 mt-0.5">
                              <button
                                type="button"
                                onClick={() => toggleEventCompleted(evt.id)}
                                className={`cursor-pointer w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                                  isCompleted 
                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                    : 'border-slate-300 hover:border-indigo-500 bg-white text-transparent'
                                }`}
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className={`text-xs font-bold leading-tight ${isCompleted ? 'text-slate-400 line-through' : 'text-[#111111]'}`}>
                                    {evt.title}
                                  </span>
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider font-sans select-none ${
                                    isCompleted 
                                      ? 'bg-[#10B981] text-white' 
                                      : 'bg-indigo-50 text-indigo-750 border border-indigo-100'
                                  }`}>
                                    {isCompleted ? 'Reached' : 'Upcoming'}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono text-[#888888] shrink-0 ml-2">{evt.time}</span>
                              </div>
                              <p className={`text-[11px] mt-1 leading-relaxed ${isCompleted ? 'text-slate-400 line-through' : 'text-[#666666]/95'}`}>
                                {evt.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Activity feed from commits (Contribution Logs) */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5.5 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-xs font-bold text-[#111111] mb-4 uppercase tracking-wider font-mono text-[#888888]">Contribution Logs</h3>
                    <div className="space-y-3.5 overflow-y-auto max-h-[450px] pr-1">
                      {commits.map((com) => (
                        <div key={com.id} className="p-3 bg-[#FAFAFA]/60 hover:bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl transition-all text-xs flex flex-col space-y-2 text-left">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-5.5 h-5.5 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center font-bold text-[9px] font-mono shrink-0 uppercase">
                                {com.authorName.slice(0, 2)}
                              </span>
                              <div>
                                <span className="font-bold text-[#111111] block leading-tight">{com.authorName}</span>
                                <span className="text-[8px] text-[#888888] font-mono block">
                                  {new Date(com.timestamp).toLocaleDateString()} at {new Date(com.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider font-sans border ${
                                com.type === 'code' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                com.type === 'docs' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                                com.type === 'testing' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                                com.type === 'design' ? 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-700' :
                                'bg-orange-50 border-orange-100 text-orange-700'
                              }`}>
                                {com.type}
                              </span>
                              <span className="text-[8px] font-mono font-bold bg-emerald-50 border border-emerald-150 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                +{com.linesAdded} lines
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-[#111111] leading-snug">{com.title}</p>
                            <p className="text-[10px] text-[#666666] leading-relaxed mt-0.5">{com.description}</p>
                          </div>
                          {com.attachment && (
                            <div className="p-1 px-2.5 bg-white border border-[#E5E7EB] rounded-lg inline-flex items-center space-x-2 text-[9px] text-[#4F46E5] font-semibold max-w-fit mt-1 self-start select-none">
                              <FileText className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{com.attachment.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {commits.length === 0 && (
                        <div className="text-center py-10 text-xs text-[#888888] italic">
                          No contribution logs registered yet. Complete Kanban tasks to begin registering log entries.
                        </div>
                      )}
                    </div>
                  </div>
                </div>


              </div>

            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-6 text-left">
              
              {/* System Messages Banner */}
              {toastMessage && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between text-xs text-indigo-900 font-medium animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{toastMessage}</span>
                  </div>
                  <button 
                    onClick={() => setToastMessage(null)} 
                    className="text-[10px] text-indigo-500 hover:text-indigo-950 font-bold uppercase tracking-wider pl-4 shrink-0 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* SECTION 1: WORKLOAD SUGGESTION ENGINE / BUILDER */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3 mb-1">
                  <div className="flex items-center space-x-2">
                    {workloadBuilderMode === 'ai' ? (
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    ) : (
                      <Pencil className="w-4 h-4 text-indigo-500" />
                    )}
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono">
                      {workloadBuilderMode === 'ai' ? "AI Workload Suggestion Engine" : "Manual Workload Builder"}
                    </h3>
                  </div>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setWorkloadBuilderMode('ai');
                        if (!isWorkloadConfirmed) setActiveDistribution(null);
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                        workloadBuilderMode === 'ai' ? 'bg-white text-[#4F46E5] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      AI Suggest
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkloadBuilderMode('manual');
                        if (!isWorkloadConfirmed) {
                          if (!activeDistribution) {
                            setActiveDistribution([
                              {
                                id: `role_${Date.now()}_1`,
                                roleName: "Developer Role 1",
                                description: "Responsibilities for role 1",
                                subtasks: [
                                  { title: "Task 1", description: "Details of task 1", priority: "MEDIUM" as const, tags: ["Development"] }
                                ]
                              }
                            ]);
                          }
                        }
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                        workloadBuilderMode === 'manual' ? 'bg-white text-[#4F46E5] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Manual Setup
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  
                  {/* GENERATOR INPUT FORM */}
                  {workloadBuilderMode === 'ai' && activeDistribution === null && !isGeneratingDistribution && (
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-5">
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-5 h-5 text-[#4F46E5]" />
                        <div>
                          <h3 className="font-extrabold text-[#111111] text-xs uppercase tracking-wider font-mono">AI Workload Suggestion Engine</h3>
                          <p className="text-[11px] text-[#666666]">Automatically partition core deliverables among active university group students.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* File Selector mode toggles */}
                        <div>
                          <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[10px] font-mono font-bold uppercase text-[#555555]">Project Description File</label>
                            <div className="flex space-x-1.5">
                              <button
                                type="button"
                                onClick={() => { setFileSourceMode('upload'); setSelectedDescriptionFileId(''); }}
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                  fileSourceMode === 'upload' ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Upload
                              </button>
                              <button
                                type="button"
                                onClick={() => setFileSourceMode('hub')}
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                  fileSourceMode === 'hub' ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                Hub
                              </button>
                            </div>
                          </div>

                          {fileSourceMode === 'upload' ? (
                            <div>
                              <input 
                                id="ai-planner-file-upload" 
                                type="file" 
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const fileId = await handleFileUpload(e.target.files[0]);
                                    if (fileId) setSelectedDescriptionFileId(fileId);
                                  }
                                }} 
                                className="hidden" 
                                accept=".pdf,.docx,.txt"
                              />
                              {uploadedFile ? (
                                <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-lg flex items-center justify-between">
                                  <div className="flex items-center space-x-2 min-w-0">
                                    <FileText className="w-4.5 h-4.5 text-[#4F46E5] shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <span className="block text-xs font-bold text-slate-800 truncate" title={uploadedFile.name}>{uploadedFile.name}</span>
                                      <span className="block text-[9px] text-slate-400 font-mono">{uploadedFile.size}</span>
                                    </div>
                                  </div>
                                  <label htmlFor="ai-planner-file-upload" className="cursor-pointer shrink-0 ml-1.5 text-[10px] bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-350 p-1 px-2 rounded font-sans font-bold text-slate-600 select-none">
                                    Change
                                  </label>
                                </div>
                              ) : (
                                <label htmlFor="ai-planner-file-upload" className="cursor-pointer border-2 border-dashed border-[#E5E7EB] hover:border-[#4F46E5] bg-slate-50 hover:bg-indigo-50/20 active:bg-indigo-50/30 rounded-xl p-3 flex flex-col items-center justify-center text-center duration-200">
                                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                  <span className="text-[11px] font-bold text-slate-800">Choose File</span>
                                  <span className="text-[9px] text-[#888888] font-mono">PDF, DOCX, TXT</span>
                                </label>
                              )}
                            </div>
                          ) : (
                            <div>
                              <select
                                value={selectedDescriptionFileId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedDescriptionFileId(val);
                                  const matchedFile = resources.find(r => (r as any).dbId === val);
                                  if (matchedFile) {
                                    setUploadedFile({
                                      name: matchedFile.title,
                                      size: "Resource Hub Document"
                                    });
                                  }
                                }}
                                className="w-full bg-white border border-[#E5E7EB] p-2.5 rounded-lg text-xs font-sans font-medium focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
                              >
                                <option value="">-- Select from Resource Hub --</option>
                                {resources.filter(r => (r as any).dbId && r.url === '#').map(r => (
                                  <option key={r.id} value={(r as any).dbId}>{r.title} ({r.type})</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Number of team members */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase mb-1.5 text-[#555555]">Number of Team Members ({inputTeamSize})</label>
                          <input 
                            type="number" 
                            min={1} 
                            max={members.length}
                            value={inputTeamSize} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              if (val > members.length) {
                                setToastMessage(`Number of roles cannot exceed active group members (${members.length}).`);
                                setInputTeamSize(members.length);
                              } else {
                                setInputTeamSize(val);
                              }
                            }} 
                            className="w-full bg-white border border-[#E5E7EB] p-2.5 rounded-lg text-xs font-sans font-medium focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
                          />
                        </div>

                        {/* Assignment Deadline */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase mb-1.5 text-[#555555]">Project Sprint Deadline</label>
                          <input 
                            type="date" 
                            value={inputDeadline} 
                            onChange={(e) => setInputDeadline(e.target.value)} 
                            className="w-full bg-white border border-[#E5E7EB] p-2.5 rounded-lg text-xs font-sans font-medium focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
                          />
                        </div>

                      </div>

                      {/* Special requirements */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase mb-1.5 text-[#555555]">Special Workload Instructions & Architecture Requirements</label>
                        <textarea 
                          rows={3}
                          value={inputRequirements}
                          onChange={(e) => setInputRequirements(e.target.value)}
                          placeholder="List grading multipliers, core algorithms (e.g., Raft checkpoints, partitioned test suites, styling controls)..."
                          className="w-full bg-white border border-[#E5E7EB] p-3 rounded-lg text-xs font-sans leading-relaxed focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none"
                        />
                      </div>

                      {/* Submit Trigger */}
                      <div className="pt-2">
                        <button 
                          onClick={handleSuggestWorkloadDistribution}
                          className="cursor-pointer bg-[#111111] hover:bg-[#4F46E5] text-white text-xs font-bold py-3 px-5 rounded-lg transition-all flex items-center space-x-2"
                        >
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Suggest Balanced Workload Distribution</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MANUAL INITIALIZER */}
                  {workloadBuilderMode === 'manual' && activeDistribution === null && (
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 text-center">
                      <Cpu className="w-8 h-8 text-indigo-500 mx-auto animate-pulse" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Create Workload Distribution Manually</h4>
                        <p className="text-[11px] text-[#666666]">Define specific developer roles and tasks for group members to claim.</p>
                      </div>
                      <button
                        onClick={() => {
                          const initialRoles = Array.from({ length: Math.min(members.length, 3) }, (_, i) => ({
                            id: `role_${Date.now()}_${i}`,
                            roleName: `Role ${i + 1}`,
                            description: `Workload description for role ${i + 1}`,
                            subtasks: [
                              { title: `Core Task ${i + 1}`, description: "Describe task requirements...", priority: "MEDIUM" as const, tags: ["Development"] }
                            ]
                          }));
                          setActiveDistribution(initialRoles);
                        }}
                        className="bg-[#111111] hover:bg-[#4F46E5] text-white text-xs font-bold py-2.5 px-5 rounded-lg transition-colors cursor-pointer"
                      >
                        Start Manual Workload Builder
                      </button>
                    </div>
                  )}

                  {/* AI DISCOVERING / THINKING LOADER */}
                  {isGeneratingDistribution && (
                    <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-10 text-center space-y-4">
                      <div className="inline-flex justify-center items-center w-12 h-12 bg-indigo-50 text-[#4F46E5] rounded-full animate-bounce">
                        <Cpu className="w-6 h-6 animate-pulse" />
                      </div>
                      
                      <div className="max-w-md mx-auto space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">0-Mess AI Synthesizing Backlogs</h4>
                        <p className="text-xs text-[#666666] leading-relaxed italic">"Analyzing document: {uploadedFile?.name || "Generic Syllabus"}. Mapping split-brain variables..."</p>
                      </div>

                      {/* Progress bar */}
                      <div className="max-w-xs mx-auto bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#4F46E5] h-full duration-300 transition-all" style={{ width: `${generationProgress}%` }} />
                      </div>
                    </div>
                  )}                  {/* ACTIVE SUGGESTIONS GRID */}
                  {activeDistribution !== null && !isGeneratingDistribution && (
                    <div className="space-y-6">
                      
                      {/* Refinement Prompt */}
                      {!isWorkloadConfirmed && (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-left">
                          <label className="block text-[10px] font-mono font-bold uppercase text-slate-650">Refine Workload Distribution Suggestions</label>
                          <div className="flex gap-2">
                            <textarea
                              value={refineSuggestion}
                              onChange={(e) => setRefineSuggestion(e.target.value)}
                              placeholder="e.g. Move database tasks to Slot 2, make Role 3 focus more on testing, or refine task details..."
                              rows={1}
                              className="flex-1 bg-white border border-[#E5E7EB] p-2 rounded-lg text-xs outline-none focus:border-[#4F46E5] resize-none"
                            />
                            <button
                              onClick={handleRegenerateWorkload}
                              disabled={isGeneratingDistribution || !refineSuggestion.trim()}
                              className="bg-[#111111] hover:bg-[#4F46E5] text-white text-xs font-bold px-4 py-2 rounded-lg shrink-0 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 transition-all"
                            >
                              Regenerate
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-indigo-50/20 border border-indigo-100 p-4 rounded-xl">
                        <div>
                          <h4 className="text-xs font-bold text-[#4F46E5] uppercase tracking-wider font-mono">
                            {isWorkloadConfirmed ? "Team Room Workload Distribution (Finalized)" : "Interactive Team Workload Editor"}
                          </h4>
                          <p className="text-[11px] text-[#555555] mt-0.5">
                            {isWorkloadConfirmed 
                              ? "The distribution is confirmed! Teammates must claim their bundles to sync tasks to the Kanban board."
                              : "Edit role names, modify tasks directly, or suggest refinement updates above."}
                          </p>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                          {workloadBuilderMode === 'manual' && !isWorkloadConfirmed && (
                            <button
                              onClick={() => {
                                setActiveDistribution(prev => [
                                  ...(prev || []),
                                  {
                                    id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                                    roleName: `Role ${(prev?.length || 0) + 1}`,
                                    description: "Description of new manual workload role...",
                                    subtasks: [
                                      { title: "Task Item 1", description: "Describe requirements...", priority: "MEDIUM" as const, tags: ["Development"] }
                                    ]
                                  }
                                ]);
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer border border-indigo-100"
                            >
                              + Add Role Slot
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setActiveDistribution(null);
                              setClaimedRoleIds({});
                              setIsWorkloadConfirmed(false);
                            }}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Reset Draft
                          </button>
                          
                          {!isWorkloadConfirmed && (
                            <button 
                              onClick={() => {
                                setIsWorkloadConfirmed(true);
                                setToastMessage("Workload distribution confirmed! Members can now claim their workload bundle.");
                              }}
                              className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                            >
                              Confirm Workload ✓
                            </button>
                          )}

                          {isWorkloadConfirmed && (
                            <div className="text-[11px] text-[#888888] bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 font-medium flex items-center">
                              Claimed: {Object.keys(claimedRoleIds).length}/{activeDistribution.length}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Role selection card deck */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeDistribution.map((role) => {
                          const userWhoClaimed = Object.keys(claimedRoleIds).find(mId => claimedRoleIds[mId] === role.id);
                          const claimedMemberObj = members.find(m => m.id === userWhoClaimed);
                          const isClaimedByMe = userWhoClaimed === currentUser.id;

                          return (
                            <div 
                              key={role.id} 
                              className={`bg-white border rounded-2xl p-5 flex flex-col justify-between min-h-[350px] relative transition-all ${
                                isClaimedByMe 
                                  ? 'border-2 border-[#4F46E5] ring-2 ring-indigo-50/50' 
                                  : userWhoClaimed 
                                    ? 'border-emerald-200 bg-emerald-50/10' 
                                    : 'border-[#E5E7EB] hover:border-[#4F46E5]/40'
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-mono bg-[#FAFAFA] text-[#888888] px-2 py-0.5 rounded border border-[#E5E7EB] uppercase font-bold">
                                    {isWorkloadConfirmed ? "Confirmed Slot" : "Editable Draft"}
                                  </span>

                                  {/* Delete Role Button for Manual Setup */}
                                  {workloadBuilderMode === 'manual' && !isWorkloadConfirmed && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDistribution(prev => prev ? prev.filter(w => w.id !== role.id) : null);
                                      }}
                                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-0.5"
                                      title="Remove Workload Card"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {claimedMemberObj ? (
                                    <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 p-1 px-1.5 rounded-full text-[9px] font-bold text-slate-800">
                                      <span className={`w-3.5 h-3.5 rounded-full ${claimedMemberObj.color} text-white flex items-center justify-center text-[7px] font-bold`}>
                                        {claimedMemberObj.avatar}
                                      </span>
                                      <span className="truncate max-w-[80px]">{claimedMemberObj.name.split(' ')[0]}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-150 font-semibold uppercase animate-pulse">
                                      Unclaimed
                                    </span>
                                  )}
                                </div>

                                {/* Editable Role Name */}
                                {isWorkloadConfirmed ? (
                                  <h3 className="text-xs font-bold text-slate-900 mt-2.5">{role.roleName}</h3>
                                ) : (
                                  <input
                                    type="text"
                                    value={role.roleName}
                                    onChange={(e) => {
                                      const updated = activeDistribution.map(w => w.id === role.id ? { ...w, roleName: e.target.value } : w);
                                      setActiveDistribution(updated);
                                    }}
                                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-xs font-bold text-slate-900 mt-2.5 p-1 px-2 rounded border border-slate-200 outline-none"
                                  />
                                )}

                                {/* Editable Description */}
                                {isWorkloadConfirmed ? (
                                  <p className="text-[11px] text-[#666666] leading-relaxed mt-1">{role.description}</p>
                                ) : (
                                  <textarea
                                    value={role.description}
                                    rows={2}
                                    onChange={(e) => {
                                      const updated = activeDistribution.map(w => w.id === role.id ? { ...w, description: e.target.value } : w);
                                      setActiveDistribution(updated);
                                    }}
                                    className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-[10px] text-slate-600 leading-relaxed mt-1.5 p-1 px-2 rounded border border-slate-200 outline-none"
                                  />
                                )}

                                {/* List of sub-tasks broken down */}
                                <div className="mt-4 border-t border-slate-100 pt-3 space-y-2.5">
                                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Workload Tasks:</span>
                                  {role.subtasks.map((st: any, sIdx: number) => (
                                    <div key={sIdx} className="bg-slate-50/75 border border-slate-100 p-2.5 rounded-lg text-left relative group">
                                      
                                      {/* Inline Delete Button */}
                                      {!isWorkloadConfirmed && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveTaskFromWorkload(role.id, sIdx)}
                                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 cursor-pointer transition-opacity"
                                        >
                                          <Trash className="w-3 h-3" />
                                        </button>
                                      )}

                                      {isWorkloadConfirmed ? (
                                        <div>
                                          <div className="flex items-center justify-between gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-900 truncate pr-6">{st.title}</span>
                                            <span className="text-[8px] font-mono bg-indigo-50 text-indigo-700 px-1 rounded-sm uppercase font-semibold shrink-0">{st.priority}</span>
                                          </div>
                                          <p className="text-[9px] text-slate-550 mt-0.5 leading-snug">{st.description}</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5">
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="text"
                                              value={st.title}
                                              placeholder="Task Title"
                                              onChange={(e) => handleUpdateTaskInWorkload(role.id, sIdx, { title: e.target.value })}
                                              className="flex-1 bg-white focus:bg-white text-[10px] font-bold text-slate-900 p-1 rounded border border-slate-200 outline-none"
                                            />
                                            <select
                                              value={st.priority}
                                              onChange={(e) => handleUpdateTaskInWorkload(role.id, sIdx, { priority: e.target.value })}
                                              className="bg-white text-[8px] font-bold text-slate-700 p-1 rounded border border-slate-200 outline-none"
                                            >
                                              <option value="URGENT">URGENT</option>
                                              <option value="HIGH">HIGH</option>
                                              <option value="MEDIUM">MEDIUM</option>
                                              <option value="LOW">LOW</option>
                                            </select>
                                          </div>
                                          <textarea
                                            value={st.description}
                                            placeholder="Task details"
                                            rows={1}
                                            onChange={(e) => handleUpdateTaskInWorkload(role.id, sIdx, { description: e.target.value })}
                                            className="w-full bg-white text-[9px] text-slate-500 p-1 rounded border border-slate-200 outline-none resize-none leading-relaxed"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {/* Add Task Button */}
                                  {!isWorkloadConfirmed && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddTaskToWorkload(role.id)}
                                      className="w-full border border-dashed border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50/50 text-slate-550 hover:text-slate-800 text-[9px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer text-center"
                                    >
                                      + Add Task Item
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 pt-3.5 border-t border-slate-100">
                                {!isWorkloadConfirmed ? (
                                  <div className="text-center py-2 text-[10px] text-slate-400 font-mono italic">
                                    Confirm draft to enable claiming
                                  </div>
                                ) : claimedMemberObj ? (
                                  <div className="text-center py-2 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
                                    ✓ Claimed by {claimedMemberObj.name}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleClaimRole(role.id)}
                                    disabled={isTeammatesClaiming}
                                    className="cursor-pointer w-full bg-[#111111] hover:bg-[#4F46E5] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[10px] font-bold py-2 rounded-lg transition-colors text-center"
                                  >
                                    {isTeammatesClaiming ? "Coordinating claim..." : "Claim Role Workload"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}


                </div>
              </div>

              {/* SECTION 2: SPRINT KANBAN BOARD */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-[#F3F4F6] pb-3 mb-1">
                  <div>
                    <h3 className="font-extrabold text-[#111111] text-xs uppercase tracking-wider font-mono">Sprint Kanban Board</h3>
                    <p className="text-[10px] text-[#666666] mt-0.5">Track developer action items and submit raw Git contribution logs upon completion.</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-0.5 rounded-full select-none">
                    {tasks.filter(t => t.status === 'COMPLETED').length} / {tasks.length} Done
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* To Do Column */}
                  <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-[#111111] uppercase tracking-wider font-mono">To Do</span>
                      <span className="bg-[#E5E7EB] text-[#111111] text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
                        {tasks.filter(t => t.status === 'NOT_STARTED').length}
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {tasks.filter(t => t.status === 'NOT_STARTED').map((task) => {
                        const isLoggingThis = activeLogTask?.id === task.id;

                        return (
                          <div key={task.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-2xs hover:border-[#4F46E5]/40 transition-all text-left">
                            
                            {/* Standard Header */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-mono bg-[#FAFAFA] text-[#888888] px-1.5 rounded-sm">
                                {task.priority}
                              </span>
                              <button 
                                onClick={() => deleteTask(task.id)}
                                className="text-[#999999] hover:text-[#EF4444] transition-colors"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>

                            <h4 className="text-xs font-bold text-[#111111] leading-snug">{task.title}</h4>
                            <p className="text-[10px] text-[#666666] mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
                            
                            {/* INTERACTIVE PROGRESS LOGGER INLINE */}
                            {isLoggingThis ? (
                              <form onSubmit={handleLogProgressSubmit} className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                                <label className="block text-[8px] font-mono uppercase font-bold text-slate-500">Log Progress Description</label>
                                <textarea
                                  required
                                  rows={2}
                                  value={progressDesc}
                                  onChange={(e) => setProgressDesc(e.target.value)}
                                  placeholder="What has been completed? Write details..."
                                  className="w-full text-[10px] p-2 bg-white border border-[#E5E7EB] rounded focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none font-sans"
                                />

                                <label className="block text-[8px] font-mono uppercase font-bold text-slate-500">Link reference from resources</label>
                                <select
                                  value={linkedResourceId}
                                  onChange={(e) => setLinkedResourceId(e.target.value)}
                                  className="w-full text-[10px] p-2 bg-white border border-[#E5E7EB] rounded focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none font-sans"
                                >
                                  <option value="">-- No Linked Reference --</option>
                                  {resources.map(res => (
                                    <option key={res.id} value={res.id}>{res.title} ({res.type})</option>
                                  ))}
                                </select>

                                <div className="flex gap-2 pt-1 font-bold">
                                  <button
                                    type="submit"
                                    className="cursor-pointer flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] py-1.5 rounded transition-all text-center uppercase"
                                  >
                                    Done & Log
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveLogTask(null)}
                                    className="cursor-pointer px-2 bg-white border border-slate-200 text-slate-600 text-[9px] py-1.5 rounded hover:bg-slate-50 transition-all uppercase"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="border-t border-[#F3F4F6] pt-2.5 mt-3 flex items-center justify-between">
                                <div className="flex space-x-1">
                                  {task.assignees.map(mId => {
                                    const m = members.find(member => member.id === mId);
                                    return (
                                      <span 
                                        key={mId} 
                                        title={m?.name}
                                        className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white uppercase shrink-0 ${m?.color || 'bg-slate-400'}`}
                                      >
                                        {m?.avatar || 'ST'}
                                      </span>
                                    );
                                  })}
                                </div>
                                
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                                    className="cursor-pointer bg-[#FAFAFA] hover:bg-indigo-50 border border-[#E5E7EB] hover:border-indigo-100 text-[#111111] hover:text-[#4F46E5] text-[9px] font-bold px-2 py-1 rounded transition-all"
                                  >
                                    Start →
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveLogTask(task);
                                      setProgressDesc('');
                                      setLinkedResourceId('');
                                    }}
                                    className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-1 rounded border border-emerald-100 transition-all whitespace-nowrap"
                                  >
                                    Complete ✓
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                      
                      {tasks.filter(t => t.status === 'NOT_STARTED').length === 0 && (
                        <div className="text-center py-8 text-[11px] text-[#888888] bg-white border border-dashed border-[#E5E7EB] rounded-xl">
                          No outstanding cards.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-[#111111] uppercase tracking-wider font-mono">In Progress</span>
                      <span className="bg-[#E5E7EB] text-[#111111] text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
                        {tasks.filter(t => t.status === 'IN_PROGRESS').length}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {tasks.filter(t => t.status === 'IN_PROGRESS').map((task) => {
                        const isLoggingThis = activeLogTask?.id === task.id;

                        return (
                          <div key={task.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-2xs hover:border-[#4F46E5]/40 transition-all text-left">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[9px] font-mono bg-[#FAFAFA] text-[#888888] px-1.5 rounded-sm">
                                {task.priority}
                              </span>
                              <button 
                                onClick={() => deleteTask(task.id)}
                                className="text-[#999999] hover:text-[#EF4444] transition-colors"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <h4 className="text-xs font-bold text-[#111111] leading-snug">{task.title}</h4>
                            <p className="text-[10px] text-[#666666] mt-1 line-clamp-2 leading-relaxed">{task.description}</p>

                            {/* INTERACTIVE PROGRESS LOGGER INLINE */}
                            {isLoggingThis ? (
                              <form onSubmit={handleLogProgressSubmit} className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                                <label className="block text-[8px] font-mono uppercase font-bold text-slate-500">Log Progress Description</label>
                                <textarea
                                  required
                                  rows={2}
                                  value={progressDesc}
                                  onChange={(e) => setProgressDesc(e.target.value)}
                                  placeholder="Describe exact details completed and metrics validated..."
                                  className="w-full text-[10px] p-2 bg-white border border-[#E5E7EB] rounded focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none font-sans"
                                />

                                <label className="block text-[8px] font-mono uppercase font-bold text-slate-500">Link reference from resources</label>
                                <select
                                  value={linkedResourceId}
                                  onChange={(e) => setLinkedResourceId(e.target.value)}
                                  className="w-full text-[10px] p-2 bg-white border border-[#E5E7EB] rounded focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none font-sans"
                                >
                                  <option value="">-- No Linked Reference --</option>
                                  {resources.map(res => (
                                    <option key={res.id} value={res.id}>{res.title} ({res.type})</option>
                                  ))}
                                </select>

                                <div className="flex gap-2 pt-1 font-bold">
                                  <button
                                    type="submit"
                                    className="cursor-pointer flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] py-1.5 rounded transition-all text-center uppercase"
                                  >
                                    Done & Log
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveLogTask(null)}
                                    className="cursor-pointer px-2 bg-white border border-slate-200 text-slate-600 text-[9px] py-1.5 rounded hover:bg-slate-50 transition-all uppercase"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="border-t border-[#F3F4F6] pt-2.5 mt-3 flex items-center justify-between">
                                <div className="flex space-x-1">
                                  {task.assignees.map(mId => {
                                    const m = members.find(member => member.id === mId);
                                    return (
                                      <span 
                                        key={mId} 
                                        title={m?.name}
                                        className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white uppercase shrink-0 ${m?.color || 'bg-slate-400'}`}
                                      >
                                        {m?.avatar || 'ST'}
                                      </span>
                                    );
                                  })}
                                </div>

                                <button
                                  onClick={() => {
                                    setActiveLogTask(task);
                                    setProgressDesc('');
                                    setLinkedResourceId('');
                                  }}
                                  className="cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-semibold px-2 py-1 rounded border border-emerald-100 transition-all flex items-center space-x-1"
                                >
                                  <span>Update Progress</span>
                                </button>
                              </div>
                            )}

                          </div>
                        );
                      })}

                      {tasks.filter(t => t.status === 'IN_PROGRESS').length === 0 && (
                        <div className="text-center py-8 text-[11px] text-[#888888] bg-white border border-dashed border-[#E5E7EB] rounded-xl">
                          No active builds.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Done Column */}
                  <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-[#111111] uppercase tracking-wider font-mono">Done</span>
                      <span className="bg-[#E5E7EB] text-[#111111] text-[10px] font-bold font-mono px-2 py-0.5 rounded-full">
                        {tasks.filter(t => t.status === 'COMPLETED').length}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {tasks.filter(t => t.status === 'COMPLETED').map((task) => (
                        <div key={task.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-2xs hover:border-[#4F46E5]/40 transition-all text-left">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-mono bg-[#FAFAFA] text-[#888888] px-1.5 rounded-sm line-through">
                              {task.priority}
                            </span>
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="text-[#999999] hover:text-[#EF4444] transition-colors"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                          <h4 className="text-xs font-bold text-[#111111] leading-snug line-through text-[#666666]">{task.title}</h4>
                          <p className="text-[10px] text-[#888888] mt-1 line-clamp-2 leading-relaxed line-through">{task.description}</p>

                          <div className="border-t border-[#F3F4F6] pt-2.5 mt-3 flex items-center justify-end">
                            <div className="flex space-x-1">
                              {task.assignees.map(mId => {
                                const m = members.find(member => member.id === mId);
                                return (
                                  <span 
                                    key={mId} 
                                    title={m?.name}
                                    className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white uppercase shrink-0 ${m?.color || 'bg-slate-400'}`}
                                  >
                                    {m?.avatar || 'ST'}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}

                      {tasks.filter(t => t.status === 'COMPLETED').length === 0 && (
                        <div className="text-center py-8 text-[11px] text-[#888888] bg-white border border-dashed border-[#E5E7EB] rounded-xl">
                          No resolved tasks.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* RESOURCES TAB */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              
              {/* Organized grid headings */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-[#111111] tracking-tight">Centralized Workspace Resource Hub</h3>
                  <p className="text-[#666666] text-xs">Reference, update, and manage all shared project resources, documents, and design assets in one collaborative repository.</p>
                </div>
                
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategoryName('');
                      setShowCreateCategoryModal(true);
                    }}
                    className="cursor-pointer bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg transition-all"
                  >
                    Create Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddResource(!showAddResource)}
                    className="cursor-pointer bg-[#111111] hover:bg-[#4F46E5] text-white font-semibold text-xs px-3 py-2 rounded-lg transition-all"
                  >
                    {showAddResource ? "Close Creator" : "Submit Resource"}
                  </button>
                </div>
              </div>



              {/* Asset grid blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {allCategories.map(category => {
                  const categoryResources = resources.filter(r => ((r as any).category || r.type) === category);
                  
                  return (
                    <div key={category} className="bg-white border border-[#E5E7EB] rounded-2xl p-5 text-left flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-3.5">
                          <span className="text-[10px] uppercase font-mono font-bold text-[#4F46E5]">
                            {category}
                          </span>
                          <span className="text-[9px] bg-slate-50 text-slate-500 font-mono font-bold px-1.5 py-0.5 rounded-full border border-slate-100">
                            {categoryResources.length} {categoryResources.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                          {categoryResources.map(item => (
                            <div key={item.id} className="flex flex-col p-3 bg-[#FAFAFA] rounded-xl border border-[#E5E7EB]">
                              <div className="flex items-start justify-between min-w-0">
                                <div className="min-w-0 pr-2 flex-1">
                                  <div className="flex items-center space-x-1.5 min-w-0 flex-wrap gap-y-1">
                                    <h4 className="text-xs font-bold text-[#111111] truncate max-w-[140px] sm:max-w-[180px]">{item.title}</h4>
                                    {(!item.url || item.url === '#') && item.type && (
                                      <span className="inline-block text-[8px] bg-slate-100 text-slate-700 font-bold px-1 py-0.5 rounded font-mono shrink-0">
                                        {item.type}
                                      </span>
                                    )}
                                    {(item as any).dbId && (
                                      <span className="inline-block text-[8px] bg-indigo-50 text-[#4F46E5] font-extrabold px-1.5 py-0.5 rounded-sm font-mono uppercase tracking-wider shrink-0">
                                        AI Indexed
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-[#888888]">{item.date} by {item.author}</span>
                                </div>
                                <div className="flex items-center space-x-2 shrink-0">
                                  {item.url !== '#' && (
                                    <a href={item.url} target="_blank" rel="noreferrer" className="text-[#888888] hover:text-[#4F46E5] transition-colors">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {(item as any).dbId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingResource(item);
                                        setEditTitle(item.title);
                                        setEditUrl(item.url);
                                        setEditDesc((item as any).description || '');
                                      }}
                                      className="text-[#999999] hover:text-[#4F46E5] transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteResource(item.id, (item as any).dbId)}
                                    className="text-[#999999] hover:text-[#EF4444] transition-colors cursor-pointer"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {/* Description */}
                              {(item as any).description && (
                                <p className="text-[10px] text-[#666666] mt-1.5 leading-relaxed bg-white/60 p-1.5 rounded-md border border-slate-100/30 text-left font-sans italic">
                                  {(item as any).description}
                                </p>
                              )}
                            </div>
                          ))}
                          
                          {categoryResources.length === 0 && (
                            <div className="text-center py-8 text-[10px] text-[#888888] bg-[#FAFAFA]/50 border border-dashed border-[#E5E7EB] rounded-xl font-mono">
                              No resources in this category yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Publish Resource Symmetrical Card */}
                {showAddResource && (
                  <div className="sm:col-span-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-2xl p-5.5 space-y-4 text-left animate-slide-in">
                    <div>
                      <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider font-mono">Publish Workspace Resource</h3>
                      <p className="text-[#666666] text-[10px] mt-0.5">Submit links or upload files to make them accessible to all workspace users and indexed for the AI partner.</p>
                    </div>

                    <form onSubmit={handlePublishResourceSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Resource Mode</label>
                          <select
                            value={resourceMode}
                            onChange={(e) => setResourceMode(e.target.value as 'link' | 'file')}
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-lg text-xs"
                          >
                            <option value="link">Web Link / URL</option>
                            <option value="file">Document File</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Workspace Category</label>
                          <select
                            value={newResType}
                            onChange={(e) => setNewResType(e.target.value)}
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-lg text-xs"
                          >
                            {allCategories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Resource Title</label>
                          <input 
                            type="text" 
                            required
                            value={newResTitle}
                            onChange={(e) => setNewResTitle(e.target.value)}
                            placeholder="e.g. Project Specs"
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {resourceMode === 'link' ? (
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Web Link / URL</label>
                          <input 
                            type="url" 
                            required
                            value={newResUrl}
                            onChange={(e) => setNewResUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white border border-[#E5E7EB] p-2 rounded-lg text-xs"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Document File</label>
                          {!selectedFileToUpload ? (
                            <div 
                              onClick={() => {
                                const fileInput = document.getElementById('resources-tab-file-input');
                                if (fileInput) fileInput.click();
                              }}
                              className="bg-white border-2 border-dashed border-[#E5E7EB] hover:border-[#4F46E5] rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center"
                            >
                              <Upload className="w-6 h-6 text-slate-400 mb-2" />
                              <p className="text-[10px] font-bold text-slate-900">Click to browse and upload file</p>
                              <p className="text-[8px] text-slate-500 mt-0.5">Supports PDF, DOCX or TXT (Max 5 MB)</p>
                              
                              <input 
                                id="resources-tab-file-input"
                                type="file" 
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    setSelectedFileToUpload(file);
                                    if (!newResTitle) {
                                      setNewResTitle(file.name);
                                    }
                                  }
                                }}
                                className="hidden" 
                                accept=".pdf,.docx,.txt"
                              />
                            </div>
                          ) : (
                            <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl flex items-center space-x-2 text-left">
                              <FileText className="w-5 h-5 text-[#4F46E5]" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">{selectedFileToUpload.name}</p>
                                <p className="text-[9px] text-slate-500 font-mono">{(selectedFileToUpload.size / 1024).toFixed(0)} KB</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFileToUpload(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 text-[10px] font-bold cursor-pointer"
                              >
                                Reset File
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Resource Description / Context</label>
                        <textarea 
                          value={newResDesc}
                          onChange={(e) => setNewResDesc(e.target.value)}
                          placeholder="Provide a brief context or description of this resource for tracking..."
                          rows={2}
                          className="w-full bg-white border border-[#E5E7EB] p-2 rounded-lg text-xs"
                        />
                      </div>

                      <button 
                        type="submit"
                        className="w-full cursor-pointer bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                      >
                        Publish Resource
                      </button>
                    </form>
                  </div>
                )}

              </div>

            </div>
          )}
          {/* MEETINGS TAB */}
          {activeTab === 'meetings' && (

            <div className="space-y-6 text-left">
              
              {/* Header */}
              <div>
                <h3 className="text-sm font-extrabold text-[#111111] tracking-tight">Team Synchronizations & Scheduling</h3>
                <p className="text-[#666666] text-xs">Propose meeting options, vote on availability slots, and track finalized upcoming team meetings.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Upcoming Meetings Column (1/3 width) */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="flex items-center space-x-2 border-b border-[#F3F4F6] pb-3">
                      <Calendar className="w-4 h-4 text-[#4F46E5]" />
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono">Upcoming Scheduled Meetings</h4>
                    </div>

                    <div className="space-y-3">
                      {events.filter(e => e.type === 'meeting' && !e.completed).length > 0 ? (
                        events.filter(e => e.type === 'meeting' && !e.completed).map((meet) => (
                          <div key={meet.id} className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-3.5 space-y-2 relative group">
                            <div className="flex items-start justify-between">
                              <span className="text-[10px] bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded font-mono font-bold uppercase select-none">
                                Confirmed
                              </span>
                              <span className="text-[9px] text-slate-450 font-mono">
                                {meet.time}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-950 leading-snug">{meet.title}</h5>
                            <p className="text-[10px] text-slate-500 leading-relaxed">{meet.description}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-xs text-[#888888] italic bg-slate-50 border border-dashed border-[#E5E7EB] rounded-xl">
                          No upcoming meetings scheduled. Vote on ballots to set one up!
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Availability Coordination Column (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                  {members.length <= 1 ? (
                    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center space-y-3">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">Shared Scheduling Locked</h4>
                      <p className="text-[11px] text-slate-650 max-w-md mx-auto leading-relaxed">
                        Availability coordination ballots require at least 2 team members. Invite teammates to unlock shared scheduling and meeting coordination features.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Availability coordination form */}
                      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-5">
                        
                        <div>
                          <h4 className="font-extrabold text-[#111111] text-xs uppercase tracking-wider font-mono">Propose New Meeting Poll</h4>
                          <p className="text-[10px] text-[#666666] mt-0.5">Select potential availability slots from the calendar pop-up to coordinate group sessions.</p>
                        </div>

                        {/* Propose slot controls */}
                        <div className="bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl p-4.5 space-y-4">
                          <form onSubmit={handleMeetingPollSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-mono font-bold uppercase mb-1.5 text-slate-600">Meeting Topic / Agenda</label>
                                <input 
                                  type="text" 
                                  required
                                  value={pollTitle}
                                  onChange={(e) => setPollTitle(e.target.value)}
                                  placeholder="e.g. Slide integration reviews"
                                  className="w-full bg-white border border-[#E5E7EB] p-2.5 rounded-lg text-xs outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-mono font-bold uppercase mb-1.5 text-slate-600">Select Date & Time</label>
                                <div className="flex gap-2">
                                  <input 
                                    type="datetime-local" 
                                    value={tempMeetingDateTime}
                                    onChange={(e) => setTempMeetingDateTime(e.target.value)}
                                    className="flex-1 bg-white border border-[#E5E7EB] p-2.5 rounded-lg text-xs font-mono font-medium outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                                  />
                                  <button 
                                    type="button" 
                                    onClick={handleAddProposedSlot}
                                    className="cursor-pointer bg-[#111111] hover:bg-[#4F46E5] text-white text-[10px] font-bold px-4 py-2 rounded-lg shrink-0 transition-colors"
                                  >
                                    + Add Option
                                  </button>
                                </div>
                              </div>
                            </div>

                            {proposedSlots.length > 0 && (
                              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-[#E5E7EB]">
                                <span className="block text-[10px] font-mono font-bold uppercase text-[#888888] mb-1">Proposed Slots Draft Array ({proposedSlots.length}):</span>
                                <div className="flex flex-wrap gap-2">
                                  {proposedSlots.map((slot, sIdx) => (
                                    <div key={sIdx} className="flex items-center space-x-2 bg-indigo-50/50 text-[#4F46E5] text-[10px] px-2.5 py-1.5 rounded-lg border border-indigo-100 font-semibold select-none">
                                      <span>{slot}</span>
                                      <button 
                                        type="button" 
                                        onClick={() => setProposedSlots(prev => prev.filter((_, idx) => idx !== sIdx))}
                                        className="text-red-500 hover:text-red-700 font-bold ml-1.5"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={proposedSlots.length === 0}
                              className="cursor-pointer bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold py-2.5 px-5 rounded-lg transition-all"
                            >
                              Publish Schedule Ballot
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Published Ballots Feed */}
                      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-4">
                        <span className="text-[10px] font-mono font-bold text-[#888888] uppercase tracking-wider block">Published Availability Ballots</span>
                        
                        {polls.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {polls.map((poll) => (
                              <div key={poll.id} className="bg-slate-50/30 border border-[#E5E7EB] rounded-xl p-4.5 space-y-3.5">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-955">{poll.title}</h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{poll.description}</p>
                                </div>

                                <div className="space-y-2">
                                  {poll.proposedSlots.map((slot) => {
                                    const hasVoted = slot.votedMemberIds.includes(currentUser.id);
                                    return (
                                      <button
                                        key={slot.id}
                                        onClick={() => votePollSlot(poll.id, slot.id)}
                                        className={`cursor-pointer w-full flex items-center justify-between p-3 rounded-xl border text-[11px] transition-all text-left ${
                                          hasVoted 
                                            ? 'bg-indigo-50/40 text-[#4F46E5] border-[#4F46E5]/40 font-semibold shadow-2xs' 
                                            : 'bg-white text-slate-700 border-[#E5E7EB] hover:bg-[#FAFAFA]'
                                        }`}
                                      >
                                        <div>
                                          <div className="font-bold">{slot.time}</div>
                                          <div className="text-[9px] text-[#888888] mt-0.5">
                                            Voted: {slot.votedMemberIds.map(mId => members.find(m => m.id === mId)?.avatar || "M").join(', ')} ({slot.votedMemberIds.length} votes)
                                          </div>
                                        </div>

                                        <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg ${hasVoted ? 'bg-[#4F46E5] text-white font-sans' : 'bg-[#F3F4F6] text-[#111111] font-sans'}`}>
                                          {hasVoted ? "Signed Voted" : "Vote Available"}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-xs text-[#888888] italic bg-slate-50 border border-dashed border-[#E5E7EB] rounded-xl">
                            No active availability coordination polls. Topic and pick slots above to generate one.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <div className="space-y-6 text-left">
              
              {/* Header */}
              <div>
                <h3 className="text-sm font-extrabold text-[#111111] tracking-tight">Team Workload & Contribution Tracker</h3>
                <p className="text-[#666666] text-xs">Inspect active room contributors, their self-claimed workloads, and git progress updates.</p>
              </div>

              {/* Pending Join Requests Section */}
              {currentGroupObj.ownerId === currentUser.id && currentGroupObj.pendingRequests && currentGroupObj.pendingRequests.length > 0 && (
                <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-5 md:p-6 space-y-4 animate-fade-in">
                  <div className="flex items-center space-x-2 border-b border-amber-200 pb-3">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <h4 className="font-extrabold text-amber-900 text-xs uppercase tracking-wider font-mono">Pending Membership Join Requests</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentGroupObj.pendingRequests.map(req => (
                      <div key={req.userId} className="bg-white border border-amber-150 p-4 rounded-xl flex items-center justify-between gap-4 shadow-2xs">
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-slate-900 truncate">{req.userName}</h5>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{req.userEmail}</p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => approveJoinRequest(currentGroupObj.id, req.userId)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => declineJoinRequest(currentGroupObj.id, req.userId)}
                            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Master-Detail Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Master Selector (4/12 cols) */}
                <div className="lg:col-span-4 space-y-3">
                  <span className="text-[10px] font-mono font-bold text-[#888888] uppercase tracking-wider block mb-1">Select Teammate</span>
                  
                  <div className="space-y-3">
                    {members.map(m => {
                      const isSelected = m.id === selectedMemberId;
                      const isSelf = m.id === currentUser.id;
                      const memberTasks = tasks.filter(t => t.assignees.includes(m.id));
                      const memberCommits = commits.filter(c => c.memberId === m.id);

                      return (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMemberId(m.id)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-50/20 border-[#4F46E5] ring-2 ring-indigo-50/50 shadow-xs' 
                              : 'bg-white border-[#E5E7EB] hover:border-slate-350 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 ${m.color}`}>
                              {m.avatar}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {m.name} {isSelf && '(You)'}
                              </h4>
                              <p className="text-[9px] text-slate-500 truncate mt-0.5">{m.role}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 space-y-1">
                            <span className="text-[8px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                              {memberTasks.length} {memberTasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                            <span className="text-[8px] bg-indigo-50 text-[#4F46E5] px-1.5 py-0.5 rounded font-mono font-semibold">
                              {memberCommits.length} {memberCommits.length === 1 ? 'log' : 'logs'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side: Detail Panel (8/12 cols) */}
                <div className="lg:col-span-8">
                  {(() => {
                    const selectedMember = members.find(m => m.id === selectedMemberId) || currentUser;
                    const memberTasks = tasks.filter(t => t.assignees.includes(selectedMember.id));
                    const memberCommits = commits.filter(c => c.memberId === selectedMember.id);
                    const workloadPercent = Math.min(Math.round((memberTasks.length / (tasks.length || 1)) * 100), 100);

                    return (
                      <div className="space-y-6">
                        
                        {/* Contributor Profile Details Card */}
                        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center space-x-4">
                              <span className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg ${selectedMember.color}`}>
                                {selectedMember.avatar}
                              </span>
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">{selectedMember.name}</h3>
                                <p className="text-xs text-slate-500 font-medium">{selectedMember.role}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedMember.email}</p>
                              </div>
                            </div>

                            <div className="flex gap-4 shrink-0 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                              <div className="text-center">
                                <span className="block text-[8px] font-mono font-bold uppercase text-slate-500">Contribution</span>
                                <span className="text-xs font-bold text-[#4F46E5] font-mono">{selectedMember.contributionScore.toFixed(1)}/10.0</span>
                              </div>
                              <div className="border-l border-slate-200" />
                              <div className="text-center">
                                <span className="block text-[8px] font-mono font-bold uppercase text-slate-500">Updates Logged</span>
                                <span className="text-xs font-bold text-slate-900 font-mono">{selectedMember.commitsCount} times</span>
                              </div>
                            </div>
                          </div>

                          {/* Workload Progress Bar */}
                          <div className="space-y-2 pt-1">
                            <div className="flex justify-between items-center text-[10px] text-[#666666]">
                              <span className="font-medium">Overall Workload Allocation Percentage</span>
                              <span className="font-mono font-bold text-slate-900">{workloadPercent}%</span>
                            </div>
                            <div className="w-full bg-[#F3F4F6] h-2 rounded-full overflow-hidden">
                              <div className="bg-[#4F46E5] h-full duration-300 transition-all" style={{ width: `${workloadPercent}%` }} />
                            </div>
                          </div>

                          {/* Academic/Student Details Grid */}
                          {(selectedMember.matricNumber || selectedMember.university || selectedMember.course || selectedMember.siswaMail || selectedMember.personalEmail || selectedMember.currentSemester || selectedMember.nationality) && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-100 text-left text-[11px] bg-slate-50/20 p-3 rounded-xl border border-slate-100/50">
                              {selectedMember.matricNumber && (
                                <div>
                                  <span className="block text-[8px] font-mono font-bold uppercase text-slate-400">Matric Number</span>
                                  <span className="font-bold text-slate-750">{selectedMember.matricNumber}</span>
                                </div>
                              )}
                              {selectedMember.siswaMail && (
                                <div>
                                  <span className="block text-[8px] font-mono font-bold uppercase text-slate-400">Siswa Mail</span>
                                  <span className="font-bold text-slate-750 truncate block" title={selectedMember.siswaMail}>{selectedMember.siswaMail}</span>
                                </div>
                              )}
                              {selectedMember.personalEmail && (
                                <div>
                                  <span className="block text-[8px] font-mono font-bold uppercase text-slate-400">Personal Mail</span>
                                  <span className="font-bold text-slate-750 truncate block" title={selectedMember.personalEmail}>{selectedMember.personalEmail}</span>
                                </div>
                              )}
                              {selectedMember.university && (
                                <div>
                                  <span className="block text-[8px] font-mono font-bold uppercase text-slate-400">University</span>
                                  <span className="font-bold text-slate-750">{selectedMember.university}</span>
                                </div>
                              )}
                              {selectedMember.course && (
                                <div>
                                  <span className="block text-[8px] font-mono font-bold uppercase text-slate-400">Course / Major</span>
                                  <span className="font-bold text-slate-750">{selectedMember.course}</span>
                                </div>
                              )}
                              {selectedMember.currentSemester && (
                                <div>
                                  <span className="block text-[8px] font-mono font-bold uppercase text-slate-400">Semester</span>
                                  <span className="font-bold text-slate-750">{selectedMember.currentSemester}</span>
                                </div>
                              )}
                              {selectedMember.nationality && (
                                <div>
                                  <span className="block text-[8px] font-mono font-bold uppercase text-slate-400">Nationality</span>
                                  <span className="font-bold text-slate-750">{selectedMember.nationality}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Workload Distributed Section */}
                        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-4">
                          <div className="flex items-center space-x-2 border-b border-[#F3F4F6] pb-3">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono">Distributed Workload (Kanban Tasks)</h4>
                          </div>

                          <div className="space-y-3">
                            {memberTasks.length > 0 ? (
                              memberTasks.map((t) => (
                                <div key={t.id} className="bg-slate-50/50 border border-slate-150 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-left">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">
                                        {t.priority}
                                      </span>
                                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                        t.status === 'COMPLETED' 
                                          ? 'bg-emerald-50 text-emerald-700' 
                                          : t.status === 'IN_PROGRESS' 
                                            ? 'bg-amber-50 text-amber-700' 
                                            : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {t.status.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-bold text-slate-955 leading-snug">{t.title}</h5>
                                    <p className="text-[10px] text-slate-550 leading-relaxed">{t.description}</p>
                                  </div>
                                  
                                  <div className="shrink-0 text-right text-[9px] text-slate-450 font-mono">
                                    Due: {t.dueDate}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-6 text-center text-xs text-[#888888] italic bg-slate-50 border border-dashed border-[#E5E7EB] rounded-xl">
                                No active tasks assigned. Claim role workloads from the suggestions engine under the Tasks tab.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Logged Updates Section */}
                        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-4">
                          <div className="flex items-center space-x-2 border-b border-[#F3F4F6] pb-3">
                            <Clock className="w-4 h-4 text-[#4F46E5]" />
                            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono">Logged Git Updates & Contribution Feed</h4>
                          </div>

                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                            {memberCommits.length > 0 ? (
                              memberCommits.map((c) => (
                                <div key={c.id} className="border-l-2 border-slate-200 pl-4 py-1 relative text-left">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] absolute -left-[6px] top-2" />
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                                      <span>{new Date(c.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                      <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-bold text-[8px]">{c.type}</span>
                                    </div>
                                    <h5 className="text-xs font-bold text-slate-955 leading-snug">{c.title}</h5>
                                    <p className="text-[10px] text-slate-550 leading-relaxed">{c.description}</p>
                                    {c.attachment && (
                                      <div className="inline-flex items-center space-x-1.5 bg-[#FAFAFA] border border-[#E5E7EB] p-1 px-2 rounded mt-1.5 text-[9px] font-medium text-slate-600">
                                        <span className="font-bold">{c.attachment.name}</span>
                                        <span className="text-slate-400 font-mono text-[8px]">({c.attachment.size})</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-6 text-center text-xs text-[#888888] italic bg-slate-50 border border-dashed border-[#E5E7EB] rounded-xl">
                                No contribution updates logged yet. Submit updates on active tasks under the Tasks tab.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Anonymous Peer Reviews List Card */}
                        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-4">
                          <div className="flex items-center space-x-2 border-b border-[#F3F4F6] pb-3">
                            <MessageSquare className="w-4 h-4 text-indigo-600" />
                            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono">Anonymous Peer Reviews</h4>
                          </div>

                          <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                            {feedback.filter(f => f.toMemberId === selectedMember.id).length > 0 ? (
                              feedback.filter(f => f.toMemberId === selectedMember.id).map((f) => {
                                const avgScore = (f.ratingQuality + f.ratingReliability + f.ratingCommunication + f.ratingContribution) / 4;
                                return (
                                  <div key={f.id} className="p-3.5 bg-[#FAFAFA]/70 border border-[#E5E7EB] rounded-xl text-left space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-mono text-[#888888]">
                                        Review {f.fromAnonymousId} • {new Date(f.timestamp).toLocaleDateString()}
                                      </span>
                                      <span className="text-[10px] font-mono font-bold bg-indigo-50 border border-indigo-100 text-[#4F46E5] px-2 py-0.5 rounded-full">
                                        Avg: {(avgScore * 2).toFixed(1)}/10.0
                                      </span>
                                    </div>
                                    
                                    <p className="text-[11px] text-slate-700 leading-relaxed italic">
                                      "{f.comment || 'No comment provided.'}"
                                    </p>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100/50 text-[9px] text-slate-500 font-mono">
                                      <div>Quality: <span className="font-bold text-slate-700">{f.ratingQuality}/5</span></div>
                                      <div>Reliability: <span className="font-bold text-slate-700">{f.ratingReliability}/5</span></div>
                                      <div>Comms: <span className="font-bold text-slate-700">{f.ratingCommunication}/5</span></div>
                                      <div>Contrib: <span className="font-bold text-slate-700">{f.ratingContribution}/5</span></div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-6 text-center text-xs text-[#888888] italic bg-slate-50 border border-dashed border-[#E5E7EB] rounded-xl">
                                No reviews submitted for this member yet.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Anonymous Feedback Submission Form Card */}
                        {selectedMember.id !== currentUser.id && (
                          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 space-y-4">
                            <div className="flex items-center space-x-2 border-b border-[#F3F4F6] pb-3">
                              <PlusCircle className="w-4 h-4 text-emerald-600" />
                              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider font-mono">Submit Anonymous Peer Review</h4>
                            </div>

                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                submitFeedback(
                                  selectedMember.id,
                                  feedbackQuality,
                                  feedbackReliability,
                                  feedbackCommunication,
                                  feedbackContribution,
                                  feedbackComment
                                );
                                setFeedbackComment('');
                                setFeedbackQuality(5);
                                setFeedbackReliability(5);
                                setFeedbackCommunication(5);
                                setFeedbackContribution(5);
                                setToastMessage(`Anonymous peer review submitted successfully for ${selectedMember.name}!`);
                              }}
                              className="space-y-4 text-left text-xs"
                            >
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-[9px] font-mono font-bold uppercase text-slate-500 mb-1">Quality (1-5)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={feedbackQuality}
                                    onChange={(e) => setFeedbackQuality(parseInt(e.target.value) || 5)}
                                    className="w-full bg-slate-50 border border-[#E5E7EB] p-2 rounded-lg font-mono text-center outline-none focus:border-[#4F46E5]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono font-bold uppercase text-slate-500 mb-1">Reliability (1-5)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={feedbackReliability}
                                    onChange={(e) => setFeedbackReliability(parseInt(e.target.value) || 5)}
                                    className="w-full bg-slate-50 border border-[#E5E7EB] p-2 rounded-lg font-mono text-center outline-none focus:border-[#4F46E5]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono font-bold uppercase text-slate-500 mb-1">Communication (1-5)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={feedbackCommunication}
                                    onChange={(e) => setFeedbackCommunication(parseInt(e.target.value) || 5)}
                                    className="w-full bg-slate-50 border border-[#E5E7EB] p-2 rounded-lg font-mono text-center outline-none focus:border-[#4F46E5]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-mono font-bold uppercase text-slate-500 mb-1">Contribution (1-5)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={feedbackContribution}
                                    onChange={(e) => setFeedbackContribution(parseInt(e.target.value) || 5)}
                                    className="w-full bg-slate-50 border border-[#E5E7EB] p-2 rounded-lg font-mono text-center outline-none focus:border-[#4F46E5]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[9px] font-mono font-bold uppercase text-slate-500 mb-1">Written Feedback Comments</label>
                                <textarea
                                  required
                                  rows={2}
                                  value={feedbackComment}
                                  onChange={(e) => setFeedbackComment(e.target.value)}
                                  placeholder={`Describe ${selectedMember.name}'s key strengths or areas for collaboration refinement...`}
                                  className="w-full bg-slate-50 border border-[#E5E7EB] p-2.5 rounded-lg text-xs leading-relaxed outline-none focus:bg-white focus:border-[#4F46E5] resize-none"
                                />
                              </div>

                              <button
                                type="submit"
                                className="w-full bg-[#111111] hover:bg-[#4F46E5] text-white font-bold py-2 rounded-lg transition-colors cursor-pointer text-center"
                              >
                                Publish Anonymous Evaluation
                              </button>
                            </form>
                          </div>
                        )}

                      </div>
                    );
                  })()}
                </div>

              </div>

            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && currentGroupObj.ownerId === currentUser.id && (
            <WorkspaceSettingsPanel
              currentGroupObj={currentGroupObj}
              updateGroupSettings={updateGroupSettings}
            />
          )}

        </div>

      </div>

      {/* COLLAPSIBLE AI CHATBOT PANEL */}
      {showAiPanel && (
        <div id="ai-chatbot-panel" className="w-80 md:w-90 border-l border-[#E5E7EB] bg-white flex flex-col h-screen shrink-0 font-sans z-30 select-none animate-slide-in">
          {/* Header */}
          <div className="p-4 border-b border-[#F3F4F6] flex items-center justify-between bg-[#FAFAFA]">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
              </span>
              <Sparkles className="w-4 h-4 text-[#4F46E5]" />
              <div className="text-left">
                <span className="font-extrabold text-xs text-[#111111] block">0-Mess AI Partner</span>
                <span className="text-[9px] font-medium text-[#888888] block -mt-0.5">Generative Group Assistant</span>
              </div>
            </div>
            
            <button 
              onClick={() => setShowAiPanel(false)}
              className="text-[#888888] hover:text-[#111111] text-[10px] font-bold cursor-pointer bg-white border border-[#E5E7EB] hover:bg-slate-50 px-2.5 py-1 rounded-md transition-all"
            >
              Hide Chat
            </button>
          </div>

          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/10">
            {chatMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[90%] p-3 rounded-2xl text-[11px] leading-relaxed shadow-xs text-left whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-[#4F46E5] text-white rounded-tr-none' 
                    : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none'
                }`}>
                  {renderFormattedMessage(msg.content, msg.role)}
                </div>
                <span className="text-[9px] text-[#999999] font-mono mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {isSendingToAi && (
              <div className="flex items-start">
                <div className="bg-white text-slate-900 border border-slate-100 rounded-2xl rounded-tl-none max-w-[90%] p-3 shadow-xs text-left">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">synthesizing response...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggested shortcuts */}
          <div className="p-3 border-t border-[#F3F4F6] bg-slate-50/50 space-y-1.5 text-left">
            <span className="text-[9px] font-mono font-bold text-[#888888] uppercase block tracking-wider">Suggested Queries</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "💡 Task division advice", prompt: "Suggest fair task distribution based on different roles in a university replication/database project." },
                { label: "🤝 Teammate conflict", prompt: "How can we resolve a conflict where one team member is late submitting their milestone tasks?" },
                { label: "📄 Syllabus analysis", prompt: "How to extract clear backlog tasks and objectives from our uploaded syllabus?" }
              ].map((shortcut, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(undefined, shortcut.prompt)}
                  disabled={isSendingToAi}
                  className="cursor-pointer text-[9.5px] font-sans font-medium text-slate-700 bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 hover:bg-slate-50 hover:text-indigo-600 transition-all text-left truncate max-w-full disabled:opacity-50"
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat input box */}
          <div className="p-4 border-t border-[#F3F4F6] bg-white">
            <form onSubmit={(e) => handleSendChat(e)} className="flex items-center space-x-2">
              <input
                type="text"
                disabled={isSendingToAi}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question or query..."
                className="flex-1 bg-slate-50 border border-[#E5E7EB] p-2.5 rounded-xl text-xs outline-none focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
              />
              <button
                type="submit"
                disabled={isSendingToAi || !chatInput.trim()}
                className="cursor-pointer bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold p-2.5 rounded-xl transition-all h-9 w-9 flex items-center justify-center shrink-0"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-2 text-[9px] text-[#aaaaaa] font-mono text-center">
              Coordinated by 0-Mess full-stack runtime gateway
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM GLASSMORPHISM CREATE CATEGORY MODAL */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans select-none animate-fade-in">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-scale-up text-left">
            <div className="mb-4">
              <h3 className="text-sm font-extrabold text-[#111111] tracking-tight">Create Custom Workspace Category</h3>
              <p className="text-[10px] text-[#666666] mt-0.5">
                Add a new dynamic category slot for grouping and indexing workspace links or files.
              </p>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Logos & Assets"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5E7EB] focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2.5 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer text-center font-sans"
                >
                  Create Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateCategoryModal(false);
                    setNewCategoryName('');
                  }}
                  className="px-4 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-600 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREMIUM GLASSMORPHISM EDIT RESOURCE MODAL */}
      {editingResource && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans select-none animate-fade-in">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-scale-up text-left">
            <div className="mb-4">
              <h3 className="text-sm font-extrabold text-[#111111] tracking-tight">Edit Resource Details</h3>
              <p className="text-[10px] text-[#666666] mt-0.5">
                {editingResource.url !== '#' ? "Modifying shared workspace link details." : "Modifying workspace document index details."}
              </p>
            </div>

            <form onSubmit={handleEditResourceSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Resource Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-[#E5E7EB] focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2.5 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              {editingResource.url !== '#' && (
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Web Link/URL</label>
                  <input
                    type="url"
                    required
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-[#E5E7EB] focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2.5 rounded-xl text-xs outline-none transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="What is this resource used for?"
                  rows={3}
                  className="w-full bg-slate-50 border border-[#E5E7EB] focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2.5 rounded-xl text-xs outline-none transition-all"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer text-center font-sans"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingResource(null);
                    setEditTitle('');
                    setEditUrl('');
                    setEditDesc('');
                  }}
                  className="px-4 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-600 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

interface WorkspaceSettingsPanelProps {
  currentGroupObj: any;
  updateGroupSettings: any;
}

const WorkspaceSettingsPanel: React.FC<WorkspaceSettingsPanelProps> = ({ currentGroupObj, updateGroupSettings }) => {
  const [name, setName] = useState(currentGroupObj.name);
  const [description, setDescription] = useState(currentGroupObj.description);
  const [groupId, setGroupId] = useState(currentGroupObj.id);
  const [password, setPassword] = useState(currentGroupObj.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setName(currentGroupObj.name);
    setDescription(currentGroupObj.description);
    setGroupId(currentGroupObj.id);
    setPassword(currentGroupObj.password || '');
  }, [currentGroupObj]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !groupId.trim()) {
      setError('Group Name and Group ID cannot be empty.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await updateGroupSettings(currentGroupObj.id, {
        name,
        description,
        newGroupId: groupId,
        password
      });

      if (res.success) {
        setSuccess(res.message || 'Settings updated successfully.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(res.message || 'Failed to update settings.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-2xl animate-fade-in font-sans">
      <div>
        <h3 className="text-sm font-extrabold text-[#111111] tracking-tight">Workspace Settings</h3>
        <p className="text-[#666666] text-xs">Manage your working group profile details, slug code, and joining credentials.</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-xl flex items-center space-x-2 animate-fade-in">
          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-center space-x-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-[#E5E7EB] rounded-2xl p-5 md:p-6 shadow-2xs">
        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 text-slate-700">Group Name</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-slate-50 border border-[#E5E7EB] focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2.5 rounded-xl text-xs outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 text-slate-700">Brief Description</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-slate-50 border border-[#E5E7EB] focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2.5 rounded-xl text-xs outline-none transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 text-slate-700">Group ID (Unique Slug)</label>
            <input 
              type="text"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value.toUpperCase())}
              required
              className="w-full bg-slate-50 border border-[#E5E7EB] focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2.5 rounded-xl text-xs outline-none transition-all font-mono"
            />
            <span className="text-[9px] text-slate-500 mt-1 block">Teammates use this to find and request to join this group.</span>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 text-slate-700">Group Password (Optional)</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="No password (public)"
                className="w-full bg-slate-50 border border-[#E5E7EB] focus:bg-white focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] p-2.5 rounded-xl text-xs outline-none transition-all pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[9px] text-slate-500 mt-1 block">Reveal or change the password. Keep it empty to make the group public.</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 font-sans"
          >
            {isSubmitting ? "Saving changes..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};
