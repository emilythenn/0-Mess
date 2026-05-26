-- Enable the pgvector extension to work with vectors
create extension if not exists vector;

-- Drop tables in order of dependency to prevent foreign key errors when re-running
drop table if exists document_chunks cascade;
drop table if exists files cascade;
drop table if exists group_join_requests cascade;
drop table if exists group_members cascade;
drop table if exists tasks cascade;
drop table if exists commits cascade;
drop table if exists feedback cascade;
drop table if exists polls cascade;
drop table if exists events cascade;
drop table if exists groups cascade;
drop table if exists profiles cascade;

-- Table to store user profile details linked to auth.users
create table profiles (
  id text primary key, -- matches user's auth UID
  name text not null,
  role text,
  email text,
  avatar text,
  color text, -- Tailwind color class
  matric_number text,
  siswa_mail text,
  personal_email text,
  university text,
  course text,
  current_semester text,
  nationality text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table to store uploaded files info
create table files (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  size text,
  mime_type text,
  url text,
  description text,
  user_id text not null, -- Firebase UID
  group_id text not null, -- Project group ID (e.g. CS402-G4)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

-- Table to store the document chunks with embeddings
create table document_chunks (
  id uuid default gen_random_uuid() primary key,
  file_id uuid references files(id) on delete cascade,
  user_id text not null, -- Firebase UID
  group_id text not null, -- Group workspace ID
  content text not null, -- The chunk text
  embedding vector(768), -- Embedding vector (768 dimensions for text-embedding-004)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for vector similarity search (using HNSW for cosine distance)
create index on document_chunks using hnsw (embedding vector_cosine_ops);

-- Similarity search function to query chunks
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_group_id text
)
returns table (
  id uuid,
  file_id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    document_chunks.id,
    document_chunks.file_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    and document_chunks.group_id = filter_group_id
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Table to store group workspaces
create table groups (
  id text primary key, -- slug code e.g. CS402-G4
  name text not null,
  description text,
  password text,
  owner_id text references profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table to map members to groups
create table group_members (
  group_id text references groups(id) on delete cascade,
  user_id text references profiles(id) on delete cascade,
  primary key (group_id, user_id)
);

-- Table for pending group join requests
create table group_join_requests (
  group_id text references groups(id) on delete cascade,
  user_id text references profiles(id) on delete cascade,
  user_name text not null,
  user_email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (group_id, user_id)
);

-- Table for Kanban tasks
create table tasks (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'NOT_STARTED', -- 'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'
  priority text not null default 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  assignees text[] default '{}', -- array of profile IDs
  due_date text,
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table for git commits / progress updates logs
create table commits (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  member_id text references profiles(id) on delete cascade,
  author_name text not null,
  title text not null,
  description text,
  type text not null, -- 'code', 'docs', 'research', 'design', 'testing'
  lines_added integer default 0,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  attachment jsonb -- {name, size, type}
);

-- Table for peer feedback submission entries
create table feedback (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  from_anonymous_id text not null,
  to_member_id text references profiles(id) on delete cascade,
  rating_quality integer not null,
  rating_reliability integer not null,
  rating_communication integer not null,
  rating_contribution integer not null,
  comment text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table for meeting poll availability coordination
create table polls (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  title text not null,
  description text,
  proposed_slots jsonb default '[]'::jsonb, -- array of {id, time, votedMemberIds[]}
  deadline text,
  created_by text references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table for calendar events & milestones
create table events (
  id text primary key,
  group_id text references groups(id) on delete cascade,
  title text not null,
  time text not null,
  type text not null, -- 'deadline', 'meeting', 'milestone'
  description text,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
