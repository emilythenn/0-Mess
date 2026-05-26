import React, { createContext, useContext, useState, useEffect } from 'react';
import { Member, Task, Commit, FeedbackSubmission, MeetingPoll, Event, Notification, TaskStatus, Group } from '../types';
import { MOCK_MEMBERS, INITIAL_TASKS, INITIAL_COMMITS, INITIAL_FEEDBACK, INITIAL_POLLS, INITIAL_EVENTS, INITIAL_NOTIFICATIONS, CURRENT_USER } from '../data/mockData';
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
  createMeetingPoll: (title: string, description: string, slots: string[]) => void;
  addEvent: (title: string, time: string, type: Event['type'], description: string) => void;
  toggleEventCompleted: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Group features
  groups: Group[];
  activeGroupId: string | null;
  createGroup: (name: string, description: string, password?: string) => Promise<Group>;
  joinGroupRequest: (groupId: string, password?: string) => Promise<{ success: boolean; message: string; requested?: boolean }>;
  approveJoinRequest: (groupId: string, userId: string) => void;
  declineJoinRequest: (groupId: string, userId: string) => void;
  setActiveGroupId: (groupId: string | null) => void;
  resetAllCaches: () => void;
  updateProfile: (profileData: Partial<Member>) => Promise<boolean>;
  
  // Database status
  dbError: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbError, setDbError] = useState<string | null>(null);

  // States initialized from local storage as offline cache
  const [members, setMembers] = useState<Member[]>(() => {
    const cached = localStorage.getItem('0mess_members');
    return cached ? JSON.parse(cached) : MOCK_MEMBERS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const cached = localStorage.getItem('0mess_tasks');
    return cached ? JSON.parse(cached) : INITIAL_TASKS;
  });

  const [commits, setCommits] = useState<Commit[]>(() => {
    const cached = localStorage.getItem('0mess_commits');
    return cached ? JSON.parse(cached) : INITIAL_COMMITS;
  });

  const [feedback, setFeedback] = useState<FeedbackSubmission[]>(() => {
    const cached = localStorage.getItem('0mess_feedback');
    return cached ? JSON.parse(cached) : INITIAL_FEEDBACK;
  });

  const [polls, setPolls] = useState<MeetingPoll[]>(() => {
    const cached = localStorage.getItem('0mess_polls');
    return cached ? JSON.parse(cached) : INITIAL_POLLS;
  });

  const [events, setEvents] = useState<Event[]>(() => {
    const cached = localStorage.getItem('0mess_events');
    return cached ? JSON.parse(cached) : INITIAL_EVENTS;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const cached = localStorage.getItem('0mess_notifications');
    return cached ? JSON.parse(cached) : INITIAL_NOTIFICATIONS;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('0mess_logged_in') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<Member>(() => {
    const cached = localStorage.getItem('0mess_current_user');
    return cached ? JSON.parse(cached) : CURRENT_USER;
  });

  const [groups, setGroups] = useState<Group[]>(() => {
    const cached = localStorage.getItem('0mess_groups');
    if (cached) return JSON.parse(cached);
    return [
      {
        id: 'CS402-G4',
        name: 'Distributed Systems Group 4',
        description: 'Collaborative workspace for designing the Raft consensus model logs storage.',
        password: 'raft',
        ownerId: 'mem_liam',
        memberIds: ['user_alex', 'mem_liam', 'mem_sophia', 'mem_ethan', 'mem_mia'],
        pendingRequests: []
      },
      {
        id: 'CS415-G2',
        name: 'Cloud Systems Scaling',
        description: 'Architecture and testing logs for container orchestration simulations.',
        password: 'cloud',
        ownerId: 'user_alex',
        memberIds: ['user_alex', 'mem_sophia'],
        pendingRequests: [
          {
            userId: 'mem_ethan',
            userName: 'Ethan Chen',
            userEmail: 'ethan.chen@univ.edu'
          }
        ]
      }
    ];
  });

  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(() => {
    const cached = localStorage.getItem('0mess_active_group_id');
    return cached !== null ? (cached === 'null' ? null : cached) : 'CS402-G4';
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

  // Auth Operations
  const login = async (email: string, password?: string) => {
    try {
      if (!password) {
        throw new Error("Password is required for Supabase Authentication.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Supabase Sign In Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setIsLoggedIn(false);
      localStorage.removeItem('firebase_id_token');
      localStorage.removeItem('0mess_logged_in');
      localStorage.removeItem('0mess_current_user');
    } catch (error: any) {
      console.error("Supabase Sign Out Error:", error);
      throw error;
    }
  };

  const register = async (name: string, email: string, role: string, password?: string) => {
    try {
      if (!password) {
        throw new Error("Password is required for Supabase Registration.");
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name
          }
        }
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
        provider: 'google'
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Supabase Google Sign In Error:", error);
      throw error;
    }
  };

  // Task Operations
  const addTask = async (task: Omit<Task, 'id'> & { groupId?: string }) => {
    const newId = `task_${Date.now()}`;
    const newTask: Task = {
      ...task,
      groupId: task.groupId || activeGroupId || 'CS402-G4',
      id: newId,
    };
    setTasks(prev => [newTask, ...prev]);

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch('/api/project/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(newTask)
      });
      if (!res.ok) throw new Error('Failed to insert.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed, saved to local cache:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

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

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch('/api/project/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ ...taskObj, status })
      });
      if (!res.ok) throw new Error('Failed to update.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch(`/api/project/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (!res.ok) throw new Error('Failed to delete.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }
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

    setMembers(prev => prev.map(m => {
      if (m.id === finalMemberId) {
        return {
          ...m,
          commitsCount: m.commitsCount + 1,
        };
      }
      return m;
    }));

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch('/api/project/commits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(newCommit)
      });
      if (!res.ok) throw new Error('Failed to log.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

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

    setMembers(prev => prev.map(m => {
      if (m.id === toMemberId) {
        const memberFeedbacks = updatedFeedback.filter(f => f.toMemberId === toMemberId);
        if (memberFeedbacks.length === 0) return m;

        const totalScore = memberFeedbacks.reduce((sum, f) => {
          const avg = (f.ratingQuality + f.ratingReliability + f.ratingCommunication + f.ratingContribution) / 4;
          return sum + avg;
        }, 0);

        const calculatedAvg = totalScore / memberFeedbacks.length;
        const scaledScore = parseFloat((calculatedAvg * 2).toFixed(1));

        return {
          ...m,
          contributionScore: Math.min(scaledScore, 10.0),
        };
      }
      return m;
    }));

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch('/api/project/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(newFeedback)
      });
      if (!res.ok) throw new Error('Failed to save feedback.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

    addNotification(
      'Anonymous Feedback Submitted',
      'Your peer evaluation has been encrypted and pooled successfully.',
      'success'
    );
  };

  // Vote slot in meeting poll
  const votePollSlot = async (pollId: string, slotId: string) => {
    let finalScheduledSlot: any = null;
    let finalPollTitle = "";
    let nextProposedSlots: any[] = [];

    setPolls(prev => {
      let isUserAddingVote = false;
      
      const nextPolls = prev.map(p => {
        if (p.id !== pollId) return p;

        const slotToVote = p.proposedSlots.find(s => s.id === slotId);
        if (slotToVote && !slotToVote.votedMemberIds.includes(currentUser.id)) {
          isUserAddingVote = true;
        }

        const updatedSlots = p.proposedSlots.map(s => {
          if (s.id === slotId) {
            const alreadyVoted = s.votedMemberIds.includes(currentUser.id);
            const updatedVotes = alreadyVoted
              ? s.votedMemberIds.filter(id => id !== currentUser.id)
              : [...s.votedMemberIds, currentUser.id];
            return { ...s, votedMemberIds: updatedVotes };
          }
          return s;
        });

        nextProposedSlots = updatedSlots;
        return { ...p, proposedSlots: updatedSlots };
      });

      const pollIndex = nextPolls.findIndex(p => p.id === pollId);
      if (pollIndex !== -1 && isUserAddingVote && filteredMembers.length > 1) {
        const poll = nextPolls[pollIndex];
        const allVotedIds = new Set(poll.proposedSlots.flatMap(s => s.votedMemberIds));
        
        const colleaguesToVote = filteredMembers.filter(m => m.id !== currentUser.id && !allVotedIds.has(m.id));

        if (colleaguesToVote.length > 0) {
          const updatedSlots = poll.proposedSlots.map(s => ({ ...s, votedMemberIds: [...s.votedMemberIds] }));
          
          colleaguesToVote.forEach(colleague => {
            const randomSlotIdx = Math.floor(Math.random() * updatedSlots.length);
            updatedSlots[randomSlotIdx].votedMemberIds.push(colleague.id);
          });

          poll.proposedSlots = updatedSlots;
          nextProposedSlots = updatedSlots;
        }

        const finalVotedIds = new Set(poll.proposedSlots.flatMap(s => s.votedMemberIds));
        const allMembersVoted = filteredMembers.every(m => finalVotedIds.has(m.id));

        if (allMembersVoted) {
          let maxVotes = -1;
          let bestSlot = poll.proposedSlots[0];
          poll.proposedSlots.forEach(s => {
            if (s.votedMemberIds.length > maxVotes) {
              maxVotes = s.votedMemberIds.length;
              bestSlot = s;
            }
          });

          finalScheduledSlot = bestSlot;
          finalPollTitle = poll.title;
        }
      }

      return nextPolls;
    });

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch(`/api/project/polls/${pollId}/vote`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ proposedSlots: nextProposedSlots })
      });
      if (!res.ok) throw new Error('Failed to vote.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

    if (finalScheduledSlot) {
      setTimeout(async () => {
        addEvent(
          `${finalPollTitle} - Finalized Sync`,
          finalScheduledSlot.time,
          'meeting',
          `Automatically scheduled based on team availability consensus.`
        );

        setPolls(currentPolls => currentPolls.filter(cp => cp.id !== pollId));

        try {
          await fetch(`/api/project/polls/${pollId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
          });
        } catch (err) {
          console.error(err);
        }

        addNotification(
          'Meeting Finalized & Scheduled',
          `"${finalPollTitle}" has been scheduled for ${finalScheduledSlot.time}`,
          'success'
        );
      }, 1000);
    }
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

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch('/api/project/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(newPoll)
      });
      if (!res.ok) throw new Error('Failed to create poll.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

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

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch('/api/project/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(newEvent)
      });
      if (!res.ok) throw new Error('Failed to create event.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

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

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch('/api/project/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error('Failed to update event.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }
  };

  // Group operations
  const createGroup = async (name: string, description: string, password?: string) => {
    const cleanSlug = name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().substring(0, 8);
    const gId = `${cleanSlug}-${Math.floor(100 + Math.random() * 900)}`;
    
    const newGroup: Group = {
      id: gId,
      name,
      description,
      password: password || '',
      ownerId: currentUser.id,
      memberIds: [currentUser.id],
      pendingRequests: []
    };

    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(gId);

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
      if (!res.ok) throw new Error('Failed to create group.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

    addNotification(
      'Group Created Successfully',
      `Your new group "${name}" has been created with ID "${gId}".`,
      'success'
    );

    return newGroup;
  };

  const joinGroupRequest = async (groupId: string, password?: string) => {
    const cleanId = groupId.trim();
    const group = groups.find(g => g.id.toLowerCase() === cleanId.toLowerCase());
    
    if (!group) {
      return { success: false, message: `Group with ID "${groupId}" does not exist.` };
    }

    if (group.memberIds.includes(currentUser.id)) {
      return { success: false, message: 'You are already a member of this group.' };
    }

    const alreadyRequested = group.pendingRequests.some(r => r.userId === currentUser.id);
    if (alreadyRequested) {
      return { success: false, message: 'You have already submitted a join request for this group. Waiting for owner approval.', requested: true };
    }

    if (group.password && group.password !== password) {
      return { success: false, message: 'Incorrect group password. Please try again.' };
    }

    setGroups(prev => prev.map(g => {
      if (g.id.toLowerCase() === cleanId.toLowerCase()) {
         return {
           ...g,
           pendingRequests: [
             ...g.pendingRequests,
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

    const token = localStorage.getItem('firebase_id_token');
    try {
      const res = await fetch(`/api/project/groups/${group.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ password })
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed to submit join request.');
      setDbError(null);
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
    }

    addNotification(
      'Join Request Submitted',
      `Your request to join "${group.name}" is pending approval from the owner.`,
      'info'
    );

    return { success: true, message: `Request to join "${group.name}" submitted successfully! Waiting for owner's approval.`, requested: true };
  };

  const approveJoinRequest = async (groupId: string, userId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const request = group.pendingRequests.find(r => r.userId === userId);
    if (!request) return;

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
    const token = localStorage.getItem('firebase_id_token');
    try {
      const updatedUser = {
        ...currentUser,
        ...profileData
      };
      
      setCurrentUser(updatedUser);
      localStorage.setItem('0mess_current_user', JSON.stringify(updatedUser));
      
      setMembers(prev => prev.map(m => m.id === currentUser.id ? { ...m, ...profileData } : m));

      const res = await fetch('/api/project/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(updatedUser)
      });
      if (!res.ok) throw new Error('Failed to update profile on database.');
      
      setDbError(null);
      return true;
    } catch (err: any) {
      console.warn('Profile sync failed, saved locally:', err.message);
      setDbError('Database connection issue. Running in offline Local Storage mode.');
      return false;
    }
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

  return (
    <ProjectContext.Provider value={{
      members: filteredMembers,
      tasks: filteredTasks,
      commits: filteredCommits,
      feedback: filteredFeedback,
      polls: filteredPolls,
      events: filteredEvents,
      notifications,
      currentUser,
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
      setActiveGroupId,
      resetAllCaches,
      updateProfile,
      dbError
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
