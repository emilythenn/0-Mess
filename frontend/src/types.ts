/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Member {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  color: string; // Tailwind bg color class
  contributionScore: number; // calculated from feedback + commits (out of 10)
  commitsCount: number;
  matricNumber?: string;
  siswaMail?: string;
  personalEmail?: string;
  university?: string;
  course?: string;
  currentSemester?: string;
  nationality?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: string[]; // member IDs
  dueDate: string;
  tags: string[];
  groupId?: string;
}

export interface Commit {
  id: string;
  memberId: string;
  authorName: string;
  title: string;
  description: string;
  type: 'code' | 'docs' | 'research' | 'design' | 'testing';
  linesAdded: number;
  timestamp: string;
  attachment?: {
    name: string;
    size: string;
    type: string;
  };
  groupId?: string;
}

export interface FeedbackSubmission {
  id: string;
  fromAnonymousId: string; // temp generated for tracking without exposing names
  toMemberId: string;
  ratingQuality: number; // 1-5
  ratingReliability: number; // 1-5
  ratingCommunication: number; // 1-5
  ratingContribution: number; // 1-5
  comment: string;
  timestamp: string;
  groupId?: string;
}

export interface MeetingPoll {
  id: string;
  title: string;
  description: string;
  proposedSlots: {
    id: string;
    time: string; // e.g., "Monday, 4:00 PM - 5:30 PM"
    votedMemberIds: string[];
  }[];
  deadline: string;
  createdBy: string; // memberId
  groupId?: string;
}

export interface Event {
  id: string;
  title: string;
  time: string;
  type: 'deadline' | 'meeting' | 'milestone';
  description: string;
  groupId?: string;
  completed?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'success' | 'info';
  timestamp: string;
  read: boolean;
}

export interface GroupRequest {
  userId: string;
  userName: string;
  userEmail: string;
}

export interface Group {
  id: string; // unique group id entered or generated
  name: string;
  description: string;
  password?: string;
  ownerId: string;
  memberIds: string[];
  pendingRequests: GroupRequest[];
}

