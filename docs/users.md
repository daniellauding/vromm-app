## Users & Profiles

### PII (personal data)
- Email (Supabase Auth)
- Name, avatar, bio, optional fields
- Device push tokens (Expo)

### Profile
- Stored in `profiles` (referenced by auth user id)
- Editable fields validated client-side

### Privacy controls (roadmap)
- Toggle profile visibility (public/private)
- Export data (DSR)
- Delete account (see legal.md)

### Anonymization
- When keeping public content after deletion, display name as “Deleted user” and remove avatar/email references 