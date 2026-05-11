
## Goal

Add a new landing page in front of the current login that introduces "Colleges" as a top-level tenant. All existing data is migrated under one **Default College** so nothing breaks.

## New entry flow

```
/  (Landing)
├── College Login  ──► pick college ──► Admin / Faculty login (current flow)
├── Explore        ──► public grid of all colleges (logo + name)
└── Create College ──► register new college (name + logo + first admin)
                                                     │
                                                     └─► then they use College Login
Student Login (separate button) ──► current student User ID flow
```

## Database changes

1. New `colleges` table: `id`, `name` (unique), `logo_url`, `created_at`.
2. Add `college_id uuid` to: `branches`, `branch_admins`, `profiles` (faculty), `subjects`, `regulations`, `students`.
3. Create a **Default College**, then backfill `college_id` on all existing rows to point to it.
4. RLS: keep existing rules; add public read on `colleges` for the Explore grid.
5. New storage policy on `resources` bucket (already public) for `college-logos/` path, or add a new public `college-logos` bucket.

## UI changes

1. **`/` (new Landing)** — three big cards: *College Login*, *Explore*, *Student Login*. Keep existing branding.
2. **`/college-login`** — dropdown of colleges → on select, shows current Admin/Faculty tabs scoped to that college.
3. **`/explore`** — grid of all colleges (logo + name), read-only.
4. **`/create-college`** — form: college name, logo upload, first admin User ID + password. Creates college row, uploads logo, creates a super-admin entry in `branch_admins` (or a new `college_admins` concept—reuse `branch_admins` with `is_super_admin=true` and `college_id`).
5. **`/student-login`** — moves current student tab here unchanged.

The existing `/dashboard`, `/admin/dashboard`, `/student/*` pages keep working—they just additionally filter by the selected `college_id` stored in localStorage / context.

## Scope guardrails

- No UI redesign of existing dashboards beyond passing `college_id` through.
- Faculty/admin creation, subject creation, etc. all auto-stamp the active `college_id`.
- Existing accounts continue to log in (they're tied to Default College).

## Files to touch

- New: `supabase/migrations/<ts>_colleges.sql`, `src/pages/Landing.tsx`, `src/pages/CollegeLogin.tsx`, `src/pages/Explore.tsx`, `src/pages/CreateCollege.tsx`, `src/pages/StudentLogin.tsx`, `src/contexts/CollegeContext.tsx`.
- Edit: `src/App.tsx` (routes), `src/pages/Login.tsx` (split into college-scoped login), faculty/admin edge functions to accept `college_id`, hooks that list branches/subjects to filter by active college.

Reply **approve** to proceed, or tell me what to adjust.
