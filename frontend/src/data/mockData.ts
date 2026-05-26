import { Member, Task, Commit, FeedbackSubmission, MeetingPoll, Event, Notification } from '../types';

export const CURRENT_USER: Member = {
  id: 'user_alex',
  name: 'Alex Mercer (You)',
  role: 'Full-Stack Engineer',
  email: 'alex.mercer@univ.edu',
  avatar: 'AM',
  color: 'bg-emerald-500',
  contributionScore: 9.2,
  commitsCount: 24,
};

export const MOCK_MEMBERS: Member[] = [
  CURRENT_USER,
  {
    id: 'mem_liam',
    name: 'Liam Carter',
    role: 'Team Lead & Backend Architecture',
    email: 'liam.carter@univ.edu',
    avatar: 'LC',
    color: 'bg-indigo-600',
    contributionScore: 8.9,
    commitsCount: 18,
  },
  {
    id: 'mem_sophia',
    name: 'Sophia Vance',
    role: 'Frontend Dev & UI Design',
    email: 'sophia.vance@univ.edu',
    avatar: 'SV',
    color: 'bg-fuchsia-500',
    contributionScore: 9.4,
    commitsCount: 21,
  },
  {
    id: 'mem_ethan',
    name: 'Ethan Chen',
    role: 'Database & Raft Consensus Dev',
    email: 'ethan.chen@univ.edu',
    avatar: 'EC',
    color: 'bg-orange-500',
    contributionScore: 7.6,
    commitsCount: 13,
  },
  {
    id: 'mem_mia',
    name: 'Mia Patel',
    role: 'Docs, Research & Testing Quality',
    email: 'mia.patel@univ.edu',
    avatar: 'MP',
    color: 'bg-sky-500',
    contributionScore: 8.5,
    commitsCount: 15,
  },
];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_COMMITS: Commit[] = [];
export const INITIAL_FEEDBACK: FeedbackSubmission[] = [];
export const INITIAL_POLLS: MeetingPoll[] = [];
export const INITIAL_EVENTS: Event[] = [];
export const INITIAL_NOTIFICATIONS: Notification[] = [];

