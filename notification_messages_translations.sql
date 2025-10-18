-- Notification message templates for mobile platform
-- These are the actual notification messages that appear in the notifications list
-- Run this SQL in Supabase SQL Editor

INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at") VALUES 
-- Route notifications
(gen_random_uuid(), 'notification.route.saved', 'en', 'saved your route "{route_name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.route.saved', 'sv', 'sparade din rutt "{route_name}"', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.route.driven', 'en', 'drove your route "{route_name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.route.driven', 'sv', 'körde din rutt "{route_name}"', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.route.reviewed', 'en', 'reviewed your route "{route_name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.route.reviewed', 'sv', 'recenserade din rutt "{route_name}"', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.route.liked', 'en', 'liked your route "{route_name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.route.liked', 'sv', 'gillade din rutt "{route_name}"', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.route.created', 'en', 'created a new route "{route_name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.route.created', 'sv', 'skapade en ny rutt "{route_name}"', 'mobile', NOW(), NOW()),

-- Follower notifications
(gen_random_uuid(), 'notification.follower.new', 'en', 'started following you', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.follower.new', 'sv', 'började följa dig', 'mobile', NOW(), NOW()),

-- Message notifications
(gen_random_uuid(), 'notification.message.new', 'en', 'sent you a message', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.message.new', 'sv', 'skickade ett meddelande till dig', 'mobile', NOW(), NOW()),

-- Invitation notifications
(gen_random_uuid(), 'notification.invitation.supervisor', 'en', 'invited you to be their supervisor', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.invitation.supervisor', 'sv', 'bjöd in dig att vara deras handledare', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.invitation.student', 'en', 'invited you to be their student', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.invitation.student', 'sv', 'bjöd in dig att vara deras elev', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.invitation.accepted', 'en', 'accepted your invitation', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.invitation.accepted', 'sv', 'accepterade din inbjudan', 'mobile', NOW(), NOW()),

-- Collection notifications
(gen_random_uuid(), 'notification.collection.invited', 'en', 'invited you to collection "{collection_name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.collection.invited', 'sv', 'bjöd in dig till samlingen "{collection_name}"', 'mobile', NOW(), NOW()),

-- Event notifications
(gen_random_uuid(), 'notification.event.invited', 'en', 'invited you to event "{event_name}"', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.event.invited', 'sv', 'bjöd in dig till eventet "{event_name}"', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.event.reminder', 'en', 'Reminder: Event "{event_name}" starts soon', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.event.reminder', 'sv', 'Påminnelse: Eventet "{event_name}" börjar snart', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.event.updated', 'en', 'Event "{event_name}" has been updated', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.event.updated', 'sv', 'Eventet "{event_name}" har uppdaterats', 'mobile', NOW(), NOW()),

-- Exercise/Learning notifications
(gen_random_uuid(), 'notification.exercise.completed', 'en', 'You completed an exercise!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.exercise.completed', 'sv', 'Du slutförde en övning!', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.learningPath.completed', 'en', 'You completed a learning path!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.learningPath.completed', 'sv', 'Du slutförde en lärbana!', 'mobile', NOW(), NOW()),

(gen_random_uuid(), 'notification.quiz.completed', 'en', 'You completed a quiz!', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.quiz.completed', 'sv', 'Du slutförde ett quiz!', 'mobile', NOW(), NOW()),

-- Comment notifications
(gen_random_uuid(), 'notification.comment.new', 'en', 'commented on your route', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.comment.new', 'sv', 'kommenterade din rutt', 'mobile', NOW(), NOW()),

-- Relationship review notifications
(gen_random_uuid(), 'notification.review.relationship', 'en', 'left a review for you', 'mobile', NOW(), NOW()),
(gen_random_uuid(), 'notification.review.relationship', 'sv', 'lämnade en recension om dig', 'mobile', NOW(), NOW());

