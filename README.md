# 📚 AssignHub

## Quick Start (5 min)

1. `npm install`
2. Create `.env.local`:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```
3. Run `supabase/schema.sql` in Supabase SQL Editor
4. `npm run dev` → http://localhost:5173

## First Login
- Register admin@test.com
- In Supabase Table Editor → profiles → set role='admin', status='approved'
- Login as admin → approve other users

## Features
- Admin: User approval, course management, performance reports
- Teacher: Create assignments, view/download/grade submissions, star ratings
- Student: Enroll courses, upload work, re-submit, rate teachers
- Dark mode, responsive design, file storage
