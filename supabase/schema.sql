-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Public Profiles)
create table public.users (
  id uuid references auth.users not null primary key,
  email text unique not null,
  name text,
  role text check (role in ('instructor', 'student')) default 'student',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.users enable row level security;

-- Policies for Users
create policy "Public profiles are viewable by everyone." on users
  for select using (true);

create policy "Users can update their own profile." on users
  for update using (auth.uid() = id);

-- 2. Weeks Table
create table public.weeks (
  id uuid default uuid_generate_v4() primary key,
  week_number integer not null unique,
  title text not null,
  description text,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.weeks enable row level security;

-- Policies for Weeks
create policy "Weeks are viewable by everyone." on weeks
  for select using (true);
create policy "Only instructors can insert/update weeks." on weeks
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'instructor')
  );

-- 3. Materials Table (Lectures)
create table public.materials (
  id uuid default uuid_generate_v4() primary key,
  week_id uuid references public.weeks(id) on delete cascade not null,
  title text not null,
  type text check (type in ('pdf', 'link', 'video', 'text')) not null,
  content_url text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.materials enable row level security;

create policy "Materials are viewable by everyone." on materials
  for select using (true);
create policy "Only instructors can manage materials." on materials
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'instructor')
  );

-- 4. Assignments Table
create table public.assignments (
  id uuid default uuid_generate_v4() primary key,
  week_id uuid references public.weeks(id) on delete cascade not null,
  title text not null,
  prompt text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.assignments enable row level security;

create policy "Assignments are viewable by everyone." on assignments
  for select using (true);
create policy "Only instructors can manage assignments." on assignments
  for all using (
    exists (select 1 from users where id = auth.uid() and role = 'instructor')
  );

-- 5. Submissions (Student Records)
create table public.submissions (
  id uuid default uuid_generate_v4() primary key,
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  student_id uuid references public.users(id) not null,
  content text,
  attachments text[], -- Array of URLs
  status text check (status in ('draft', 'submitted')) default 'draft',
  feedback text, -- Instructor feedback
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.submissions enable row level security;

-- Policies for Submissions
create policy "Students can view their own submissions." on submissions
  for select using (auth.uid() = student_id);

create policy "Instructors can view all submissions." on submissions
  for select using (
    exists (select 1 from users where id = auth.uid() and role = 'instructor')
  );

create policy "Students can insert/update their own submissions." on submissions
  for all using (auth.uid() = student_id);

create policy "Instructors can update feedback." on submissions
  for update using (
    exists (select 1 from users where id = auth.uid() and role = 'instructor')
  );

-- Trigger to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
