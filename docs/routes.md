## Routes

### Lifecycle
- Create → Draft → Publish (Public) or keep Private
- Edit: name, description, waypoints, media, difficulty, tags
- Save as Draft preserves progress

### Visibility
- Public: visible to all
- Private: visible only to owner; deleted on account deletion
- Draft: owner only; deleted on account deletion

### Ownership transfer on deletion
- If user chooses to keep public contributions, reassign to a “Deleted user” actor and scrub author fields

### Media
- Stored in Supabase Storage (bucket per content type)
- Remove user-owned media on deletion 