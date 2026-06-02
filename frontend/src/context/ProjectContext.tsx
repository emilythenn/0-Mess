import React, { createContext, useContext, useState, useEffect } from 'react';
import { Member, Task, Commit, FeedbackSubmission, MeetingPoll, Event, Notification, TaskStatus, TaskPriority, Group, PendingAction } from '../types';
import { supabase } from '../supabase';

interface ProjectContextType {
  members: Member[];
  tasks: Task[];
  commits: Commit[];
  feedback: FeedbackSubmission[];
  polls: MeetingPoll[];
  events: Event[];
  notifications: Notification[];
  currentUser: Member;
  isLoggedIn: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (name: string, email: string, role: string, password?: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  addTask: (task: Omit<Task, 'id'> & { groupId?: string }) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  addCommit: (title: string, description: string, type: Commit['type'], file?: { name: string; size: string; type: string }, authorOverride?: { id: string; name: string }) => void;
  submitFeedback: (toMemberId: string, ratingQuality: number, ratingReliability: number, ratingCommunication: number, ratingContribution: number, comment: string) => void;
  votePollSlot: (pollId: string, slotId: string) => void;
  closePoll: (pollId: string) => void;
  createMeetingPoll: (title: string, description: string, slots: string[]) => void;
  addEvent: (title: string, time: string, type: Event['type'], description: string) => void;
  toggleEventCompleted: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Group features
  groups: Group[];
  activeGroupId: string | null;
  createGroup: (id: string, name: string, description: string, password?: string) => Promise<Group>;
  joinGroupRequest: (groupId: string, password?: string) => Promise<{ success: boolean; message: string; requested?: boolean; passwordRequired?: boolean }>;
  approveJoinRequest: (groupId: string, userId: string) => void;
  declineJoinRequest: (groupId: string, userId: string) => void;
  addMemberByEmail: (groupId: string, email: string) => Promise<{ success: boolean; message: string }>;
  setActiveGroupId: (groupId: string | null) => void;
  resetAllCaches: () => void;
  updateProfile: (profileData: Partial<Member>) => Promise<boolean>;
  updateGroupEvaluationDate: (groupId: string, evaluationDate: string) => Promise<boolean>;
  updateGroupSettings: (
    groupId: string,
    updates: { name?: string; description?: string; evaluationDate?: string; newGroupId?: string; password?: string }
  ) => Promise<{ success: boolean; message: string; newGroupId?: string }>;
  
  // Database status
  dbError: string | null;
  pendingActionsCount: number;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};

// =========================================================================
// Supabase Database -> Frontend React Model Mapping Helpers
// =========================================================================

const mapDbTaskToTask = (dbTask: any): Task => ({
  id: dbTask.id,
  title: dbTask.title,
  description: dbTask.description || '',
  status: dbTask.status as TaskStatus,
  priority: dbTask.priority as TaskPriority,
  assignees: dbTask.assignees || [],
  dueDate: dbTask.due_date || '',
  tags: dbTask.tags || [],
  groupId: dbTask.group_id
});

const mapDbCommitToCommit = (dbCommit: any): Commit => ({
  id: dbCommit.id,
  memberId: dbCommit.member_id,
  authorName: dbCommit.author_name,
  title: dbCommit.title,
  description: dbCommit.description || '',
  type: dbCommit.type,
  linesAdded: dbCommit.lines_added || 0,
  timestamp: dbCommit.timestamp,
  attachment: dbCommit.attachment || undefined,
  groupId: dbCommit.group_id
});

const mapDbFeedbackToFeedback = (dbFeedback: any): FeedbackSubmission => ({
  id: dbFeedback.id,
  fromAnonymousId: dbFeedback.from_anonymous_id,
  toMemberId: dbFeedback.to_member_id,
  ratingQuality: dbFeedback.rating_quality,
  ratingReliability: dbFeedback.rating_reliability,
  ratingCommunication: dbFeedback.rating_communication,
  ratingContribution: dbFeedback.rating_contribution,
  comment: dbFeedback.comment || '',
  timestamp: dbFeedback.timestamp,
  groupId: dbFeedback.group_id
});

const mapDbPollToPoll = (dbPoll: any): MeetingPoll => {
  const rawSlots = dbPoll.proposed_slots || [];
  const proposedSlots = rawSlots.map((s: any) => ({
    id: s.id || s.slotId || Math.random().toString(),
    time: s.time || s.slotTime || '',
    votedMemberIds: s.votedMemberIds || s.voted_member_ids || []
  }));
  return {
    id: dbPoll.id,
    title: dbPoll.title,
    description: dbPoll.description || '',
    proposedSlots,
    deadline: dbPoll.deadline || '',
    createdBy: dbPoll.created_by,
    groupId: dbPoll.group_id
  };
};

const mapDbEventToEvent = (dbEvent: any): Event => ({
  id: dbEvent.id,
  title: dbEvent.title,
  time: dbEvent.time,
  type: dbEvent.type,
  description: dbEvent.description || '',
  groupId: dbEvent.group_id,
  completed: dbEvent.completed || false
});

const mapDbProfileToMember = (dbProfile: any): Member => ({
  id: dbProfile.id,
  name: dbProfile.name,
  role: dbProfile.role || 'Project Member',
  email: dbProfile.email || '',
  avatar: dbProfile.avatar || 'US',
  color: dbProfile.color || 'bg-indigo-500',
  contributionScore: 10.0,
  commitsCount: 0,
  matricNumber: dbProfile.matric_number,
  siswaMail: dbProfile.siswa_mail,
  personalEmail: dbProfile.personal_email,
  university: dbProfile.university,
  course: dbProfile.course,
  currentSemester: dbProfile.current_semester,
  nationality: dbProfile.nationality
});

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbError, setDbError] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(() => {
    const cached = localStorage.getItem('0mess_pending_actions');
    return cached ? JSON.parse(cached) : [];
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // States initialized from local storage as offline cache
  const [members, setMembers] = useState<Member[]>(() => {
    const cached = localStorage.getItem('0mess_members');
    return cached ? JSON.parse(cached) : [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const cached = localStorage.getItem('0mess_tasks');
    return cached ? JSON.parse(cached) : [];
  });

  const [commits, setCommits] = useState<Commit[]>(() => {
    const cached = localStorage.getItem('0mess_commits');
    return cached ? JSON.parse(cached) : [];
  });

  const [feedback, setFeedback] = useState<FeedbackSubmission[]>(() => {
    const cached = localStorage.getItem('0mess_feedback');
    return cached ? JSON.parse(cached) : [];
  });

  const [polls, setPolls] = useState<MeetingPoll[]>(() => {
    const cached = localStorage.getItem('0mess_polls');
    return cached ? JSON.parse(cached) : [];
  });

  const [events, setEvents] = useState<Event[]>(() => {
    const cached = localStorage.getItem('0mess_events');
    return cached ? JSON.parse(cached) : [];
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const cached = localStorage.getItem('0mess_notifications');
    return cached ? JSON.parse(cached) : [];
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('0mess_logged_in') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<Member>(() => {
    const cached = localStorage.getItem('0mess_current_user');
    return cached ? JSON.parse(cached) : {
      id: '',
      name: 'Loading...',
      role: 'Project Member',
      email: '',
      avatar: 'US',
      color: 'bg-indigo-500',
      contributionScore: 10.0,
      commitsCount: 0
    };
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    const cached = localStorage.getItem('0mess_groups');
    if (cached) return JSON.parse(cached);
    return [];
  });

  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(() => {
    const cached = localStorage.getItem('0mess_active_group_id');
    return cached !== null ? (cached === 'null' ? null : cached) : null;
  });

  const setActiveGroupId = (id: string | null) => {
    setActiveGroupIdState(id);
    if (id) {
      localStorage.setItem('0mess_active_group_id', id);
    } else {
      localStorage.setItem('0mess_active_group_id', 'null');
    }
  };

  // Sync groups list from database
  const fetchGroups = async (tokenOverride?: string) => {
    const token = tokenOverride || localStorage.getItem('firebase_id_token');
    if (!token) return;

    try {
      const res = await fetch('/api/project/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        console.warn('Session expired or unauthorized. Logging out.');
        logout();
        return;
      }
      if (!res.ok) throw new Error('Database server error.');
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);
      }
      setDbError(null);
    } catch (err: any) {
      console.warn('Database groups load failed, using local offline cache:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }
  };

  // Sync active group payload
  const fetchGroupData = async (groupId: string, tokenOverride?: string) => {
    const token = tokenOverride || localStorage.getItem('firebase_id_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/project/groups/${groupId}/data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        console.warn('Session expired or unauthorized. Logging out.');
        logout();
        return;
      }
      if (res.status === 404) {
        console.warn(`Group ${groupId} not found in database. Redirecting to dashboard.`);
        setActiveGroupId(null);
        setDbError(null);
        return;
      }
      if (res.status === 403) {
        console.warn(`Access denied to group ${groupId}. Redirecting to dashboard.`);
        setActiveGroupId(null);
        setDbError(null);
        setTasks([]);
        setCommits([]);
        setFeedback([]);
        setPolls([]);
        setEvents([]);
        setMembers([]);
        return;
      }
      if (!res.ok) throw new Error('Database loading failed.');
      const data = await res.json();

      setTasks(data.tasks);
      setCommits(data.commits);
      setFeedback(data.feedback);
      setPolls(data.polls);
      setEvents(data.events);
      setMembers(data.members);
      setGroups(prev => prev.map(g => g.id === data.group.id ? data.group : g));
      setDbError(null);
    } catch (err: any) {
      console.warn('Database payload load failed, using local offline cache:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }
  };

  // Supabase Auth listener sync
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user;
      
      if (user) {
        try {
          const token = session.access_token;
          localStorage.setItem('firebase_id_token', token); // Map to expected token key

          const email = user.email || '';
          const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'User';
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'US';
          const bgColors = ['bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500', 'bg-teal-500', 'bg-sky-500'];
          const randomColor = bgColors[Math.abs(user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % bgColors.length];

          // Upsert profiles in DB
          fetch('/api/project/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name,
              email,
              role: 'Project Member',
              avatar: initials,
              color: randomColor
            })
          })
          .then(res => res.json())
          .then(data => {
            console.log('Profile synced with database successfully:', data);
          })
          .catch(err => {
            console.warn('Profile DB synchronization offline:', err.message);
          });

          // Update current user
          const updatedUser: Member = {
            id: user.id,
            name,
            role: 'Project Member',
            email,
            avatar: initials,
            color: randomColor,
            contributionScore: 10.0,
            commitsCount: 0
          };

          setMembers(prev => {
            const matched = prev.find(m => m.id === user.id || m.email.toLowerCase() === email.toLowerCase());
            if (matched) {
              return prev.map(m => m.email.toLowerCase() === email.toLowerCase() ? { ...m, id: user.id, name } : m);
            }
            return [...prev, updatedUser];
          });

          setCurrentUser(updatedUser);
          localStorage.setItem('0mess_current_user', JSON.stringify(updatedUser));
          setIsLoggedIn(true);
          localStorage.setItem('0mess_logged_in', 'true');

          // Initial load
          fetchGroups(token);
        } catch (err) {
          console.error("Auth state user load error:", err);
        }
      } else {
        localStorage.removeItem('firebase_id_token');
        setIsLoggedIn(false);
        localStorage.removeItem('0mess_logged_in');
        localStorage.removeItem('0mess_current_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch group data on switch
  useEffect(() => {
    if (activeGroupId && isLoggedIn) {
      fetchGroupData(activeGroupId);
    }
  }, [activeGroupId, isLoggedIn]);

  // Real-Time Sync Engine: Subscribe to active workspace modifications in Supabase Realtime Postgres replication
  useEffect(() => {
    if (!activeGroupId || !isLoggedIn) return;

    console.log(`Connecting to Supabase Realtime channel for workspace ${activeGroupId}...`);

    // Connect to Supabase Postgres replication channel for this group
    const channel = supabase
      .channel(`realtime:workspace:${activeGroupId}`)
      // 1. Synchronize tasks changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `group_id=eq.${activeGroupId}` },
        (payload) => {
          console.log('Realtime task change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const mappedTask = mapDbTaskToTask(payload.new);
            setTasks(prev => prev.some(t => t.id === mappedTask.id) ? prev : [mappedTask, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const mappedTask = mapDbTaskToTask(payload.new);
            setTasks(prev => prev.map(t => t.id === mappedTask.id ? mappedTask : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      // 2. Synchronize commits changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'commits', filter: `group_id=eq.${activeGroupId}` },
        (payload) => {
          console.log('Realtime commit change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const mappedCommit = mapDbCommitToCommit(payload.new);
            setCommits(prev => prev.some(c => c.id === mappedCommit.id) ? prev : [mappedCommit, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const mappedCommit = mapDbCommitToCommit(payload.new);
            setCommits(prev => prev.map(c => c.id === mappedCommit.id ? mappedCommit : c));
          } else if (payload.eventType === 'DELETE') {
            setCommits(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      // 3. Synchronize feedback changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedback', filter: `group_id=eq.${activeGroupId}` },
        (payload) => {
          console.log('Realtime feedback change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const mappedFb = mapDbFeedbackToFeedback(payload.new);
            setFeedback(prev => prev.some(f => f.id === mappedFb.id) ? prev : [mappedFb, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const mappedFb = mapDbFeedbackToFeedback(payload.new);
            setFeedback(prev => prev.map(f => f.id === mappedFb.id ? mappedFb : f));
          } else if (payload.eventType === 'DELETE') {
            setFeedback(prev => prev.filter(f => f.id !== payload.old.id));
          }
        }
      )
      // 4. Synchronize polls changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `group_id=eq.${activeGroupId}` },
        (payload) => {
          console.log('Realtime poll change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const mappedPoll = mapDbPollToPoll(payload.new);
            setPolls(prev => prev.some(p => p.id === mappedPoll.id) ? prev : [mappedPoll, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const mappedPoll = mapDbPollToPoll(payload.new);
            setPolls(prev => prev.map(p => p.id === mappedPoll.id ? mappedPoll : p));
          } else if (payload.eventType === 'DELETE') {
            setPolls(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      // 5. Synchronize events/milestones changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `group_id=eq.${activeGroupId}` },
        (payload) => {
          console.log('Realtime event change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const mappedEv = mapDbEventToEvent(payload.new);
            setEvents(prev => prev.some(e => e.id === mappedEv.id) ? prev : [mappedEv, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const mappedEv = mapDbEventToEvent(payload.new);
            setEvents(prev => prev.map(e => e.id === mappedEv.id ? mappedEv : e));
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      // 6. Synchronize group membership details changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${activeGroupId}` },
        (payload) => {
          console.log('Realtime group change:', payload.eventType, payload);
          if (payload.eventType === 'UPDATE') {
            const updatedGroup = payload.new;
            setGroups(prev => prev.map(g => g.id === updatedGroup.id ? {
              ...g,
              name: updatedGroup.name,
              description: updatedGroup.description || '',
              password: updatedGroup.password || '',
              ownerId: updatedGroup.owner_id,
              evaluationDate: updatedGroup.evaluation_date || null
            } : g));
            fetchGroupData(activeGroupId);
          }
        }
      )
      // 7. Synchronize join request/member changes to refresh details
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${activeGroupId}` },
        (payload) => {
          console.log('Realtime group_members change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const newUserId = payload.new.user_id;
            setGroups(prev => prev.map(g => {
              if (g.id === activeGroupId) {
                const already = g.memberIds.includes(newUserId);
                if (already) return g;
                return {
                  ...g,
                  memberIds: [...g.memberIds, newUserId]
                };
              }
              return g;
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedUserId = payload.old.user_id;
            setGroups(prev => prev.map(g => {
              if (g.id === activeGroupId) {
                return {
                  ...g,
                  memberIds: g.memberIds.filter(id => id !== deletedUserId)
                };
              }
              return g;
            }));
          }
          fetchGroupData(activeGroupId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_join_requests', filter: `group_id=eq.${activeGroupId}` },
        (payload) => {
          console.log('Realtime group_join_requests change:', payload.eventType, payload);
          if (payload.eventType === 'INSERT') {
            const req = payload.new;
            setGroups(prev => prev.map(g => {
              if (g.id === activeGroupId) {
                const already = g.pendingRequests?.some(r => r.userId === req.user_id);
                if (already) return g;
                return {
                  ...g,
                  pendingRequests: [
                    ...(g.pendingRequests || []),
                    {
                      userId: req.user_id,
                      userName: req.user_name,
                      userEmail: req.user_email
                    }
                  ]
                };
              }
              return g;
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedUserId = payload.old.user_id;
            setGroups(prev => prev.map(g => {
              if (g.id === activeGroupId) {
                return {
                  ...g,
                  pendingRequests: (g.pendingRequests || []).filter(r => r.userId !== deletedUserId)
                };
              }
              return g;
            }));
          }
          fetchGroupData(activeGroupId);
        }
      )
      // 8. Synchronize profile updates globally
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Realtime profile change:', payload.eventType, payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const mappedMember = mapDbProfileToMember(payload.new);
            setMembers(prev => {
              const exists = prev.some(m => m.id === mappedMember.id);
              if (exists) {
                return prev.map(m => m.id === mappedMember.id ? { ...m, ...mappedMember } : m);
              } else {
                return [...prev, mappedMember];
              }
            });
            // Update current user if it is us
            if (mappedMember.id === currentUser?.id) {
              setCurrentUser(prev => ({ ...prev, ...mappedMember }));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Supabase Realtime subscription status for workspace ${activeGroupId}:`, status);
      });

    return () => {
      console.log(`Cleaning up Supabase Realtime channel for workspace ${activeGroupId}`);
      supabase.removeChannel(channel);
    };
  }, [activeGroupId, isLoggedIn, currentUser?.id]);

  // Sync state changes to offline local storage fallback cache
  useEffect(() => {
    localStorage.setItem('0mess_groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('0mess_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('0mess_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('0mess_commits', JSON.stringify(commits));
  }, [commits]);

  useEffect(() => {
    localStorage.setItem('0mess_feedback', JSON.stringify(feedback));
  }, [feedback]);

  useEffect(() => {
    localStorage.setItem('0mess_polls', JSON.stringify(polls));
  }, [polls]);

  useEffect(() => {
    localStorage.setItem('0mess_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('0mess_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('0mess_pending_actions', JSON.stringify(pendingActions));
  }, [pendingActions]);

  // Auth Operations
  const login = async (email: string, password?: string) => {
    try {
      if (!password) {
        throw new Error("Password is required for Supabase Authentication.");
      }
      const res = await fetch('/api/project/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Authentication failed.');
      }
      const { session } = await res.json();
      if (!session) {
        throw new Error('Failed to retrieve active session.');
      }
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Supabase Sign In Error:", error);
      throw error;
    }
  };

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear React state variables
      setTasks([]);
      setCommits([]);
      setFeedback([]);
      setPolls([]);
      setEvents([]);
      setNotifications([]);
      setGroups([]);
      setMembers([]);
      setActiveGroupIdState(null);

      // Clear local storage workspace caches
      localStorage.removeItem('0mess_tasks');
      localStorage.removeItem('0mess_commits');
      localStorage.removeItem('0mess_feedback');
      localStorage.removeItem('0mess_polls');
      localStorage.removeItem('0mess_events');
      localStorage.removeItem('0mess_notifications');
      localStorage.removeItem('0mess_groups');
      localStorage.removeItem('0mess_members');
      localStorage.removeItem('0mess_active_group_id');
      localStorage.removeItem('firebase_id_token');
      localStorage.removeItem('0mess_logged_in');
      localStorage.removeItem('0mess_current_user');

      setIsLoggedIn(false);
    } catch (error: any) {
      console.error("Supabase Sign Out Error:", error);
      throw error;
    }
  }

  const register = async (name: string, email: string, role: string, password?: string) => {
    try {
      if (!password) {
        throw new Error("Password is required for Supabase Registration.");
      }
      const res = await fetch('/api/project/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Registration failed.');
      }
      const { session } = await res.json();
      if (!session) {
        throw new Error('Failed to retrieve active session.');
      }
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Supabase Registration Error:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Supabase Google Sign In Error:", error);
      throw error;
    }
  };

  // Generic mutation dispatcher for offline-first action queueing
  const performMutation = async (
    type: PendingAction['type'],
    url: string,
    method: PendingAction['method'],
    payload: any
  ) => {
    const actionId = `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newAction: PendingAction = {
      id: actionId,
      type,
      url,
      method,
      payload,
      timestamp: Date.now()
    };

    // If browser is offline, queue the action and return
    if (!navigator.onLine) {
      console.warn('Browser is offline, queueing action:', type);
      setPendingActions(prev => [...prev, newAction]);
      setDbError('Offline Mode: Changes are cached locally and will sync when online.');
      return { queued: true };
    }

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const responseText = await res.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {}

        const status = res.status;
        if (status >= 500) {
          throw new Error(errorData.error || 'Server error, queueing for retry.');
        } else {
          console.error('Client error from server:', errorData.error);
          return { success: false, error: errorData.error || 'Request rejected by server.' };
        }
      }

      setDbError(null);
      return { success: true };
    } catch (err: any) {
      console.warn('Network request failed, queueing action:', err.message);
      setPendingActions(prev => [...prev, newAction]);
      setDbError('Database connection issue. Changes are cached locally and will sync when online.');
      return { queued: true };
    }
  };

  // Sync engine to process queue items on network recovery
  const syncPendingActions = async () => {
    if (isSyncing || pendingActions.length === 0) return;
    if (!navigator.onLine) return;

    const token = localStorage.getItem('firebase_id_token');
    if (!token) return;

    setIsSyncing(true);
    setDbError('Synchronizing pending local updates...');

    console.log(`Sync engine: processing ${pendingActions.length} queued actions...`);
    
    let currentQueue = [...pendingActions];
    let failed = false;

    while (currentQueue.length > 0 && !failed) {
      const action = currentQueue[0];
      try {
        let finalPayload = { ...action.payload };

        // CONFLICT RESOLUTION / MERGE RULES:
        if (action.type === 'UPDATE_TASK') {
          const taskId = action.payload.id;
          
          const { data: serverTask, error: fetchErr } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .maybeSingle();

          if (!fetchErr && serverTask) {
            // Last Write Wins (LWW) status resolution
            const isClientNewer = action.timestamp > Date.parse(serverTask.created_at);
            
            if (!isClientNewer) {
              console.warn(`Sync Conflict on task ${taskId}: Server state is newer. Discarding status update.`);
              finalPayload.status = serverTask.status;
            }

            // Description Merge
            if (serverTask.description && finalPayload.description && serverTask.description !== finalPayload.description) {
              if (finalPayload.description.trim() !== '') {
                console.log(`Sync Conflict: Merging description text for task ${taskId}`);
                finalPayload.description = `${serverTask.description}\n[Merged Update]: ${finalPayload.description}`;
              }
            }
          } else if (!fetchErr && !serverTask) {
            console.warn(`Sync Conflict: Task ${taskId} was deleted on the server. Discarding pending update.`);
            currentQueue.shift();
            continue;
          }
        }

        const res = await fetch(action.url, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(finalPayload)
        });

        if (!res.ok) {
          const status = res.status;
          if (status >= 500) {
            throw new Error(`Server returned ${status}`);
          } else {
            console.warn(`Sync warning: Action ${action.id} failed with client status ${status}. Discarding from queue.`);
          }
        }

        currentQueue.shift();
        setPendingActions([...currentQueue]);
      } catch (err: any) {
        console.warn('Sync engine paused: Network/Server connection down:', err.message);
        failed = true;
      }
    }

    setIsSyncing(false);
    
    if (currentQueue.length === 0) {
      setDbError(null);
      fetchGroups(token);
      if (activeGroupId) {
        fetchGroupData(activeGroupId, token);
      }
      addNotification('Offline Sync Completed', 'All queued offline updates have been successfully merged with the database.', 'success');
    } else {
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }
  };

  // Trigger sync on recovery
  useEffect(() => {
    if (pendingActions.length > 0 && navigator.onLine) {
      const token = localStorage.getItem('firebase_id_token');
      if (token) {
        syncPendingActions();
      }
    }
  }, [pendingActions.length, isLoggedIn]);

  // Set up intervals and event listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('Browser back online, triggering sync...');
      syncPendingActions();
    };

    window.addEventListener('online', handleOnline);

    const interval = setInterval(() => {
      if (pendingActions.length > 0 && navigator.onLine) {
        syncPendingActions();
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [pendingActions, isSyncing]);

  // Task Operations
  const addTask = async (task: Omit<Task, 'id'> & { groupId?: string }) => {
    const newId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newTask: Task = {
      ...task,
      groupId: task.groupId || activeGroupId || 'CS402-G4',
      id: newId,
    };
    setTasks(prev => [newTask, ...prev]);

    performMutation('ADD_TASK', '/api/project/tasks', 'POST', newTask);

    const assigneesText = task.assignees.length > 0
      ? members.filter(m => task.assignees.includes(m.id)).map(m => m.name).join(', ')
      : 'Unassigned';
    
    addNotification(
      'New Task Created',
      `"${task.title}" has been assigned to: ${assigneesText}`,
      'info'
    );
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));

    const taskObj = tasks.find(t => t.id === taskId);
    if (!taskObj) return;

    performMutation('UPDATE_TASK', '/api/project/tasks', 'POST', { ...taskObj, status });
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    performMutation('DELETE_TASK', `/api/project/tasks/${taskId}`, 'DELETE', { id: taskId });
  };

  // Commit / Contribution Operations
  const addCommit = async (title: string, description: string, type: Commit['type'], file?: { name: string; size: string; type: string }, authorOverride?: { id: string; name: string }) => {
    const finalMemberId = authorOverride ? authorOverride.id : currentUser.id;
    const finalAuthorName = authorOverride ? authorOverride.name : currentUser.name;
    const newCommit: Commit = {
      id: `commit_${Date.now()}`,
      memberId: finalMemberId,
      authorName: finalAuthorName,
      title,
      description,
      type,
      linesAdded: Math.floor(Math.random() * 400) + 15,
      timestamp: new Date().toISOString(),
      attachment: file,
      groupId: activeGroupId || 'CS402-G4',
    };

    setCommits(prev => [newCommit, ...prev]);

    performMutation('ADD_COMMIT', '/api/project/commits', 'POST', newCommit);

    addNotification(
      'Contribution Logged',
      `${finalAuthorName} submitted progress update: "${title}"`,
      'success'
    );
  };

  // Peer Feedback Submission
  const submitFeedback = async (
    toMemberId: string,
    ratingQuality: number,
    ratingReliability: number,
    ratingCommunication: number,
    ratingContribution: number,
    comment: string
  ) => {
    const newFeedback: FeedbackSubmission = {
      id: `feed_${Date.now()}`,
      fromAnonymousId: `anon_${Math.floor(Math.random() * 1000)}`,
      toMemberId,
      ratingQuality,
      ratingReliability,
      ratingCommunication,
      ratingContribution,
      comment,
      timestamp: new Date().toISOString(),
      groupId: activeGroupId || 'CS402-G4',
    };

    const updatedFeedback = [newFeedback, ...feedback];
    setFeedback(updatedFeedback);

    performMutation('SUBMIT_FEEDBACK', '/api/project/feedback', 'POST', newFeedback);

    addNotification(
      'Anonymous Feedback Submitted',
      'Your peer evaluation has been encrypted and pooled successfully.',
      'success'
    );
  };

  // Vote (or un-vote) a single slot — current user only, no auto-simulation
  const votePollSlot = async (pollId: string, slotId: string) => {
    let nextProposedSlots: any[] = [];

    setPolls(prev => {
      const nextPolls = prev.map(p => {
        if (p.id !== pollId) return p;

        const updatedSlots = p.proposedSlots.map(s => {
          if (s.id !== slotId) return s;
          const alreadyVoted = s.votedMemberIds.includes(currentUser.id);
          return {
            ...s,
            votedMemberIds: alreadyVoted
              ? s.votedMemberIds.filter(id => id !== currentUser.id)
              : [...s.votedMemberIds, currentUser.id],
          };
        });

        nextProposedSlots = updatedSlots;
        return { ...p, proposedSlots: updatedSlots };
      });
      return nextPolls;
    });

    performMutation('VOTE_POLL', `/api/project/polls/${pollId}/vote`, 'PUT', { proposedSlots: nextProposedSlots });
  };

  // Close a poll: pick the slot with the highest votes, schedule it as a meeting event, remove the poll
  const closePoll = (pollId: string) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    // Find the slot with the most votes (tie-break: first one wins)
    let bestSlot = poll.proposedSlots[0];
    poll.proposedSlots.forEach(s => {
      if (s.votedMemberIds.length > bestSlot.votedMemberIds.length) {
        bestSlot = s;
      }
    });

    // Schedule as a meeting event
    addEvent(
      `${poll.title} - Finalized`,
      bestSlot.time,
      'meeting',
      `Scheduled based on team availability votes. Winning slot: "${bestSlot.time}" with ${bestSlot.votedMemberIds.length} vote(s).`
    );

    // Remove the resolved poll
    setPolls(prev => prev.filter(p => p.id !== pollId));
    performMutation('DELETE_TASK', `/api/project/polls/${pollId}`, 'DELETE', { id: pollId });

    addNotification(
      'Meeting Finalized & Scheduled',
      `"${poll.title}" has been scheduled for ${bestSlot.time}`,
      'success'
    );
  };

  // Create Meeting slot Poll
  const createMeetingPoll = async (title: string, description: string, slots: string[]) => {
    const newPoll: MeetingPoll = {
      id: `poll_${Date.now()}`,
      title,
      description,
      proposedSlots: slots.map((time, idx) => ({
        id: `slot_${Date.now()}_${idx}`,
        time,
        votedMemberIds: [],
      })),
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
      createdBy: currentUser.id,
      groupId: activeGroupId || 'CS402-G4',
    };

    setPolls(prev => [newPoll, ...prev]);

    performMutation('CREATE_POLL', '/api/project/polls', 'POST', newPoll);

    addNotification(
      'New Meeting Poll Created',
      `"${title}" was created by ${currentUser.name}. Vote on your available slots.`,
      'info'
    );
  };

  // Events
  const addEvent = async (title: string, time: string, type: Event['type'], description: string) => {
    const newEvent: Event = {
      id: `evt_${Date.now()}`,
      title,
      time,
      type,
      description,
      completed: false,
      groupId: activeGroupId || 'CS402-G4',
    };
    setEvents(prev => [...prev, newEvent].sort((a, b) => a.time.localeCompare(b.time)));

    performMutation('ADD_EVENT', '/api/project/events', 'POST', newEvent);

    addNotification(
      'New Event Calendar Registered',
      `"${title}" is added to the shared schedule map.`,
      'info'
    );
  };

  const toggleEventCompleted = async (id: string) => {
    let updated: any = null;
    setEvents(prev => prev.map(e => {
      if (e.id === id) {
        updated = { ...e, completed: !e.completed };
        return updated;
      }
      return e;
    }));

    if (!updated) return;

    performMutation('TOGGLE_EVENT', '/api/project/events', 'POST', updated);
  };

  // Group operations
  const createGroup = async (id: string, name: string, description: string, password?: string) => {
    const gId = id.trim().replace(/[^a-zA-Z0-9_-]/g, '-').toUpperCase();
    if (!gId) throw new Error('Invalid Group ID.');
    
    const newGroup: Group = {
      id: gId,
      name,
      description,
      password: password || '',
      ownerId: currentUser.id,
      memberIds: [currentUser.id],
      pendingRequests: []
    };

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch('/api/project/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ id: gId, name, description, password })
      });
      if (!res.ok) {
        const errorText = await res.text();
        let errMsg = 'Failed to create group.';
        let suggestions: string[] = [];
        try {
          const errJson = JSON.parse(errorText);
          errMsg = errJson.error || errMsg;
          suggestions = errJson.suggestions || [];
        } catch(e) {}
        
        const errorObj: any = new Error(errMsg);
        errorObj.suggestions = suggestions;
        throw errorObj;
      }
      const data = await res.json();
      const enrichedGroup = data.group;
      
      setGroups(prev => [...prev.filter(g => g.id !== gId), enrichedGroup]);
      setActiveGroupId(gId);
      setDbError(null);

      addNotification(
        'Group Created Successfully',
        `Your new group "${name}" has been created with ID "${gId}".`,
        'success'
      );

      return enrichedGroup;
    } catch (err: any) {
      if (err.suggestions) {
        // Re-throw database validation error
        throw err;
      }

      console.warn('Sync failed:', err.message);
      
      // Offline fallback: update local state
      setGroups(prev => [...prev.filter(g => g.id !== gId), newGroup]);
      setActiveGroupId(gId);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
      
      addNotification(
        'Group Created (Offline Cache)',
        `Your new group "${name}" has been created locally with ID "${gId}".`,
        'info'
      );

      return newGroup;
    }
  };

  const joinGroupRequest = async (groupId: string, password?: string) => {
    const cleanId = groupId.trim().toUpperCase();
    if (!cleanId) {
      return { success: false, message: 'Please enter a valid Group ID.' };
    }

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch(`/api/project/groups/${cleanId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ password })
      });

      const responseText = await res.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {}

      if (!res.ok) {
        const errorMsg = responseData.error || 'Failed to submit join request.';
        return { success: false, message: errorMsg };
      }

      if (responseData.passwordRequired) {
        return { success: true, passwordRequired: true, message: 'Password is required to join this group.' };
      }

      if (responseData.joinedDirectly === false) {
        addNotification(
          'Join Request Submitted',
          responseData.message || `Your request to join group "${cleanId}" has been submitted and is pending owner approval.`,
          'info'
        );
        return { success: true, message: responseData.message || 'Join request submitted for approval.', requested: true };
      }

      addNotification(
        'Joined Group Successfully',
        `You have successfully joined group "${cleanId}".`,
        'success'
      );

      // Re-fetch groups list
      fetchGroups(token || undefined);
      
      // Navigate to the newly joined group
      setActiveGroupId(cleanId);

      return { success: true, message: responseData.message || 'Joined group successfully!', requested: false };
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      
      // Offline fallback using cached groups
      const localGroup = groups.find(g => g.id.toLowerCase() === cleanId.toLowerCase());
      if (!localGroup) {
        return { success: false, message: 'Offline Mode: Group was not found in local cache.' };
      }
      if (localGroup.memberIds.includes(currentUser.id)) {
        return { success: false, message: 'You are already a member of this group.' };
      }
      if (localGroup.password && localGroup.password !== password) {
        return { success: false, message: 'Incorrect group password. Please try again.' };
      }

      if (localGroup.password) {
        setGroups(prev => prev.map(g => {
          if (g.id.toLowerCase() === cleanId.toLowerCase()) {
             const already = g.pendingRequests?.some(r => r.userId === currentUser.id);
             if (already) return g;
             return {
               ...g,
               pendingRequests: [
                 ...(g.pendingRequests || []),
                 {
                   userId: currentUser.id,
                   userName: currentUser.name,
                   userEmail: currentUser.email
                 }
               ]
             };
          }
          return g;
        }));

        setDbError('Database connection issue. Running in offline Local Storage mode.');
        return { success: true, message: 'Offline Mode: Join request cached locally.', requested: true };
      } else {
        setGroups(prev => prev.map(g => {
          if (g.id.toLowerCase() === cleanId.toLowerCase()) {
            return {
              ...g,
              memberIds: Array.from(new Set([...g.memberIds, currentUser.id]))
            };
          }
          return g;
        }));
        setActiveGroupId(cleanId);
        setDbError('Database connection issue. Running in offline Local Storage mode.');
        return { success: true, message: 'Offline Mode: Joined group successfully!', requested: false };
      }
    }
  };

  const approveJoinRequest = async (groupId: string, userId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const request = group.pendingRequests.find(r => r.userId === userId);
    if (!request) return;

    // Add placeholder profile immediately so they appear in members selector
    const newMemberProfile = {
      id: userId,
      name: request.userName,
      email: request.userEmail,
      role: 'Project Member',
      avatar: request.userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'US',
      color: 'bg-indigo-500',
      commitsCount: 0,
      contributionScore: 10.0
    };

    setMembers(prev => {
      if (prev.some(m => m.id === userId)) return prev;
      return [...prev, newMemberProfile];
    });

    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          memberIds: [...g.memberIds, userId],
          pendingRequests: g.pendingRequests.filter(r => r.userId !== userId)
        };
      }
      return g;
    }));

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch(`/api/project/groups/${groupId}/requests/${userId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) throw new Error('Database approve failed.');
      fetchGroupData(groupId);
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

    addNotification(
      'Member Approved',
      `Approved ${request.userName} to join group "${group.name}".`,
      'success'
    );
  };

  const declineJoinRequest = async (groupId: string, userId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const request = group.pendingRequests.find(r => r.userId === userId);
    if (!request) return;

    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          pendingRequests: g.pendingRequests.filter(r => r.userId !== userId)
        };
      }
      return g;
    }));

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch(`/api/project/groups/${groupId}/requests/${userId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) throw new Error('Database decline failed.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

    addNotification(
      'Request Declined',
      `Declined join request from ${request.userName} for group "${group.name}".`,
      'info'
    );
  };

  const addMemberByEmail = async (groupId: string, email: string) => {
    if (!navigator.onLine) {
      return { success: false, message: 'Offline Mode: You must be online to add group members by email.' };
    }

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch(`/api/project/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ email })
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to add member.');
      }

      // Refresh group details to reflect the new member in frontend state
      await fetchGroupData(groupId, token || undefined);

      addNotification(
        'Member Added Directly',
        `Successfully added ${email} to group workspace.`,
        'success'
      );

      return { success: true, message: responseData.message || 'Member added successfully!' };
    } catch (err: any) {
      console.error('Error adding member by email:', err);
      return { success: false, message: err.message || 'Failed to add member.' };
    }
  };

  const updateGroupSettings = async (
    groupId: string,
    updates: { name?: string; description?: string; evaluationDate?: string; newGroupId?: string; password?: string }
  ) => {
    // If it's a new group ID, it must be online to verify and cascade.
    if (updates.newGroupId) {
      const token = localStorage.getItem('firebase_id_token');
      try {
        const res = await fetch(`/api/project/groups/${groupId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(updates)
        });
        
        const responseData = await res.json();
        if (!res.ok) {
          throw new Error(responseData.error || 'Failed to update group settings.');
        }

        const updatedGroup = responseData.group;
        
        setGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
        setActiveGroupId(responseData.newGroupId);
        localStorage.setItem('0mess_active_group_id', responseData.newGroupId);
        setDbError(null);
        return { success: true, message: 'Settings updated successfully.', newGroupId: responseData.newGroupId };
      } catch (err: any) {
        return { success: false, message: err.message || 'Database connection issue.' };
      }
    }

    // Otherwise, optimistically update locally and queue
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          name: updates.name !== undefined ? updates.name : g.name,
          description: updates.description !== undefined ? updates.description : g.description,
          evaluationDate: updates.evaluationDate !== undefined ? updates.evaluationDate : g.evaluationDate,
          password: updates.password !== undefined ? updates.password : g.password
        };
      }
      return g;
    }));

    const result = await performMutation('UPDATE_GROUP_SETTINGS', `/api/project/groups/${groupId}`, 'PUT', updates);
    if (result.queued) {
      return { success: true, message: 'Offline Mode: Settings updated locally and queued for sync.' };
    }
    return { success: result.success, message: result.success ? 'Settings updated successfully.' : 'Failed to update settings.' };
  };

  const updateGroupEvaluationDate = async (groupId: string, evaluationDate: string) => {
    const res = await updateGroupSettings(groupId, { evaluationDate });
    return res.success;
  };

  // Helper Notifications
  const addNotification = (title: string, message: string, type: Notification['type']) => {
    const newNotification: Notification = {
      id: `not_${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const resetAllCaches = () => {
    localStorage.removeItem('0mess_tasks');
    localStorage.removeItem('0mess_commits');
    localStorage.removeItem('0mess_feedback');
    localStorage.removeItem('0mess_polls');
    localStorage.removeItem('0mess_events');
    localStorage.removeItem('0mess_notifications');
    localStorage.removeItem('0mess_groups');
    localStorage.removeItem('0mess_members');
    localStorage.removeItem('0mess_active_group_id');
    localStorage.removeItem('0mess_logged_in');
    localStorage.removeItem('0mess_current_user');
    window.location.reload();
  };

  const updateProfile = async (profileData: Partial<Member>) => {
    const updatedUser = {
      ...currentUser,
      ...profileData
    };
    
    setCurrentUser(updatedUser);
    localStorage.setItem('0mess_current_user', JSON.stringify(updatedUser));
    
    setMembers(prev => prev.map(m => m.id === currentUser.id ? { ...m, ...profileData } : m));

    const result = await performMutation('UPDATE_PROFILE', '/api/project/profile', 'POST', updatedUser);
    return result.success || !!result.queued;
  };

  // Filter datasets
  const currentGroupId = activeGroupId || 'CS402-G4';
  
  const filteredTasks = tasks.filter(t => (t.groupId || 'CS402-G4') === currentGroupId);
  const filteredCommits = commits.filter(c => (c.groupId || 'CS402-G4') === currentGroupId);
  const filteredFeedback = feedback.filter(f => (f.groupId || 'CS402-G4') === currentGroupId);
  const filteredPolls = polls.filter(p => (p.groupId || 'CS402-G4') === currentGroupId);
  const filteredEvents = events.filter(e => (e.groupId || 'CS402-G4') === currentGroupId);
  
  const activeGroupObj = groups.find(g => g.id === currentGroupId);
  const activeMemberIds = activeGroupObj ? activeGroupObj.memberIds : [];
  const filteredMembers = members.filter(m => activeMemberIds.includes(m.id) || m.id === currentUser.id);

  // Dynamically calculate classmate workload tasks completion, commit logs metrics, and peer evaluations
  const computedMembers = filteredMembers.map(m => {
    // 1. Calculate commitsCount
    const memberCommits = filteredCommits.filter(c => c.memberId === m.id);
    const commitsCount = memberCommits.length;

    // 2. Calculate tasks progress score (S_tasks)
    const memberTasks = filteredTasks.filter(t => t.assignees.includes(m.id));
    const totalTasks = memberTasks.length;
    const completedTasks = memberTasks.filter(t => t.status === 'COMPLETED').length;
    const sTasks = totalTasks > 0 ? (completedTasks / totalTasks) * 10.0 : 10.0;

    // 3. Calculate commits score (S_commits)
    // 5 commits = max score of 10.0
    const sCommits = Math.min(commitsCount * 2.0, 10.0);

    // 4. Calculate peer feedback score (S_feedback)
    const memberFeedbacks = filteredFeedback.filter(f => f.toMemberId === m.id);
    let sFeedback = 10.0; // Default baseline if no feedback exists
    if (memberFeedbacks.length > 0) {
      const totalScore = memberFeedbacks.reduce((sum, f) => {
        const avg = (f.ratingQuality + f.ratingReliability + f.ratingCommunication + f.ratingContribution) / 4.0;
        return sum + avg;
      }, 0);
      const calculatedAvg = totalScore / memberFeedbacks.length;
      sFeedback = calculatedAvg * 2.0; // Scale 1-5 to 0-10
    }

    // 5. Calculate unified contributionScore
    // Weighted blend: 40% tasks progress, 40% commits/logs, 20% peer feedback
    let contributionScore = 10.0;
    if (totalTasks > 0) {
      contributionScore = (sTasks * 0.4) + (sCommits * 0.4) + (sFeedback * 0.2);
    } else {
      // If no tasks assigned, 70% commits/logs, 30% peer feedback
      contributionScore = (sCommits * 0.7) + (sFeedback * 0.3);
    }

    // Round to 1 decimal place
    contributionScore = parseFloat(contributionScore.toFixed(1));

    return {
      ...m,
      commitsCount,
      contributionScore
    };
  });

  const resolvedCurrentUser = computedMembers.find(m => m.id === currentUser.id) || {
    ...currentUser,
    commitsCount: filteredCommits.filter(c => c.memberId === currentUser.id).length,
    contributionScore: 10.0
  };

  return (
    <ProjectContext.Provider value={{
      members: computedMembers,
      tasks: filteredTasks,
      commits: filteredCommits,
      feedback: filteredFeedback,
      polls: filteredPolls,
      events: filteredEvents,
      notifications,
      currentUser: resolvedCurrentUser,
      isLoggedIn,
      login,
      logout,
      register,
      signInWithGoogle,
      addTask,
      updateTaskStatus,
      deleteTask,
      addCommit,
      submitFeedback,
      votePollSlot,
      closePoll,
      createMeetingPoll,
      addEvent,
      toggleEventCompleted,
      markNotificationRead,
      clearNotifications,
      groups,
      activeGroupId,
      createGroup,
      joinGroupRequest,
      approveJoinRequest,
      declineJoinRequest,
      addMemberByEmail,
      setActiveGroupId,
      resetAllCaches,
      updateProfile,
      updateGroupEvaluationDate,
      updateGroupSettings,
      dbError,
      pendingActionsCount: pendingActions.length
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
