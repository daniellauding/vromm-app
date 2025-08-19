-- Debug helpers for invitations and notifications
-- Usage: Open in Supabase SQL editor or run via CLI (supabase db query < file)

-- 1) Latest 30 pending_invitations
SELECT id, email, role, invited_by, status, created_at, accepted_at, accepted_by
FROM public.pending_invitations
ORDER BY created_at DESC
LIMIT 30;

-- 2) Invitations sent by a specific user
-- Replace with your inviter/supervisor ID
-- SELECT * FROM public.pending_invitations WHERE invited_by = 'YOUR_USER_ID' ORDER BY created_at DESC;

-- 3) Invitations received by a specific email
-- Replace with your target email
-- SELECT * FROM public.pending_invitations WHERE lower(email) = lower('target@example.com') ORDER BY created_at DESC;

-- 4) Notifications for a specific user (invitee)
-- Replace with the invitee user ID
-- SELECT id, user_id, actor_id, type, message, metadata, data, is_read, created_at
-- FROM public.notifications
-- WHERE user_id = 'INVITEE_USER_ID'
-- ORDER BY created_at DESC
-- LIMIT 50;

-- 5) Join helpers: show pending invites with inviter profile
SELECT pi.id,
       pi.email,
       pi.role,
       pi.status,
       pi.created_at,
       p.full_name AS invited_by_name,
       p.email     AS invited_by_email
FROM public.pending_invitations pi
LEFT JOIN public.profiles p ON p.id = pi.invited_by
ORDER BY pi.created_at DESC
LIMIT 30;

-- =============================
-- EXTRA: Instructor Audit & RLS Helpers (learning paths/exercises)
-- =============================

-- A) Preview completions for a given user (student)
--   Replace :student_id
--
-- SELECT lpec.*, e.title, p.full_name AS student_name
-- FROM public.learning_path_exercise_completions lpec
-- LEFT JOIN public.learning_path_exercises e ON e.id = lpec.exercise_id
-- LEFT JOIN public.profiles p ON p.id = lpec.user_id
-- WHERE lpec.user_id = :student_id
-- ORDER BY lpec.created_at DESC;

-- B) Preview virtual repeat completions for a given user (student)
--
-- SELECT vrc.*, e.title, p.full_name AS student_name
-- FROM public.virtual_repeat_completions vrc
-- LEFT JOIN public.learning_path_exercises e ON e.id = vrc.exercise_id
-- LEFT JOIN public.profiles p ON p.id = vrc.user_id
-- WHERE vrc.user_id = :student_id
-- ORDER BY vrc.completed_at DESC;

-- C) Suggested RLS policy sketch (implement in SQL migrations):
--   Allow supervisors to manage a student's completions if they have a relationship
--   and record audit metadata via triggers.
--
-- Example policy condition (sketch):
--   EXISTS (
--     SELECT 1 FROM public.student_supervisor_relationships rel
--     WHERE rel.student_id = learning_path_exercise_completions.user_id
--       AND rel.supervisor_id = auth.uid()
--   )
--
-- D) Suggested audit trigger fields (add columns if missing):
--   ALTER TABLE public.learning_path_exercise_completions
--     ADD COLUMN IF NOT EXISTS updated_by uuid,
--     ADD COLUMN IF NOT EXISTS updated_by_name text,
--     ADD COLUMN IF NOT EXISTS updated_at timestamptz;
--
--   ALTER TABLE public.virtual_repeat_completions
--     ADD COLUMN IF NOT EXISTS updated_by uuid,
--     ADD COLUMN IF NOT EXISTS updated_by_name text,
--     ADD COLUMN IF NOT EXISTS updated_at timestamptz;
--
--   Create trigger to populate updated_* columns on insert/update with auth.uid() and now().

-- 6) Mark one invite accepted and create relationship (manual backfill)
-- UPDATE public.pending_invitations
-- SET status='accepted', accepted_at=now(), accepted_by='INVITEE_USER_ID'
-- WHERE id='INVITE_ID';

-- INSERT INTO public.student_supervisor_relationships (student_id, supervisor_id)
-- SELECT 'INVITEE_USER_ID', invited_by
-- FROM public.pending_invitations
-- WHERE id='INVITE_ID'
--   AND status='accepted'
-- ON CONFLICT DO NOTHING;


