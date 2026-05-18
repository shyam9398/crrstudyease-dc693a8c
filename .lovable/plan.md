# Multi-College App Overhaul

## 1. Create College flow (simplified)
- Remove branch creation from `CreateCollege.tsx`. Fields: **Name, Logo, Location, Affiliation, Admin ID, Admin Password**.
- Add `location text` and `affiliation text` columns to `colleges`.
- Update `create-college` edge function to insert college + first super-admin into `branch_admins` with `branch_id = NULL` (college-level super admin). No branch created.
- DB: make `branch_admins.branch_id` nullable so a super admin can exist without a branch.

## 2. Admin Dashboard (Branch / Faculty / Student management)
- Admin can CRUD branches scoped to their college via a new edge function `manage-branches` (service-role, validated by `admin_token`).
- Faculty creation already exists — keep `create-faculty`, ensure branch dropdown lists only this admin's college branches.
- Add `manage-students` edge function: admin creates/edits/deletes students (`students` table). Add a `password` column to `students` (hashed via bcrypt in edge function).
- Update `AdminDashboard.tsx` with three tabs: Branches, Faculty, Students.
- Tighten `students` RLS: remove public INSERT/UPDATE; only service role writes.

## 3. Student login (admin-issued credentials only)
- Replace passwordless flow. New edge function `student-login`: validates `user_id + password + college_id`, returns a session token stored in `localStorage`.
- `StudentLogin.tsx`: College → Student ID → Password. No self-registration.
- Student session stored as `student_session` (id, user_id, college_id, branch_id, regulation_id, year_sem) used by `useStudentData`.

## 4. Faculty login (assigned only)
- `create-faculty` already assigns branch + college. Confirm faculty profile carries `branch_id` + `college_id` and gates dashboard data by these.

## 5. Navigation stack (one-step back)
- Standardize all "Back" buttons to use `navigate(-1)` but guard against landing outside the app.
- Replace `<Navigate replace />` only where it prevents back loops; remove duplicate route registrations.
- Audit: Landing → CollegesHub → (CreateCollege | CollegeLogin | StudentLogin | Explore) → role flows.

## 6. Theme (premium beige)
Update `src/index.css` tokens (HSL):
- background `#FFFDF7`, foreground `#3A3126`
- primary `#E8D8B5` on dark text, secondary `#F3E6CC`, accent `#F8EED8`
- Soft shadows, rounded-2xl cards, subtle gradients, glass cards on landing/hub.
- Dark mode kept but re-tuned around warm neutrals.

## 7. RLS & security cleanup
- `branches`: drop "Faculty can insert", add admin-only via service role (edge function).
- `students`: drop public insert/update; service role only.
- Add `branch_admins.branch_id` nullable for college super admin.

## Files

**New**
- `supabase/functions/manage-branches/index.ts`
- `supabase/functions/manage-students/index.ts`
- `supabase/functions/student-login/index.ts`
- migration: add columns, tighten RLS

**Edited**
- `src/pages/CreateCollege.tsx` (remove branch fields, add location/affiliation)
- `src/pages/AdminDashboard.tsx` (Branches/Faculty/Students tabs)
- `src/pages/StudentLogin.tsx` (password-based)
- `src/pages/CollegeLogin.tsx` (back nav cleanup)
- `src/pages/CollegesHub.tsx`, `src/pages/Landing.tsx` (back nav, theme)
- `src/index.css` (beige theme)
- `supabase/functions/create-college/index.ts` (no branch creation)
- `src/App.tsx` (remove redundant redirects breaking back stack)

## Out of scope
- No changes to subject/unit/module/resource flows beyond what theming touches.
- Existing default college data preserved.
