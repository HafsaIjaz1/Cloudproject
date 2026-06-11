-- ASSIGNHUB DATABASE - Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null, email text not null unique,
  role text not null check (role in ('admin','teacher','student')),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  points int default 0, average_rating numeric(3,2) default 0, total_ratings int default 0,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "p_sel" on public.profiles for select using (auth.role()='authenticated');
create policy "p_ins" on public.profiles for insert with check (auth.uid()=id);
create policy "p_upd" on public.profiles for update using (auth.role()='authenticated');

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null, code text not null unique, description text,
  teacher_id uuid references public.profiles(id) on delete cascade,
  status text default 'active', created_at timestamptz default now()
);
alter table public.courses enable row level security;
create policy "c_sel" on public.courses for select using (auth.role()='authenticated');
create policy "c_ins" on public.courses for insert with check (auth.role()='authenticated');
create policy "c_upd" on public.courses for update using (auth.role()='authenticated');
create policy "c_del" on public.courses for delete using (auth.role()='authenticated');

CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(), unique(course_id,student_id)
);
alter table public.enrollments enable row level security;
create policy "e_sel" on public.enrollments for select using (auth.role()='authenticated');
create policy "e_ins" on public.enrollments for insert with check (auth.role()='authenticated' and student_id=auth.uid());

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text, deadline timestamptz,
  course_id uuid references public.courses(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete cascade,
  max_points int default 100, allow_resubmission boolean default true,
  submission_closed boolean default false,
  attachment_url text, attachment_name text,
  created_at timestamptz default now()
);
alter table public.assignments enable row level security;
create policy "a_sel" on public.assignments for select using (auth.role()='authenticated');
create policy "a_ins" on public.assignments for insert with check (auth.role()='authenticated' and teacher_id=auth.uid());
create policy "a_upd" on public.assignments for update using (auth.role()='authenticated' and teacher_id=auth.uid());
create policy "a_del" on public.assignments for delete using (auth.role()='authenticated' and teacher_id=auth.uid());

CREATE TABLE IF NOT EXISTS public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  file_path text, file_name text, status text default 'submitted',
  points_earned int default 0, feedback text,
  submitted_at timestamptz default now(), reviewed_at timestamptz,
  unique(assignment_id,student_id)
);
alter table public.submissions enable row level security;
create policy "s_sel" on public.submissions for select using (auth.role()='authenticated');
create policy "s_ins" on public.submissions for insert with check (auth.role()='authenticated' and student_id=auth.uid());
create policy "s_upd" on public.submissions for update using (auth.role()='authenticated');

CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid references public.profiles(id) on delete cascade,
  to_user_id uuid references public.profiles(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  rating int check (rating>=1 and rating<=5), comment text,
  created_at timestamptz default now(), unique(from_user_id,to_user_id,submission_id)
);
alter table public.ratings enable row level security;
create policy "r_sel" on public.ratings for select using (auth.role()='authenticated');
create policy "r_ins" on public.ratings for insert with check (auth.role()='authenticated' and from_user_id=auth.uid());

INSERT INTO storage.buckets (id,name,public) VALUES ('submissions','submissions',false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id,name,public) VALUES ('assignments','assignments',false) ON CONFLICT DO NOTHING;

DO $$ BEGIN CREATE POLICY "stor_sel" ON storage.objects FOR SELECT USING (auth.role()='authenticated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "stor_ins" ON storage.objects FOR INSERT WITH CHECK (auth.role()='authenticated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "stor_upd" ON storage.objects FOR UPDATE USING (auth.role()='authenticated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "stor_del" ON storage.objects FOR DELETE USING (auth.role()='authenticated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_student_points(p_student_id uuid, p_points_change int, p_reason text, p_submission_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN UPDATE public.profiles SET points=points+p_points_change WHERE id=p_student_id; END; $$;

CREATE OR REPLACE FUNCTION public.update_average_rating(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v numeric; BEGIN SELECT avg(rating)::numeric(3,2) INTO v FROM public.ratings WHERE to_user_id=p_user_id; UPDATE public.profiles SET average_rating=coalesce(v,0) WHERE id=p_user_id; END; $$;

SELECT 'DATABASE SETUP COMPLETE' AS status;

-- If you already ran old schema, run these to add attachment columns:
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS attachment_name text;
