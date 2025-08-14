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


