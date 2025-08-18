-- Clean up duplicate event notifications
-- This will fix the persistent event invitation notifications

-- 1. Show current event notifications
SELECT 'CURRENT EVENT NOTIFICATIONS:' as status;
SELECT 
  n.id,
  n.user_id,
  n.actor_id,
  n.type,
  n.created_at,
  n.metadata->>'event_id' as event_id,
  n.metadata->>'event_title' as event_title,
  ea.status as attendee_status
FROM notifications n
LEFT JOIN event_attendees ea ON (n.metadata->>'event_id')::uuid = ea.event_id 
  AND n.user_id = ea.user_id
WHERE n.type IN ('event_invitation', 'event_invite')
ORDER BY n.created_at DESC;

-- 2. Clean up notifications where user has already responded
DELETE FROM notifications 
WHERE type IN ('event_invitation', 'event_invite')
  AND EXISTS (
    SELECT 1 FROM event_attendees ea 
    WHERE (metadata->>'event_id')::uuid = ea.event_id 
      AND user_id = ea.user_id 
      AND ea.status IN ('accepted', 'rejected')
  );

-- 3. Clean up duplicate notifications for the same event (keep only the latest)
DELETE FROM notifications 
WHERE type IN ('event_invitation', 'event_invite')
  AND id NOT IN (
    SELECT DISTINCT ON (user_id, metadata->>'event_id') id
    FROM notifications
    WHERE type IN ('event_invitation', 'event_invite')
    ORDER BY user_id, metadata->>'event_id', created_at DESC
  );

-- 4. Show results after cleanup
SELECT 'AFTER CLEANUP - Remaining Event Notifications:' as status;
SELECT 
  n.id,
  n.user_id,
  n.actor_id,
  n.type,
  n.created_at,
  n.metadata->>'event_id' as event_id,
  n.metadata->>'event_title' as event_title,
  ea.status as attendee_status
FROM notifications n
LEFT JOIN event_attendees ea ON (n.metadata->>'event_id')::uuid = ea.event_id 
  AND n.user_id = ea.user_id
WHERE n.type IN ('event_invitation', 'event_invite')
ORDER BY n.created_at DESC;

SELECT 'Event notification cleanup completed!' as status;
