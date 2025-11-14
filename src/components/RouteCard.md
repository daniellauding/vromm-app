# RouteCard Component Documentation

## Overview

`RouteCard` is a flexible, customizable component for displaying route information with various layout options, sizes, and content visibility controls.

## Basic Usage

```tsx
import { RouteCard } from './components/RouteCard';

<RouteCard 
  route={routeData}
  onPress={() => navigation.navigate('RouteDetail', { routeId: route.id })}
/>
```

## Props Reference

### Required Props

- **`route`** (Route): Route data object containing route information

### Optional Props

#### Size Control
- **`size`**: `'large' | 'medium' | 'small' | 'xs'`
  - Controls overall card size and spacing
  - Default: `'medium'`

#### Preset Variants
- **`preset`**: One of the preset variants (see Presets section below)
  - Quick way to apply common configurations
  - Can be overridden with individual props

#### Content Visibility
- **`showMap`**: `boolean` (default: `true`)
  - Show/hide route map
  
- **`showImage`**: `boolean` (default: `true`)
  - Show/hide route images
  
- **`showVideo`**: `boolean` (default: `true`)
  - Show/hide route videos (if route has video)
  
- **`showTitle`**: `boolean` (default: `true`)
  - Show/hide route title
  
- **`showDescription`**: `boolean` (default: `true`)
  - Show/hide route description
  
- **`showAuthor`**: `boolean` (default: `true`)
  - Show/hide author information
  
- **`showRouteMeta`**: `boolean` (default: `true`)
  - Show/hide route metadata (difficulty, spot type, rating)

#### Carousel Control
- **`enableCarousel`**: `boolean` (default: `true`)
  - Enable/disable carousel for multiple media items
  - When enabled, users can swipe through maps/images/videos

#### Truncation Control
- **`truncateTitle`**: `boolean` (default: `true`)
  - If `true`, title truncates with ellipsis when it doesn't fit
  - If `false`, title wraps to multiple lines
  
- **`truncateDescription`**: `boolean` (default: `true`)
  - If `true`, description truncates with ellipsis when it doesn't fit
  - If `false`, description wraps to multiple lines
  
- **`truncateAuthor`**: `boolean` (default: `true`)
  - If `true`, author name truncates with ellipsis when it doesn't fit
  - If `false`, author name wraps
  
- **`truncateMeta`**: `boolean` (default: `true`)
  - If `true`, meta text (difficulty, spot type, rating) truncates with ellipsis
  - If `false`, meta text wraps

#### Interaction
- **`onPress`**: `() => void`
  - Callback when card is pressed

## Preset Variants

Presets provide quick configurations for common use cases. Individual props can override preset defaults.

### Content Presets

| Preset | Size | Map | Image | Video | Title | Desc | Author | Meta | Carousel |
|--------|------|-----|-------|-------|-------|------|--------|------|----------|
| `default` | medium | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `compact` | small | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `minimal` | xs | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `map-only` | small | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `image-only` | small | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `video-only` | small | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `text-only` | small | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `title-only` | small | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `author-only` | small | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `meta-only` | small | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `miniature` | xs | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |

### Layout Presets (with Aspect Ratios)

| Preset | Size | Aspect Ratio | Use Case |
|--------|------|--------------|----------|
| `grid` | small | 4:3 | Grid layouts (3-4 cards visible) |
| `banner` | medium | 16:9 | Wide banner format |
| `tall` | medium | 3:4 | Portrait/tall format |
| `square` | small | 1:1 | Square format |
| `hero` | large | 3:2 | Netflix-style hero card (title/text above media) |

## Usage Examples

### Basic Preset Usage

```tsx
// Image only card
<RouteCard route={route} preset="image-only" />

// Map only card
<RouteCard route={route} preset="map-only" />

// Video only card (if route has video)
<RouteCard route={route} preset="video-only" />

// Text only (no media)
<RouteCard route={route} preset="text-only" />

// Banner format (16:9)
<RouteCard route={route} preset="banner" />

// Grid format (4:3, optimized for grids)
<RouteCard route={route} preset="grid" />
```

### Override Preset with Individual Props

```tsx
// Use preset but add author
<RouteCard 
  route={route} 
  preset="image-only" 
  showAuthor={true}  // Override: add author
/>

// Use preset but change size
<RouteCard 
  route={route} 
  preset="grid" 
  size="large"  // Override: use large instead of small
/>

// Use preset but add description
<RouteCard 
  route={route} 
  preset="compact" 
  showDescription={true}  // Override: add description
/>
```

### Full Control Without Preset

```tsx
// Custom configuration
<RouteCard 
  route={route}
  size="small"
  showMap={true}
  showImage={false}
  showVideo={true}
  showTitle={true}
  showAuthor={false}
  showRouteMeta={true}
  enableCarousel={true}
/>
```

### Truncation Control

```tsx
// Allow title to wrap to multiple lines
<RouteCard 
  route={route}
  truncateTitle={false}  // Title will wrap instead of truncate
/>

// Allow description to wrap
<RouteCard 
  route={route}
  truncateDescription={false}  // Description will wrap
/>

// Allow all text to wrap (no truncation)
<RouteCard 
  route={route}
  truncateTitle={false}
  truncateDescription={false}
  truncateAuthor={false}
  truncateMeta={false}
/>
```

### Grid Layout Example

```tsx
<FlatList
  horizontal
  data={routes}
  renderItem={({ item }) => (
    <XStack marginRight="$3" width={cardWidth} overflow="hidden">
      <RouteCard 
        route={item} 
        preset="grid"
        onPress={() => navigate('RouteDetail', { routeId: item.id })}
      />
    </XStack>
  )}
/>
```

## Size Details

### Large
- Padding: `$5`
- Carousel height: 35% of screen height
- Title font: `$6`
- Icons: 18px
- Text font: `$4`

### Medium (Default)
- Padding: `$4`
- Carousel height: 30% of screen height
- Title font: `$5`
- Icons: 16px
- Text font: `$4`

### Small
- Padding: `$2.5`
- Carousel height: Calculated based on aspect ratio or 4:3 default
- Title font: `$3`
- Icons: 12px
- Text font: `$2`

### XS
- Padding: `$2`
- Carousel height: 50% of screen width (square-ish)
- Title font: `$2`
- Icons: 10px
- Text font: `$1`

## Aspect Ratios

When using layout presets (`banner`, `tall`, `square`, `grid`, `hero`), the carousel height is automatically calculated to maintain the correct aspect ratio:

- **Banner (16:9)**: Wide format, great for hero sections
- **Tall (3:4)**: Portrait format, good for vertical layouts
- **Square (1:1)**: Perfect squares, ideal for grids
- **Grid (4:3)**: Standard grid format, optimized for 3-4 visible cards
- **Hero (3:2)**: Netflix-style tall format, title/text above media

## Carousel Behavior

- When `enableCarousel={true}` and multiple media items exist, users can swipe through them
- When only one item exists or carousel is disabled, a single static view is shown
- Carousel supports: Maps, Images, Videos, and YouTube embeds
- Filtering respects `showMap`, `showImage`, and `showVideo` props

## Best Practices

1. **Use presets for common layouts** - They're optimized and tested
2. **Override presets when needed** - Individual props can fine-tune presets
3. **Consider aspect ratios** - Use layout presets for consistent visual appearance
4. **Handle overflow in grids** - Use `overflow="hidden"` on wrapper containers
5. **Test with different content** - Some routes may not have all media types

## Notes

- All visibility props default to `true` to maintain backward compatibility
- Presets set defaults but can be overridden with individual props
- Videos are only shown if the route actually has video attachments
- The component automatically handles dark/light mode
- Translations are supported for all text content

