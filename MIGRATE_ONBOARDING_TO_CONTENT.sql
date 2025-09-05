-- Migration Script: Convert onboarding_slides to promotion content
-- This script migrates existing onboarding slides to promotion content type
-- Run this in your Supabase SQL editor

-- First, migrate existing onboarding_slides to content table as promotion type
INSERT INTO "public"."content" (
  "id", 
  "key", 
  "content_type", 
  "platforms", 
  "title", 
  "body", 
  "image_url", 
  "icon", 
  "icon_color", 
  "order_index", 
  "active", 
  "created_at", 
  "updated_at", 
  "images", 
  "has_language_images", 
  "icon_svg", 
  "embed_code", 
  "youtube_embed", 
  "iframe_embed", 
  "media_type", 
  "media_enabled", 
  "target", 
  "category_id", 
  "category"
)
SELECT 
  id,
  'promotion.' || extract(epoch from now())::bigint || '.' || "order"::text AS key,
  'promotion' AS content_type,
  ARRAY['mobile'] AS platforms,
  jsonb_build_object('en', title_en, 'sv', title_sv) AS title,
  jsonb_build_object('en', text_en, 'sv', text_sv) AS body,
  image_url,
  icon,
  icon_color,
  "order" AS order_index,
  active,
  created_at,
  updated_at,
  '{}'::jsonb AS images,
  false AS has_language_images,
  null AS icon_svg,
  null AS embed_code,
  null AS youtube_embed,
  null AS iframe_embed,
  'image' AS media_type,
  true AS media_enabled,
  null AS target,
  null AS category_id,
  null AS category
FROM "public"."onboarding_slides"
WHERE active = true
ON CONFLICT (id) DO UPDATE SET
  key = EXCLUDED.key,
  content_type = EXCLUDED.content_type,
  platforms = EXCLUDED.platforms,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  image_url = EXCLUDED.image_url,
  icon = EXCLUDED.icon,
  icon_color = EXCLUDED.icon_color,
  order_index = EXCLUDED.order_index,
  active = EXCLUDED.active,
  updated_at = EXCLUDED.updated_at;

-- Verify the migration
SELECT 
  id,
  key,
  content_type,
  platforms,
  title,
  body,
  icon,
  icon_color,
  order_index,
  active
FROM "public"."content" 
WHERE content_type = 'promotion' 
ORDER BY order_index;

-- Show final result
SELECT 
  'Migration completed!' as status,
  COUNT(*) as total_promotion_items
FROM "public"."content" 
WHERE content_type = 'promotion';
