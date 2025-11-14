# FeaturedCard Component Variants Documentation

## Overview

Both `LearningPath` and `IncompleteFeaturedExercises` components now support flexible variants and presets, similar to `RouteCard`. This allows you to customize the appearance and content of featured content cards without modifying the components themselves.

## Basic Usage

### Default (Current Behavior)

```tsx
// LearningPath - uses all defaults (medium size, all content visible)
<LearningPath
  path={path}
  handleFeaturedPathPress={handleFeaturedPathPress}
/>

// IncompleteFeaturedExercises - uses all defaults
<IncompleteFeaturedExercises
  exercise={exercise}
  handleFeaturedExercisePress={handleFeaturedExercisePress}
/>
```

## Props Reference

### Size Control
- **`size`**: `'large' | 'medium' | 'small' | 'xs'`
  - Controls overall card size, spacing, and font sizes
  - Default: `'medium'` (maintains current behavior)

### Preset Variants
- **`preset`**: One of the preset variants (see Presets section below)
  - Quick way to apply common configurations
  - Can be overridden with individual props

### Content Visibility
- **`showIcon`**: `boolean` (default: `true`)
  - Show/hide icon and label (Learning Path / Exercise)
  
- **`showTitle`**: `boolean` (default: `true`)
  - Show/hide title
  
- **`showDescription`**: `boolean` (default: `true`)
  - Show/hide description
  
- **`showMedia`**: `boolean` (default: `true`)
  - Show/hide image/video
  
- **`showActionButton`**: `boolean` (default: `true`)
  - Show/hide "Start Learning" / "Start Exercise" button
  
- **`showLockBadges`**: `boolean` (default: `true`)
  - Show/hide lock/paywall/quiz badges

### Truncation Control
- **`truncateTitle`**: `boolean` (default: `true`)
  - If `true`, title truncates with ellipsis when it doesn't fit
  - If `false`, title wraps to multiple lines
  
- **`truncateDescription`**: `boolean` (default: `true`)
  - If `true`, description truncates with ellipsis when it doesn't fit
  - If `false`, description wraps to multiple lines

## Preset Variants

Presets provide quick configurations for common use cases. Individual props can override preset defaults.

### Content Presets

| Preset | Size | Icon | Title | Desc | Media | Action | Badges |
|--------|------|------|-------|------|-------|--------|--------|
| `default` | medium | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `compact` | small | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| `minimal` | xs | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `media-only` | small | ❌ | ✅ | ❌ | ✅ | ❌ | ✅ |
| `text-only` | small | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `title-only` | small | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `grid` | small | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| `banner` | medium | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `tall` | medium | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| `square` | small | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| `hero` | large | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Layout Presets (with Aspect Ratios)

| Preset | Size | Aspect Ratio | Use Case |
|--------|------|--------------|----------|
| `grid` | small | 4:3 | Grid layouts (3-4 cards visible) |
| `banner` | medium | 16:9 | Wide banner format |
| `tall` | medium | 3:4 | Portrait/tall format |
| `square` | small | 1:1 | Square format |
| `hero` | large | 3:2 | Netflix-style hero card |

## Usage Examples

### Using Presets

```tsx
// Compact preset - small, title + media only
<LearningPath
  path={path}
  handleFeaturedPathPress={handleFeaturedPathPress}
  preset="compact"
/>

// Grid preset - optimized for grid layouts
<IncompleteFeaturedExercises
  exercise={exercise}
  handleFeaturedExercisePress={handleFeaturedExercisePress}
  preset="grid"
/>

// Hero preset - large, Netflix-style
<LearningPath
  path={path}
  handleFeaturedPathPress={handleFeaturedPathPress}
  preset="hero"
/>
```

### Overriding Preset Defaults

```tsx
// Use compact preset but add description
<LearningPath
  path={path}
  handleFeaturedPathPress={handleFeaturedPathPress}
  preset="compact"
  showDescription={true}  // Override: add description
/>
```

### Full Control Without Preset

```tsx
// Custom configuration
<LearningPath
  path={path}
  handleFeaturedPathPress={handleFeaturedPathPress}
  size="small"
  showIcon={true}
  showTitle={true}
  showDescription={false}
  showMedia={true}
  showActionButton={false}
  showLockBadges={true}
/>
```

### Truncation Control

```tsx
// Allow title to wrap to multiple lines
<LearningPath
  path={path}
  handleFeaturedPathPress={handleFeaturedPathPress}
  truncateTitle={false}  // Title will wrap instead of truncate
/>

// Allow description to wrap
<IncompleteFeaturedExercises
  exercise={exercise}
  handleFeaturedExercisePress={handleFeaturedExercisePress}
  truncateDescription={false}  // Description will wrap
/>
```

### Grid Layout Example

```tsx
<ScrollView horizontal>
  {paths.map((path) => (
    <LearningPath
      key={path.id}
      path={path}
      handleFeaturedPathPress={handleFeaturedPathPress}
      preset="grid"
    />
  ))}
</ScrollView>
```

## Size Configurations

### Large
- Card width: 85% of screen width
- Padding: `$5`
- Title font: `$7`
- Description font: `$4`
- Icon size: 24px
- Action icon: 18px

### Medium (Default)
- Card width: 70% of screen width
- Padding: `$4`
- Title font: `$5`
- Description font: `$3`
- Icon size: 20px
- Action icon: 16px

### Small
- Card width: 50% of screen width
- Padding: `$3`
- Title font: `$4`
- Description font: `$2`
- Icon size: 18px
- Action icon: 14px

### XS
- Card width: 40% of screen width
- Padding: `$2`
- Title font: `$3`
- Description font: `$1`
- Icon size: 16px
- Action icon: 12px

## Aspect Ratios

When using layout presets (`banner`, `tall`, `square`, `grid`, `hero`), the media height is automatically calculated to maintain the correct aspect ratio:

- **Banner (16:9)**: Wide format, great for hero sections
- **Tall (3:4)**: Portrait format, good for vertical layouts
- **Square (1:1)**: Perfect squares, ideal for grids
- **Grid (4:3)**: Standard grid format, optimized for 3-4 visible cards
- **Hero (3:2)**: Netflix-style tall format

## Notes

- All props default to `true` to maintain current behavior
- Presets set defaults, but individual props can override them
- Size affects card width, padding, font sizes, and icon sizes
- Truncation is enabled by default for clean layouts
- Lock badges (password/paywall/quiz) are shown by default when applicable

