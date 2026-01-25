# Component Tree Structure

## DOM Hierarchy (from index.html)

```
<body>
└── <div class="app-container">                    [flex column, max-height: 100vh]
    ├── <header class="mobile-header">            [fixed, 48px height, hidden on desktop]
    ├── <div class="drawer-overlay">              [fixed overlay]
    │
    └── <div class="main-content">                [flex row, flex: 1, min-height: 0]
        │
        ├── <div class="sidebar">                 [flex: 0 0 350px, height: var(--available-height)]
        │   ├── <div class="sidebar-content">    [flex: 1, overflow-y: auto]
        │   │   ├── <div class="accordion">       [Players]
        │   │   ├── <div class="accordion">       [Positions]
        │   │   ├── <div class="accordion">       [Scenarios]
        │   │   └── <div class="accordion">       [Sequences]
        │   │
        │   └── <div class="sidebar-footer">     [flex-shrink: 0]
        │       └── <div class="profile-section">
        │
        └── <div class="court-section">           [flex: 1, flex column, min-height: 0]
            ├── <div class="court-top-bar">       [flex-shrink: 0]
            │   ├── <div class="state-indicator">
            │   └── <div class="animation-buttons">
            │
            ├── <div class="court-container">     [flex: 1, min-height: 0]
            │   └── <div class="court">          [aspect-ratio: 1, min() sizing]
            │
            ├── <div class="position-drop-zones-container">  [flex-shrink: 0]
            │   └── <div class="position-drop-zones">
            │
            └── <div class="sequence-timeline">   [flex-shrink: 0, hidden by default]
        
        └── <div class="mobile-positions-bucket"> [hidden on desktop, fixed on mobile]
```

## Key CSS Classes and Their Roles

### app-container
- **Base**: `display: flex`, `flex-direction: column`, `max-height: 100vh`, `overflow: hidden`
- **Mobile Portrait**: `height: var(--available-height)`, `max-height: var(--available-height)`
- **iPad Landscape**: Should have `height: var(--available-height)` (we just added this)

### main-content
- **Base**: `display: flex`, `flex: 1`, `min-height: 0`, `align-items: stretch`
- **Mobile Portrait**: `height: calc(var(--available-height) - 48px)`, `max-height: calc(var(--available-height) - 48px)`, `overflow: hidden`
- **iPad Landscape**: `height: var(--available-height)`, `max-height: var(--available-height)`, `overflow: hidden` (we just added this)

### sidebar
- **Base**: `flex: 0 0 350px`, `height: var(--available-height)`, `max-height: var(--available-height)`, `display: flex`, `flex-direction: column`
- **Mobile Portrait**: `position: fixed`, `height: calc(var(--available-height) - 48px)`
- **iPad Landscape**: `height: var(--available-height)`, `max-height: var(--available-height)`

### court-section
- **Base**: `flex: 1`, `display: flex`, `flex-direction: column`, `min-height: 0`, `overflow: hidden`, `padding: 15px`, `gap: 15px`
- **Mobile Portrait**: `height: 100%`, `max-height: 100%`, `flex: 1`, `min-height: 0`
- **iPad Landscape**: `height: 100%`, `max-height: 100%`, `overflow: hidden` (we just added this)

### court-container
- **Base**: `flex: 1`, `display: flex`, `align-items: center`, `justify-content: center`, `min-height: 0`, `overflow: hidden`

## Potential Issues on iPad Landscape

1. **court-section padding/gap**: Has `padding: 15px` and `gap: 15px` which adds 30px+ of extra space
2. **court-top-bar**: `flex-shrink: 0` means it takes its natural height
3. **position-drop-zones-container**: `flex-shrink: 0` means it takes its natural height
4. **sequence-timeline**: `flex-shrink: 0` means it takes its natural height (if visible)
5. **court-container**: Uses `flex: 1` but might be growing beyond available space

## The Problem

On iPad landscape:
- `app-container` → constrained to viewport ✓
- `main-content` → constrained to viewport ✓
- `sidebar` → constrained to viewport ✓
- `court-section` → constrained to 100% of main-content ✓

BUT: `court-section` has children that are `flex-shrink: 0` (court-top-bar, position-drop-zones-container, sequence-timeline) which might be causing the total height to exceed the container.

The `court-container` with `flex: 1` should shrink, but if the fixed-height children + padding + gaps exceed the available space, the whole `court-section` will overflow.
