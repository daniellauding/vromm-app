### Web Handover: Events and Community Feed (Supabase)

This document explains how the following mobile components work and how to implement equivalent UX on the web with Supabase:

- `src/screens/EventsScreen.tsx`
- `src/components/EventsBell.tsx`
- `src/screens/HomeScreen/CommunityFeed.tsx`
- `src/screens/CommunityFeedScreen.tsx`

---

### 1) Data model (tables and columns used)

- `profiles`
  - `id`, `full_name`, `avatar_url`
- `events`
  - `id`, `title`, `description`, `location` (JSON string), `visibility` ('public' | 'private' | 'invite-only'), `event_date`, `created_by`, `created_at`, `media` (JSON array)
- `event_attendees`
  - `id`, `event_id`, `user_id`, `status` ('invited' | 'pending' | 'accepted' | 'rejected'), `invited_at`, `responded_at`
- `routes`
  - `id`, `name`, `description`, `visibility`, `created_at`, `creator_id`, `drawing_mode`, `metadata` (JSON: `{ waypoints, coordinates, ... }`), `media_attachments` (JSON array)
- `virtual_repeat_completions`
  - `id`, `user_id`, `completed_at`, relations to `learning_path_exercises`
- `learning_path_exercises`
  - `id`, `title`, `description`, `icon`, `image`
- `user_follows`
  - `follower_id`, `following_id`

Notes:
- Relations use PostgREST embedding, e.g. `creator:profiles!events_created_by_fkey(...)`.
- In mobile, invitations are read with `status = 'pending'`, but the bell uses `status = 'invited'`. Unify this on web (recommended: use `'pending'`).

---

### 2) EventsScreen responsibilities (mobile)

- Shows two tabs: All Events (public) and Invitations (for current user).
- Loads events via `db.events.getAll()` (select public events with creator relation and attendee counts).
- Loads invitations via `event_attendees` join with `events` and `profiles` where `user_id = currentUser` and `status = 'pending'`.
- Accept / Reject invitation updates `event_attendees.status` and refreshes lists.
- Pull-to-refresh and refetch on screen focus.
- Navigates to `CreateEvent` and `EventDetail`.

Web equivalence:
- Replace navigation with your router (e.g., Next.js/React Router).
- Replace pull-to-refresh with a manual refresh button or auto refetch.
- Use a tabs component to switch between All and Invitations.

Core queries (web):
```ts
// public events
const { data: events, error } = await supabase
  .from('events')
  .select(`
    *,
    creator:profiles!events_created_by_fkey(id, full_name, avatar_url)
  `)
  .eq('visibility', 'public')
  .order('event_date', { ascending: true });

// invitations for current user (recommended unify to status = 'pending')
const userId = (await supabase.auth.getUser()).data.user?.id;
const { data: invitations, error: invErr } = await supabase
  .from('event_attendees')
  .select(`
    event_id,
    status,
    events!inner(
      id, title, description, location, visibility, event_date, created_by, created_at, media,
      creator:profiles!events_created_by_fkey(id, full_name, avatar_url)
    )
  `)
  .eq('user_id', userId)
  .eq('status', 'pending');

// accept / reject
await supabase.from('event_attendees')
  .update({ status: 'accepted', responded_at: new Date().toISOString() })
  .eq('event_id', eventId)
  .eq('user_id', userId);
```

Indexes suggested:
- `events(created_at)`, `events(event_date)`
- `event_attendees(user_id, status)`, `event_attendees(event_id)`

RLS considerations:
- `events`: allow public read for `visibility = 'public'`.
- `event_attendees`: allow user read for own rows, and update for own `user_id`.

---

### 3) EventsBell responsibilities (mobile)

- Shows a calendar icon with a numeric badge for pending invitations.
- Subscribes to realtime changes on `event_attendees` and refetches count when any change occurs.

Important discrepancy:
- Mobile bell filters with `status = 'invited'` but `EventsScreen` uses `status = 'pending'`.
- Decide on a single status value for “needs response” (recommended: `'pending'`).

Web equivalence:
- Render a badge when count > 0.
- Use Supabase Realtime to subscribe to `event_attendees` changes.

Core snippet (web):
```ts
// initial count
const userId = (await supabase.auth.getUser()).data.user?.id;
const { data, error } = await supabase
  .from('event_attendees')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('status', 'pending');
const count = data?.length ?? 0; // or use count from head query

// realtime
const channel = supabase
  .channel('event-invitations')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees' }, () => {
    // refetch count
  })
  .subscribe();

// cleanup
supabase.removeChannel(channel);
```

---

### 4) CommunityFeed (home section) responsibilities (mobile)

- Loads recent public routes, events, and exercise completions.
- Builds a unified `ActivityItem[]` and sorts by `created_at`.
- Displays preview media:
  - For routes/events with waypoints: a non-interactive map snapshot.
  - Otherwise image/video snippets.
- Limits to ~6 items on the home screen.

Core queries (mobile → web):
```ts
// routes
const { data: routes } = await supabase
  .from('routes')
  .select(`
    *,
    creator:profiles!routes_creator_id_fkey(id, full_name, avatar_url)
  `)
  .neq('visibility', 'private')
  .order('created_at', { ascending: false })
  .limit(10);

// events
const { data: events } = await supabase
  .from('events')
  .select(`
    *,
    creator:profiles!events_created_by_fkey(id, full_name, avatar_url)
  `)
  .neq('visibility', 'private')
  .order('created_at', { ascending: false })
  .limit(10);

// exercise completions
const { data: completions } = await supabase
  .from('virtual_repeat_completions')
  .select(`
    *,
    user:profiles!virtual_repeat_completions_user_id_fkey(id, full_name, avatar_url),
    learning_path_exercises(id, title, description, icon, image)
  `)
  .order('completed_at', { ascending: false })
  .limit(15);
```

Web-specific notes:
- Map preview: use a web map (e.g., Mapbox GL JS, Leaflet) or a static map rendering; disable interactions for cards.
- Carousel: use a web carousel (e.g., Swiper) for multiple media items.
- Image fallback: keep a “broken image” fallback component.
- Date formatting: reuse `date-fns`.

Perf & UX:
- Consider pagination (infinite scroll) for the full list screen.
- Debounce/serialize sequential queries; avoid blocking UI.
- Cache feed items client-side (SWR/React Query).

---

### 5) CommunityFeedScreen (full feed) responsibilities (mobile)

- Full feed with optional filter: All vs Following.
- Following data from `user_follows`.
- When filtering by following, queries include `in('creator_id', followingUserIds)` or `in('created_by', followingUserIds)`.

Core snippets (web):
```ts
// following users
const userId = (await supabase.auth.getUser()).data.user?.id;
const { data: following } = await supabase
  .from('user_follows')
  .select('following_id')
  .eq('follower_id', userId);
const followingUserIds = following?.map(f => f.following_id) ?? [];

const shouldFilter = followingUserIds.length > 0 && filter === 'following';

// routes query with following filter
let routesQuery = supabase
  .from('routes')
  .select(`*, creator:profiles!routes_creator_id_fkey(id, full_name, avatar_url)`) 
  .neq('visibility', 'private')
  .order('created_at', { ascending: false })
  .limit(30);
if (shouldFilter) routesQuery = routesQuery.in('creator_id', followingUserIds);

// events query with following filter
let eventsQuery = supabase
  .from('events')
  .select(`*, creator:profiles!events_created_by_fkey(id, full_name, avatar_url)`) 
  .neq('visibility', 'private')
  .order('created_at', { ascending: false })
  .limit(30);
if (shouldFilter) eventsQuery = eventsQuery.in('created_by', followingUserIds);

// completions with following filter
let completionsQuery = supabase
  .from('virtual_repeat_completions')
  .select(`
    *,
    user:profiles!virtual_repeat_completions_user_id_fkey(id, full_name, avatar_url),
    learning_path_exercises(id, title, description, icon, image)
  `)
  .order('completed_at', { ascending: false })
  .limit(50);
if (shouldFilter) completionsQuery = completionsQuery.in('user_id', followingUserIds);
```

Indexes suggested:
- `routes(created_at)`, `routes(creator_id)`
- `events(created_at)`, `events(created_by)`
- `virtual_repeat_completions(completed_at)`, `virtual_repeat_completions(user_id)`
- `user_follows(follower_id)`, `user_follows(following_id)`

RLS considerations:
- Allow `select` on public content for anon.
- Allow `select` on completions only for public or for followers if required by product (optional policy).

---

### 6) Web client setup

- Use `@supabase/supabase-js` with `localStorage` (default) for session persistence in the browser.
- Handle auth state via `onAuthStateChange` and route guards in your web router.
- Prefer SWR/React Query for data fetching and caching.
- Realtime: subscribe via `.channel(...).on('postgres_changes', ...)` and refetch as needed.

Example client:
```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

---

### 7) UX mapping (mobile → web)

- Tabs: use a web tabs component for `All / Invitations` and `All / Following`.
- Lists: `FlatList` → standard `<ul>` with virtualized list or windowed list (e.g., react-virtualized) if large.
- Buttons: replace `TouchableOpacity` with standard `<button>`.
- Map: non-interactive preview in cards; full map on details pages.
- Media: responsive images; lazy load and aspect-ratio boxes.
- Badges: replicate `EventsBell` with a navbar icon and count badge.
- Empty states and spinners: provide consistent placeholders.

---

### 8) Error handling & edge cases

- Gracefully handle `null` data and network errors; show retry.
- Invitations: normalize status values (`pending` recommended). Adjust queries/UI accordingly.
- Invalid `location` JSON in events: try/catch and skip map.
- Media URLs: validate protocols (`http`, `https`, `file`, `data`, `content`) before rendering.

---

### 9) Security & policies (RLS)

- Public reads:
  - `events`: `visibility = 'public'`
  - `routes`: `visibility != 'private'` (or specifically `'public'`)
- User-private reads:
  - `event_attendees`: `user_id = auth.uid()` for invitations
  - `user_follows`: `follower_id = auth.uid()`
- Writes:
  - Accept/Reject: user can update `event_attendees` where `user_id = auth.uid()`

Example policy idea (Postgres):
```sql
-- event_attendees select
create policy "read own invitations" on public.event_attendees
  for select using ( user_id = auth.uid() );

-- event_attendees update
create policy "respond to invitation" on public.event_attendees
  for update using ( user_id = auth.uid() );
```

---

### 10) Testing checklist (web)

- Events
  - Lists public events
  - Invitation tab shows pending invitations for logged-in user
  - Accept/Reject updates status and refreshes
- Bell
  - Shows correct count; updates on realtime changes
  - Navigates to events screen
- Community Feed (home)
  - Mixed activities load and render
  - Map/image/video previews render without crashes
- Community Feed (full screen)
  - Filters by following
  - Paginates (optional), performs well
- RLS
  - Public content visible when logged out
  - Private rows not leaked

---

### 11) Known gaps to address in web

- Status mismatch (`invited` vs `pending`): pick one and update all queries/UI.
- Map previews: choose a web map library and a static preview approach.
- Carousel: pick a well-supported carousel (e.g., Swiper) and ensure performance.

---

### 12) Quick migration plan

1. Create shared TypeScript types for activities and events.
2. Set up Supabase client in web, confirm auth.
3. Implement Events list + Invitations tab.
4. Implement EventsBell with realtime subscription.
5. Implement CommunityFeed (home): combined queries and card UI.
6. Implement CommunityFeedScreen: full feed + following filter.
7. Add error/empty/skeleton states.
8. Add tests for RLS coverage and query correctness. 