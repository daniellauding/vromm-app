# Supabase Migrations

This directory contains database migrations for the Vromm app.

## Running the Migrations

To apply the latest migrations:

1. Run from project root:
   ```
   supabase migrations up
   ```

2. After applying migrations, regenerate the TypeScript types:
   ```
   supabase gen types typescript --local > src/lib/database.types.ts
   ```

3. If using a remote Supabase instance, substitute `--local` with the appropriate URL for your Supabase project.

## Recent Changes

### 2024-06-10: Added Profile Onboarding Fields

Added `onboarding_completed` and `license_plan_completed` boolean fields to the `profiles` table to track onboarding progress.

After applying this migration, you need to update the Profile type in your code to include these new fields:

```typescript
// Inside the user profile interface:
onboarding_completed: boolean;
license_plan_completed: boolean;
```

These fields support the onboarding card features in the HomeScreen. 