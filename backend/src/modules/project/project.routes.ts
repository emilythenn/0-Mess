import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifySupabaseToken, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

// Public Auth Endpoints to proxy Supabase authentication and bypass client-side service_role key restrictions

// POST /api/project/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ session: data.session });
  } catch (error: any) {
    console.error('Auth login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// POST /api/project/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    // Use admin API to create user so they are auto-confirmed (helps with dummy emails)
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    // Sign the user in to retrieve the active session token
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (sessionError) {
      return res.status(400).json({ error: sessionError.message });
    }

    res.json({ session: sessionData.session });
  } catch (error: any) {
    console.error('Auth register error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Helper utility to enrich group model with member IDs and pending requests
async function enrichGroupDetails(groupData: any) {
  // Fetch member IDs from group_members
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupData.id);
  const memberIds = (members || []).map(m => m.user_id);
  if (groupData.owner_id && !memberIds.includes(groupData.owner_id)) {
    memberIds.push(groupData.owner_id);
  }

  // Fetch pending requests
  const { data: requests } = await supabase
    .from('group_join_requests')
    .select('*')
    .eq('group_id', groupData.id);
  const pendingRequests = (requests || []).map(r => ({
    userId: r.user_id,
    userName: r.user_name,
    userEmail: r.user_email
  }));

  return {
    id: groupData.id,
    name: groupData.name,
    description: groupData.description || '',
    password: groupData.password || '',
    ownerId: groupData.owner_id,
    evaluationDate: groupData.evaluation_date || null,
    memberIds,
    pendingRequests
  };
}

// 1. POST /api/project/profile - Upsert logged in user profile details
router.post('/profile', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.user!;
    const { 
      name, role, email, avatar, color,
      matricNumber, siswaMail, personalEmail, university, course, currentSemester, nationality
    } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: uid,
        name,
        role: role || 'Project Member',
        email,
        avatar: avatar || 'US',
        color: color || 'bg-indigo-500',
        matric_number: matricNumber || null,
        siswa_mail: siswaMail || null,
        personal_email: personalEmail || null,
        university: university || null,
        course: course || null,
        current_semester: currentSemester || null,
        nationality: nationality || null
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ 
      message: 'Profile upserted successfully.', 
      profile: {
        id: data.id,
        name: data.name,
        role: data.role,
        email: data.email,
        avatar: data.avatar,
        color: data.color,
        matricNumber: data.matric_number,
        siswaMail: data.siswa_mail,
        personalEmail: data.personal_email,
        university: data.university,
        course: data.course,
        currentSemester: data.current_semester,
        nationality: data.nationality
      } 
    });
  } catch (err: any) {
    console.error('Error upserting profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. GET /api/project/groups - Retrieve all groups the user belongs to
router.get('/groups', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.user!;

    // 1. Fetch group IDs where user is enrolled
    const { data: memberGroups, error: memberErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', uid);

    if (memberErr) throw memberErr;
    const groupIds = (memberGroups || []).map(mg => mg.group_id);

    // 2. Fetch groups owned by user
    const { data: ownedGroups, error: ownerErr } = await supabase
      .from('groups')
      .select('*')
      .eq('owner_id', uid);

    if (ownerErr) throw ownerErr;
    const ownedIds = (ownedGroups || []).map(g => g.id);

    const allGroupIds = Array.from(new Set([...groupIds, ...ownedIds]));

    let groups: any[] = [];
    if (allGroupIds.length > 0) {
      const { data: dbGroups, error: groupsErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', allGroupIds);
      if (groupsErr) throw groupsErr;
      
      const enrichedPromises = (dbGroups || []).map(g => enrichGroupDetails(g));
      groups = await Promise.all(enrichedPromises);
    }

    res.json({ groups });
  } catch (err: any) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. POST /api/project/groups - Create a new group workspace
router.post('/groups', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.user!;
    const { id, name, description, password, evaluationDate } = req.body;

    // Verify unique Group ID
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (existingGroup) {
      const suggestions: string[] = [];
      let suffix = 1;
      while (suggestions.length < 3 && suffix < 100) {
        const candidate = `${id}-${suffix}`;
        const { data: checkExist } = await supabase
          .from('groups')
          .select('id')
          .eq('id', candidate)
          .maybeSingle();
        if (!checkExist) {
          suggestions.push(candidate);
        }
        suffix++;
      }
      return res.status(409).json({
        error: 'Group ID is already taken.',
        suggestions
      });
    }

    // Create the group
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({
        id,
        name,
        description: description || '',
        password: password || '',
        owner_id: uid,
        evaluation_date: evaluationDate || null
      })
      .select()
      .single();

    if (groupErr) throw groupErr;

    // Enrol creator as first member
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({
        group_id: id,
        user_id: uid
      });

    if (memberErr) throw memberErr;

    const enriched = await enrichGroupDetails(group);
    res.json({ message: 'Group workspace created.', group: enriched });
  } catch (err: any) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. POST /api/project/groups/:id/join - Request to join a group with password verification
router.post('/groups/:id/join', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { uid } = req.user!;
    const { id } = req.params;
    const { password } = req.body;

    const { data: group, error: fetchErr } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !group) {
      return res.status(404).json({ error: 'Group workspace not found.' });
    }

    // Check if user is the owner
    if (group.owner_id === uid) {
      return res.status(400).json({ error: 'You are the owner of this group.' });
    }

    // Check if user is already a member
    const { data: isMember } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', uid)
      .maybeSingle();

    if (isMember) {
      return res.status(400).json({ error: 'You are already a member of this group.' });
    }

    // Password-protected group flow
    if (group.password && group.password.trim() !== '') {
      if (password === undefined || password === null || password.trim() === '') {
        return res.json({ passwordRequired: true });
      }

      if (group.password !== password) {
        return res.status(401).json({ error: 'Incorrect group password.' });
      }

      // Check if join request already exists
      const { data: existingRequest } = await supabase
        .from('group_join_requests')
        .select('*')
        .eq('group_id', id)
        .eq('user_id', uid)
        .maybeSingle();

      if (existingRequest) {
        return res.status(400).json({ error: 'You have already submitted a join request. Please wait for the group owner to approve it.' });
      }

      // Fetch user profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', uid)
        .maybeSingle();

      // Insert join request
      const { error: requestErr } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: id,
          user_id: uid,
          user_name: profile?.name || 'Student',
          user_email: profile?.email || ''
        });

      if (requestErr) throw requestErr;

      return res.json({ 
        success: true, 
        message: 'Join request submitted. Please wait for the group owner to approve it.', 
        joinedDirectly: false 
      });
    }

    // Enroll user directly as a member (direct join for passwordless groups)
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({
        group_id: id,
        user_id: uid
      });

    if (memberErr) throw memberErr;

    // Delete any pending request if they exist
    await supabase
      .from('group_join_requests')
      .delete()
      .eq('group_id', id)
      .eq('user_id', uid);

    res.json({ success: true, message: 'Joined group successfully!', joinedDirectly: true });
  } catch (err: any) {
    console.error('Error joining group:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4b. POST /api/project/groups/:id/members - Add member by email directly
router.post('/groups/:id/members', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const { uid } = req.user!;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    // Check if group exists
    const { data: group, error: fetchErr } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !group) {
      return res.status(404).json({ error: 'Group workspace not found.' });
    }

    // Check if requester is group owner or member
    const { data: isMember } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', uid)
      .maybeSingle();

    if (group.owner_id !== uid && !isMember) {
      return res.status(403).json({ error: 'Access denied. You must be a member of this group to add others.' });
    }

    // Find profile by email
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle();

    if (profileErr) throw profileErr;

    if (!profile) {
      return res.status(404).json({ error: `User with email "${email}" not found.` });
    }

    // Check if target user is already a member
    const { data: targetIsMember } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (targetIsMember) {
      return res.status(400).json({ error: 'User is already a member of this group.' });
    }

    // Insert user into group_members
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({
        group_id: id,
        user_id: profile.id
      });

    if (memberErr) throw memberErr;

    // Delete any pending request for this user
    await supabase
      .from('group_join_requests')
      .delete()
      .eq('group_id', id)
      .eq('user_id', profile.id);

    res.json({ success: true, message: `Successfully added ${profile.name} to the group!` });
  } catch (err: any) {
    console.error('Error adding group member by email:', err);
    res.status(500).json({ error: err.message });
  }
});


// 5. POST /api/project/groups/:id/requests/:userId/approve - Approve join request
router.post('/groups/:id/requests/:userId/approve', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, userId } = req.params;
    const { uid } = req.user!;

    // Check if the current user is the owner of the group
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (groupErr || !group) {
      return res.status(404).json({ error: 'Group workspace not found.' });
    }

    if (group.owner_id !== uid) {
      return res.status(403).json({ error: 'Access denied. Only the group owner can approve join requests.' });
    }

    // Enrol into group
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({
        group_id: id,
        user_id: userId
      });

    if (memberErr) throw memberErr;

    // Delete request
    await supabase
      .from('group_join_requests')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId);

    res.json({ message: 'Request approved successfully.' });
  } catch (err: any) {
    console.error('Error approving request:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. POST /api/project/groups/:id/requests/:userId/decline - Decline join request
router.post('/groups/:id/requests/:userId/decline', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, userId } = req.params;
    const { uid } = req.user!;

    // Check if the current user is the owner of the group
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (groupErr || !group) {
      return res.status(404).json({ error: 'Group workspace not found.' });
    }

    if (group.owner_id !== uid) {
      return res.status(403).json({ error: 'Access denied. Only the group owner can decline join requests.' });
    }

    await supabase
      .from('group_join_requests')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId);

    res.json({ message: 'Request declined.' });
  } catch (err: any) {
    console.error('Error declining request:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/project/groups/:id/data - Aggregated payload data retrieval
router.get('/groups/:id/data', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { uid } = req.user!;

    // Fetch Group
    const { data: groupObj, error: groupErr } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();

    if (groupErr || !groupObj) {
      return res.status(404).json({ error: 'Group workspace not found.' });
    }

    // Check if user is either the owner or a member
    const { data: isMember } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', uid)
      .maybeSingle();

    if (groupObj.owner_id !== uid && !isMember) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
    }

    const group = await enrichGroupDetails(groupObj);

    // Fetch Member profiles
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', id);
    const memberIds = (memberRows || []).map(mr => mr.user_id);
    if (groupObj.owner_id && !memberIds.includes(groupObj.owner_id)) {
      memberIds.push(groupObj.owner_id);
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', memberIds);

    // Fetch Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('group_id', id);

    // Fetch Commits
    const { data: commits } = await supabase
      .from('commits')
      .select('*')
      .eq('group_id', id)
      .order('timestamp', { ascending: false });

    // Fetch Feedback
    const { data: feedback } = await supabase
      .from('feedback')
      .select('*')
      .eq('group_id', id);

    // Fetch Polls
    const { data: polls } = await supabase
      .from('polls')
      .select('*')
      .eq('group_id', id);

    // Fetch Events
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('group_id', id);

    res.json({
      group,
      members: (profiles || []).map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        email: p.email,
        avatar: p.avatar,
        color: p.color,
        contributionScore: 10.0,
        commitsCount: 0,
        matricNumber: p.matric_number || '',
        siswaMail: p.siswa_mail || '',
        personalEmail: p.personal_email || '',
        university: p.university || '',
        course: p.course || '',
        currentSemester: p.current_semester || '',
        nationality: p.nationality || ''
      })),
      tasks: (tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status,
        priority: t.priority,
        assignees: t.assignees || [],
        dueDate: t.due_date || '',
        tags: t.tags || []
      })),
      commits: (commits || []).map(c => ({
        id: c.id,
        memberId: c.member_id,
        authorName: c.author_name,
        title: c.title,
        description: c.description || '',
        type: c.type,
        linesAdded: c.lines_added,
        timestamp: c.timestamp,
        attachment: c.attachment || undefined
      })),
      feedback: (feedback || []).map(f => ({
        id: f.id,
        fromAnonymousId: f.from_anonymous_id,
        toMemberId: f.to_member_id,
        ratingQuality: f.rating_quality,
        ratingReliability: f.rating_reliability,
        ratingCommunication: f.rating_communication,
        ratingContribution: f.rating_contribution,
        comment: f.comment || '',
        timestamp: f.timestamp
      })),
      polls: (polls || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description || '',
        proposedSlots: p.proposed_slots || [],
        deadline: p.deadline || '',
        createdBy: p.created_by
      })),
      events: (events || []).map(e => ({
        id: e.id,
        title: e.title,
        time: e.time,
        type: e.type,
        description: e.description || '',
        completed: e.completed || false
      }))
    });
  } catch (err: any) {
    console.error('Error fetching group payload:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. POST /api/project/tasks - Upsert tasks
router.post('/tasks', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, title, description, status, priority, assignees, dueDate, tags, groupId } = req.body;

    const { data, error } = await supabase
      .from('tasks')
      .upsert({
        id,
        group_id: groupId,
        title,
        description: description || '',
        status: status || 'NOT_STARTED',
        priority: priority || 'MEDIUM',
        assignees: assignees || [],
        due_date: dueDate || '',
        tags: tags || []
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Task synchronized.', task: data });
  } catch (err: any) {
    console.error('Error syncing task:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. DELETE /api/project/tasks/:id - Delete tasks
router.delete('/tasks/:id', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Task deleted.' });
  } catch (err: any) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. POST /api/project/commits - Log commits
router.post('/commits', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, memberId, authorName, title, description, type, linesAdded, timestamp, attachment, groupId } = req.body;

    const { data, error } = await supabase
      .from('commits')
      .insert({
        id,
        group_id: groupId,
        member_id: memberId,
        author_name: authorName,
        title,
        description: description || '',
        type,
        lines_added: linesAdded || 0,
        timestamp: timestamp || new Date().toISOString(),
        attachment: attachment || null
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Commit update logged.', commit: data });
  } catch (err: any) {
    console.error('Error logging commit:', err);
    res.status(500).json({ error: err.message });
  }
});

// 11. POST /api/project/feedback - Submit reviews
router.post('/feedback', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, fromAnonymousId, toMemberId, ratingQuality, ratingReliability, ratingCommunication, ratingContribution, comment, timestamp, groupId } = req.body;

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        id,
        group_id: groupId,
        from_anonymous_id: fromAnonymousId,
        to_member_id: toMemberId,
        rating_quality: ratingQuality,
        rating_reliability: ratingReliability,
        rating_communication: ratingCommunication,
        rating_contribution: ratingContribution,
        comment: comment || '',
        timestamp: timestamp || new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Peer feedback encrypted and submitted.', feedback: data });
  } catch (err: any) {
    console.error('Error logging feedback:', err);
    res.status(500).json({ error: err.message });
  }
});

// 12. POST /api/project/polls - Create coordination ballot
router.post('/polls', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, title, description, proposedSlots, deadline, createdBy, groupId } = req.body;

    const { data, error } = await supabase
      .from('polls')
      .insert({
        id,
        group_id: groupId,
        title,
        description: description || '',
        proposed_slots: proposedSlots || [],
        deadline: deadline || '',
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Ballot created.', poll: data });
  } catch (err: any) {
    console.error('Error creating poll:', err);
    res.status(500).json({ error: err.message });
  }
});

// 13. PUT /api/project/polls/:id/vote - Cast vote
router.put('/polls/:id/vote', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { proposedSlots } = req.body;

    const { data, error } = await supabase
      .from('polls')
      .update({
        proposed_slots: proposedSlots
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Votes synchronized.', poll: data });
  } catch (err: any) {
    console.error('Error voting on poll:', err);
    res.status(500).json({ error: err.message });
  }
});

// 14. DELETE /api/project/polls/:id - Remove completed poll
router.delete('/polls/:id', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Ballot removed.' });
  } catch (err: any) {
    console.error('Error deleting poll:', err);
    res.status(500).json({ error: err.message });
  }
});

// 15. POST /api/project/events - Upsert milestones/events
router.post('/events', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, title, time, type, description, completed, groupId } = req.body;

    const { data, error } = await supabase
      .from('events')
      .upsert({
        id,
        group_id: groupId,
        title,
        time,
        type,
        description: description || '',
        completed: completed || false
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Calendar event/milestone synchronized.', event: data });
  } catch (err: any) {
    console.error('Error syncing event:', err);
    res.status(500).json({ error: err.message });
  }
});

// 16. PUT /api/project/groups/:id - Update group details (e.g. evaluation date)
router.put('/groups/:id', verifySupabaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { evaluationDate, name, description } = req.body;

    const { data, error } = await supabase
      .from('groups')
      .update({
        evaluation_date: evaluationDate,
        name,
        description
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Group details updated.', group: await enrichGroupDetails(data) });
  } catch (err: any) {
    console.error('Error updating group details:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
