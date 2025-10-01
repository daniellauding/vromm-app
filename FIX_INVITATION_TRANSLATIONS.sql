-- Fix invitation modal translations
-- This will insert if not exists, or update if exists (based on id)

-- invitations.newInvitations
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440300', 'invitations.newInvitations', 'en', 'New Invitations', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440312', 'invitations.newInvitations', 'sv', 'Nya inbjudningar', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.personalMessage
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('3a152ba0-7ed4-44b1-bdb0-9293f03c5c56', 'invitations.personalMessage', 'en', 'Personal message:', 'mobile', NOW(), NOW()),
  ('264e065d-fa73-46ec-adfa-a48f1e7ca920', 'invitations.personalMessage', 'sv', 'Personligt meddelande:', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.supervisorInvitation
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440301', 'invitations.supervisorInvitation', 'en', 'Supervisor Invitation', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440313', 'invitations.supervisorInvitation', 'sv', 'Handledarinbjudan', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.supervisorMessage
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440304', 'invitations.supervisorMessage', 'en', 'wants you to be their supervisor', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440316', 'invitations.supervisorMessage', 'sv', 'vill att du ska vara deras handledare', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.studentInvitation
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440302', 'invitations.studentInvitation', 'en', 'Student Invitation', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440314', 'invitations.studentInvitation', 'sv', 'Elevinbjudan', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.studentMessage  
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440305', 'invitations.studentMessage', 'en', 'wants you to be their student', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440317', 'invitations.studentMessage', 'sv', 'vill att du ska vara deras elev', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.collectionInvitation
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440303', 'invitations.collectionInvitation', 'en', 'Collection Invitation', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440315', 'invitations.collectionInvitation', 'sv', 'Samlingsinbjudan', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.collectionMessage
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440306', 'invitations.collectionMessage', 'en', 'wants to share a collection with you', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440318', 'invitations.collectionMessage', 'sv', 'vill dela en samling med dig', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.collectionName
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440308', 'invitations.collectionName', 'en', 'Collection', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440320', 'invitations.collectionName', 'sv', 'Samling', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.dismiss
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440311', 'invitations.dismiss', 'en', 'Dismiss', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440323', 'invitations.dismiss', 'sv', 'Avfärda', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.decline
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440310', 'invitations.decline', 'en', 'Decline', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440322', 'invitations.decline', 'sv', 'Avvisa', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.accept
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440309', 'invitations.accept', 'en', 'Accept', 'mobile', NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440321', 'invitations.accept', 'sv', 'Acceptera', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.dismissAll
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('dba9dde5-3bfe-47f6-922b-dd01202011ba', 'invitations.dismissAll', 'en', 'Dismiss All', 'mobile', NOW(), NOW()),
  ('adbdf802-2c5a-4bdd-9373-8b698a272d3c', 'invitations.dismissAll', 'sv', 'Avfärda alla', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.accepted
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('4358e978-1d00-40df-8b28-c879c5bbf821', 'invitations.accepted', 'en', 'Invitation Accepted', 'mobile', NOW(), NOW()),
  ('3319d039-0d21-48f1-91e8-7a3ba85f825e', 'invitations.accepted', 'sv', 'Inbjudan accepterad', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.youAreNowConnected
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('0dc4e01d-cd96-4ae8-b8b0-93ebbae00b25', 'invitations.youAreNowConnected', 'en', 'You are now connected!', 'mobile', NOW(), NOW()),
  ('d47848ab-0cc6-4901-b529-ef3678107fe3', 'invitations.youAreNowConnected', 'sv', 'Ni är nu anslutna!', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.youNowHaveAccess
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('3240cdd0-7274-4df0-a773-f404aba8cd5d', 'invitations.youNowHaveAccess', 'en', 'You now have access to this collection!', 'mobile', NOW(), NOW()),
  ('0955c279-43e1-423a-bebc-6a0b4782b6d3', 'invitations.youNowHaveAccess', 'sv', 'Du har nu tillgång till denna samling!', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.failedToAccept
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('880a629a-6413-49fc-b328-8011ffb268b2', 'invitations.failedToAccept', 'en', 'Failed to accept invitation', 'mobile', NOW(), NOW()),
  ('773c9826-e70d-4066-9234-295d0535d22f', 'invitations.failedToAccept', 'sv', 'Misslyckades att acceptera inbjudan', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.failedToDecline
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('3edb29ad-21ed-4da1-847d-7ef32c557093', 'invitations.failedToDecline', 'en', 'Failed to decline invitation', 'mobile', NOW(), NOW()),
  ('d9e4e7d7-ceb8-4a07-be75-bb38f146315b', 'invitations.failedToDecline', 'sv', 'Misslyckades att avslå inbjudan', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.loadingError
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('7ce1abb1-ea88-4df9-b604-b3d054f72631', 'invitations.loadingError', 'en', 'Error loading pending invitations', 'mobile', NOW(), NOW()),
  ('48c870d6-067a-49aa-90d0-dca144f5128b', 'invitations.loadingError', 'sv', 'Fel vid laddning av väntande inbjudningar', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.invitationDeclined (for decline success toast)
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('39f7d653-cdd3-4a90-8e0c-3ff1ca345445', 'invitations.invitationDeclined', 'en', 'Invitation declined', 'mobile', NOW(), NOW()),
  ('97d3074d-a13e-4148-8a1b-6a3783664749', 'invitations.invitationDeclined', 'sv', 'Inbjudan avvisad', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.unknownUser
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('629d9e61-352c-4642-8151-71aab189f22e', 'invitations.unknownUser', 'en', 'Unknown User', 'mobile', NOW(), NOW()),
  ('5dbcb925-e416-402a-a5ae-dce0c2d77e9f', 'invitations.unknownUser', 'sv', 'Okänd användare', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- invitations.unknownCollection
INSERT INTO "public"."translations" ("id", "key", "language", "value", "platform", "created_at", "updated_at")
VALUES 
  ('b220c385-4bc6-4c3f-b1b5-5f1697f6dbb8', 'invitations.unknownCollection', 'en', 'Unknown Collection', 'mobile', NOW(), NOW()),
  ('6202eb6d-58d7-4f1d-8096-0cf366b43dfe', 'invitations.unknownCollection', 'sv', 'Okänd samling', 'mobile', NOW(), NOW())
ON CONFLICT (id) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the updates
SELECT key, language, value, platform, updated_at 
FROM translations 
WHERE key LIKE 'invitations.%' 
ORDER BY key, language;

