## Web Handover Guide: Mobile-Parity Features with Supabase

This guide outlines how to bring a React web app to parity with the mobile app’s invitation, notification, events, routes/exercises (including quizzes), and community feed features using the same Supabase backend. No changes are required in this document; it serves as a blueprint for implementation.

### Prerequisites
- React web app with React Router
- Supabase JS SDK v2 configured with the same project as mobile
- Optional (phase 2): Service worker for Web Push

### Environment
- Configure Supabase client via environment variables (URL, anon key) consistent with mobile.
- Ensure your Supabase schema and RLS policies match mobile (see Security and RLS).

## Data Model Alignment (reuse from mobile)
- `public.pending_invitations`: Invitations (status, email, role, invited_by, metadata)
- `public.notifications`: In-app notifications (type, message, data, metadata, actor_id)
- `public.student_supervisor_relationships`: Student ↔ Supervisor links
- `public.profiles`: Basic user profile data (`email`, `full_name`, `role`, etc.)
- `public.events`, `public.event_attendees`: Events + invitations/attendance
- `public.routes` and related tables: driven/saved/reviews/media
- Exercises/Quizzes: see `fix_route_exercise_tables.sql` / `fix_route_exercise_tables_v2.sql`

Use `scripts/debug-invitations.sql` to verify invitations and notifications.

## Core Services to Implement (Web)
Mirror mobile service methods for consistent usage across platforms.

### Notifications Service
- Methods: `getNotifications`, `markAsRead`, `markAllAsRead`, `getUnreadCount`
- Realtime subscription to `notifications` inserts
- Navigation mapping (React Router): RouteDetail, EventDetail, PublicProfile

### Invitations Service
- Methods:
  - `inviteNewUser({ email, role, supervisorId, relationshipType, metadata })`
  - `getPendingInvitations(invitedByUserId)`
  - `getIncomingInvitations(email)`
  - `acceptInvitationById(invitationId, userId)`
  - `rejectInvitation(invitationId)`
  - `removeSupervisorRelationship(studentId, supervisorId)`
  - `getStudentSupervisors(studentId)` (two-step fetch: relationships then `profiles`)

### Events Service
- Create/update/delete events
- Visibility: public, private, invite-only
- Invite users (create `event_attendees` rows + in-app notifications)
- Attach routes/exercises to events
- Accept/Reject invites by updating `event_attendees.status`

### Routes/Exercises Service
- Fetch route detail (+ media, suggested exercises)
- Save/Unsave; mark as driven; leave reviews
- Quiz flow: attempts, per-question attempts, score, pass/fail

### Optional Push/Email (Phase 2)
- Email invites via Edge Function (like mobile `send-invitation`)
- Web Push via service worker (`user_web_push_tokens` table if needed)

## UX Parity: Pages and Components

### Notifications Page
- List notifications + unread badge
- Press handling:
  - Route-related → `/routes/:routeId`
  - Event-related → `/events/:eventId`
  - Follower/inviter → `/users/:userId`
  - Fallback → `/notifications`
- Accept/Decline:
  - Relationship invites → call `acceptInvitationById` / `rejectInvitation`
  - Event invites → update `event_attendees.status`

### Relationship Management
- Settings pages:
  - Students (for instructors/admin/school)
  - Supervisors (for students)
- Modals:
  - Student “Add supervisor”: search by name/email; disable button with “Invitation pending”; “Pending” tab shows Sent/Received
  - Instructor “Select student”: show “Incoming invitations” section; Accept auto-selects row
- Public profile cards: “Invite as Student” / “Invite as Supervisor” actions
- New user invitations: allow entering email (creates `pending_invitations` and in-app notification when profile exists)

### Events
- Pages: Events List, Event Detail, Create/Edit Event
- Visibility: public, private, invite-only
- Invites: in-app notification + pending status; Accept/Decline via Notifications or EventDetail
- Attach routes/exercises and display in EventDetail

### Routes + Exercises (Route Detail)
- Map preview/gallery; Save/Unsave; Mark as Driven
- Reviews: create/update; notify route creator on completion
- Custom exercises: list + start flow
- Quiz: start attempt, navigate questions, persist answers, compute score

### Community Feed
- Aggregate activity (routes created/liked/completed, event activity)
- Optional realtime; polling acceptable
- Card components similar to mobile (RouteCard/EventCard analogs)

## Navigation Mapping (Web)
- Notification press routing:
  - Route: `/routes/:routeId`
  - Event: `/events/:eventId`
  - Profile: `/users/:userId`
  - Fallback: `/notifications`

## Realtime and Subscriptions
- Subscribe to `notifications` inserts for current user
- Optionally subscribe to `event_attendees` updates
- For feed, either subscribe to activity or poll server views

## Security and RLS
- Ensure RLS matches mobile patterns:
  - Notifications: `user_id = auth.uid()`
  - Invitations: invitee can read by email (or secure RPC); inviter reads own sent
  - Relationships: visible to involved users
  - Events: public visible to all; private/invite-only visible to creator + invitees/attendees
- Mirror RPC usage used by mobile (`send_push_notification` for DB insert + push; on web you may only store and rely on in-app/email initially)

## Schema/SQL Utilities
- Use `scripts/debug-invitations.sql`:
  - List latest invitations, filter by inviter/email
  - Join invitations to inviter profile
  - Manual accept and relationship backfill
- Quizzes: see `fix_route_exercise_tables.sql` / `_v2.sql`
- Notifications: `fix_notifications_data_column*.sql`

### Reference SQL Snippets

- Incoming invitations by email
```sql
SELECT *
FROM public.pending_invitations
WHERE lower(email) = lower($1)
  AND status = 'pending'
ORDER BY created_at DESC;
```

- Create relationship after acceptance
```sql
INSERT INTO public.student_supervisor_relationships (student_id, supervisor_id)
VALUES ($1 /* invitee_id */, $2 /* invited_by */)
ON CONFLICT DO NOTHING;
```

- Event invitation notification
```sql
INSERT INTO public.notifications (user_id, actor_id, type, message, data, metadata)
VALUES (
  $1 /* inviteeId */, $2 /* inviterId */, 'event_invitation',
  'You have been invited to an event',
  jsonb_build_object('event_id', $3),
  jsonb_build_object('event_id', $3)
);
```

## Component Mapping: Mobile → Web
- NotificationsScreen → NotificationsPage (list + actions)
- RelationshipManagementModal → Settings pages + modals (Students/Supervisors tabs)
- InviteUsersScreen → EventInvite pages/modals
- RouteDetailScreen → RouteDetailPage (exercises panel + quiz modal)
- Exercise components (RouteExerciseList/Viewer) → web versions with same attempt logic
- EventCard/RouteCard → Feed/List card components
- ProgressSection → Optional dashboard widget on web

## Edge Cases and Parity Notes
- Invites to non-existing emails: invitee won’t see in-app notification until signup with that email; sender sees under “Sent by you”.
- Route-related notifications without `route_id`: attempt resolution by `route_name` as fallback; otherwise open Notifications page.
- Push parity: Web push differs; phase 1 can rely on in-app and email notifications.

## Testing Checklist
- Invitations
  - Student → Supervisor invite: student sees “Invitation pending”; supervisor sees “Incoming invitations”; Accept selects row
  - Instructor → Student invite: invited user sees notification; Accept/Reject works
  - Non-existent email: appears under “Sent by you”; invitee sees in-app only after signup
- Notifications: types route correctly; Accept/Reject marks as read and updates state
- Events: create public/private/invite-only; invite users; Accept/Reject updates `event_attendees` and notifications
- Routes/Exercises: mark driven; creator notified; reviews CRUD; quiz attempts and pass/fail flow
- Community feed: recent activities visible; optional realtime toast/badges

## Milestones
1) Services + schema verification (invites, notifications, relationships)
2) Notifications page + Relationship settings
3) Events CRUD + invites + attendance
4) Route detail + exercises + quiz flow
5) Community feed
6) Optional: Web push + Email edge functions

## References (from Mobile Repo)
- Invitations: `src/services/invitationService.ts`, `src/components/RelationshipManagementModal.tsx`, `src/screens/NotificationsScreen.tsx`, `src/components/InvitationNotification.tsx`
- Notifications: `src/services/notificationService.ts`, `src/services/pushNotificationService.ts`
- Events: `src/screens/InviteUsersScreen.tsx`, invite handling in `NotificationsScreen.tsx`
- Exercises/Quizzes: `fix_route_exercise_tables*.sql`, `RouteExerciseList`, `RouteExerciseViewer`, `ExerciseDetailModal`
- Debug SQL: `scripts/debug-invitations.sql`


