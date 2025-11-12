-- ============================================
-- DELETE MULTIPLE TEST USERS AT ONCE
-- Routes, stats, reports, and completions will be PRESERVED!
-- ============================================

DO $$
DECLARE
  user_ids UUID[] := ARRAY[
    '28deeb95-e689-4d16-8c36-6f6c6dd0fb7b',
    '31222ffa-93d9-42f2-824b-7e653a0f8f23',
    '329b6731-9641-46f4-b99a-5eba71e18fb2',
    '32fe983b-21e5-4034-9d6f-bba74e8b9e63',
    '33cf3e27-cb6f-4cba-a1c8-06415e3e5035',
    '33e36544-39ea-4444-838c-618837ad26d2',
    '34a91227-f3b8-4741-a237-f6b5e17f84b5',
    '384799e2-82db-4e18-acca-0bf56cb811c7',
    '435eec12-d6c3-4a1f-97fb-d13656b4fa5d',
    '442f3fe2-cbf1-4764-ad37-7ca468c2a506',
    '443c61a0-b821-4215-8977-fa4526512465',
    '44e0e6f4-9e06-4773-9adf-bf58a169b8f5',
    '4f949ac2-ee86-498b-8bb7-f093d3849793',
    '4fbe5b29-b340-4070-ad56-e16f18c04c7f',
    '52608ae3-fb34-4e03-b6b3-1497931d47e7',
    '5290c8df-098c-4eca-8b65-7f0220b8395f',
    '59dad9cf-ffb8-4eba-8625-2f371a50baac',
    '5af23c13-53e4-488c-b8e4-ab2126e7ac72',
    '5fa123ad-4717-40b6-8961-e397a8e1d33e',
    '61760ea0-29b8-4270-ac3e-2113b2f6461e',
    '6b20e838-8779-4f6e-88cd-aa2ff0c563aa',
    '6b26a608-e7b6-4efd-927d-5358930b914c',
    '6dad7ef9-d641-4420-989e-d5f0abfb858d',
    '6fc90fa9-4143-4b74-9e64-6b24216c1098',
    '7d5dbe31-bb22-494b-bfe9-b94b9f2537b3',
    '7e1f7edf-4936-4c12-8bef-2d5d9933bd4e',
    '8141d3d4-a666-4f87-a95c-f8f11ab7a4d6',
    '8af4b83d-b949-49ec-9e9a-7a11f4750c64',
    '8db077c3-1c20-4cc6-86f9-351a6c3aa9cf',
    '8f527571-87f5-4d59-9f7f-a62d8ebfa02e',
    '90311cc2-0451-44f4-a5ed-a54d484603fe',
    '907b2af1-6550-4bef-bf83-95f414e22503',
    '918032fd-c72c-479b-b75d-b72d3593d80e',
    '9642367a-3bdc-40ca-a105-b3eb10fee2e8',
    'a305e207-8ee6-4460-b2ff-f970588e821a',
    'a94f755d-288c-49f9-b92b-d092a93ea8b1',
    'aaaee4be-1ed7-4f25-a815-7b09bf3c5bd8',
    'ab62a486-76f6-4d9a-bf5e-ac9c970fc59a',
    'acaaeaa1-bff0-482b-892e-ffca233a8505',
    'b1ac4317-0193-476c-9e88-17791665a6f6',
    'b3090ad5-e8ce-4d39-ab04-b47393b58067',
    'b36d23c7-3c06-4a5b-b879-91ab55fc1bb1',
    'b3c75734-3fd8-48d0-bb46-18d34090774b',
    'b6e5c34b-1f1a-4cb5-8990-ada27af7af2a',
    'bc988401-6aa4-4c7e-a3f3-7eed134e0e2e',
    'c9d6b566-3068-49bd-8d49-79ab2592bbaa',
    'cbab992f-1082-45d1-b8d3-dd5e3d2362cf',
    'd86e51a4-96a4-47a0-ace3-c6faf700d36d',
    'df2706d0-feda-4463-a6a6-28b0ba25c715',
    'e5e9f066-1a6a-4390-976a-72016f483908'
  ];
  user_id UUID;
  result json;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting batch deletion of % users...', array_length(user_ids, 1);
  RAISE NOTICE '';
  
  FOREACH user_id IN ARRAY user_ids LOOP
    result := safe_delete_user(user_id);
    
    IF (result->>'success')::boolean THEN
      success_count := success_count + 1;
      RAISE NOTICE '✅ Deleted: % (email: %)', user_id, result->>'email';
    ELSE
      error_count := error_count + 1;
      RAISE NOTICE '❌ Failed: % (error: %)', user_id, result->>'error';
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BATCH DELETION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Successfully deleted: %', success_count;
  RAISE NOTICE 'Failed: %', error_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 ALL ROUTES, STATS, AND REPORTS PRESERVED!';
  RAISE NOTICE '========================================';
END $$;

