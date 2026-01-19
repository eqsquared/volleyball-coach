# Volleyball Coach - Major Feature Expansion Checklist

## Overview
This document tracks the implementation of major new features: Rotations, Scenarios, Sequences, and improved UI/UX.

## Data Model Changes

### ✅ Phase 1: Data Structure Updates - COMPLETE
- [x] Update data.json schema to include:
  - `rotations`: Array of rotation objects with id, name, positionIds[]
  - `positions`: Array of position objects with id, name, rotationIds[], playerPositions[]
  - `scenarios`: Array of scenario objects with id, name, startPositionId, endPositionId
  - `sequences`: Array of sequence objects with id, name, scenarioIds[] (ordered)
- [x] Create migration script to convert existing savedPositions to new structure
- [x] Update server.js API endpoints for new data structure
- [x] Update db.js frontend API calls for new endpoints

## State Management

### ✅ Phase 2: Enhanced State Tracking - COMPLETE
- [x] Add to state.js:
  - `currentLoadedItem`: { type: 'position'|'scenario'|'sequence', id: string, name: string }
  - `isModified`: boolean (tracks if current item has been edited)
  - `rotations`: array
  - `scenarios`: array
  - `sequences`: array
  - `editMode`: 'none'|'position'|'scenario'|'sequence'
- [x] Add functions to track modifications (detect player position changes)
- [x] Add functions to clear/modify state indicators

## UI Structure

### ✅ Phase 3: Sidebar Redesign - COMPLETE
- [x] Widen sidebar from 180px to ~350px
- [x] Create accordion component structure:
  - Players accordion (existing functionality)
  - Positions accordion (organized by rotations)
  - Rotations accordion
  - Scenarios accordion
  - Sequences accordion
- [x] Add accordion expand/collapse functionality
- [x] Style accordion headers and content areas
- [x] Fix scrolling issues and space management
- [x] Connect edit mode selector to show/hide accordions

## Rotations Feature

### ✅ Phase 4: Rotations Management - COMPLETE
- [x] Create rotations.js module:
  - `createRotation(name)`
  - `updateRotation(id, name, positionIds)`
  - `deleteRotation(id)`
  - `loadRotation(id)` - shows all positions in rotation
  - `updatePositionRotationSelect()` - updates dropdown
- [x] Add rotation UI in accordion:
  - List all rotations
  - Create new rotation button
  - Load/delete rotation buttons
  - Show which positions belong to rotation
- [x] Update positions.js to support rotationIds
- [x] Update server.js with rotation endpoints
- [ ] TODO: Add edit functionality for rotations (currently only create/delete)
- [ ] TODO: Add drag-and-drop to assign positions to rotations

## Positions Feature (Enhanced)

### ✅ Phase 5: Positions with Rotations - COMPLETE
- [x] Update positions.js:
  - Modify `savePosition()` to accept rotationIds
  - Update `loadPosition()` to set currentLoadedItem
  - Add `updatePosition(id, name, rotationIds, playerPositions)`
  - Add `deletePosition(id)` (update from name-based)
  - Add `savePositionAs()` for save-as functionality
- [x] Update position UI:
  - Show which rotation(s) position belongs to
  - Allow assigning position to multiple rotations (multi-select)
  - Display positions with rotation info in accordion
- [x] Add position modification tracking
- [x] Show "unsaved changes" indicator when position is modified
- [ ] TODO: Group positions by rotation in UI display
- [ ] TODO: Add edit functionality to modify position name/rotations

## Scenarios Feature

### ✅ Phase 6: Scenarios Management - COMPLETE
- [x] Create scenarios.js module:
  - `createScenario(name, startPositionId, endPositionId)`
  - `updateScenario(id, name, startPositionId, endPositionId)`
  - `deleteScenario(id)`
  - `loadScenario(id)` - loads start position
  - `playScenario(id)` - animates from start to end
  - `updateScenarioSelects()` - updates dropdowns
- [x] Add scenario UI in accordion:
  - List all scenarios with start/end position names
  - Create new scenario form (name, start position select, end position select)
  - Load/play/delete scenario buttons
- [x] Update animation.js to work with scenario IDs (via temporary savedPositions)
- [x] Update server.js with scenario endpoints
- [ ] TODO: Add edit functionality for scenarios
- [ ] TODO: Improve animation integration (currently uses workaround)

## Sequences Feature

### ⚠️ Phase 7: Sequences Management - MOSTLY COMPLETE
- [x] Create sequences.js module:
  - `createSequence(name, scenarioIds[])`
  - `updateSequence(id, name, scenarioIds[])`
  - `deleteSequence(id)`
  - `loadSequence(id)` - loads first scenario's start position
  - `playNextScenario()` - plays next scenario in current sequence
  - `updateSequenceProgress()` - shows progress
- [x] Add sequence UI in accordion:
  - List all sequences
  - Create new sequence form (name)
  - Load/play/delete sequence buttons
  - "Next" button (visible when sequence is playing)
  - Sequence progress display
- [x] Add sequence state tracking (current scenario index)
- [x] Update server.js with sequence endpoints
- [ ] TODO: Add drag-and-drop scenario ordering in sequence editor
- [ ] TODO: Add edit functionality to modify sequence name/scenarios
- [ ] TODO: Improve sequence playback integration with animation system

## Edit Modes

### ⚠️ Phase 8: Mode-Based Workflows - PARTIAL
- [x] Add mode selector/tabs:
  - "Overview" mode (shows all)
  - "Positions" mode
  - "Scenarios" mode
  - "Sequences" mode
- [x] Mode switching shows/hides relevant accordions
- [x] Update UI to show active mode (button highlighting)
- [ ] TODO: Position Edit Mode enhancements:
  - Better highlighting of position accordion
  - More prominent current loaded position display
- [ ] TODO: Scenario Mode enhancements:
  - Better highlighting of scenario accordion
  - Show current scenario start/end positions more prominently
- [ ] TODO: Sequence Mode enhancements:
  - Better highlighting of sequence accordion
  - More prominent sequence progress display

## State Indicators & Save Prompts

### ⚠️ Phase 9: Modification Tracking - PARTIAL
- [x] Add visual indicator showing:
  - Currently loaded item (type and name)
  - "Modified" badge when changes detected
- [x] Add save prompt bar (appears when modified):
  - "Modified" badge
  - "Save" button (overwrites current)
  - "Save As New" button
  - "Discard Changes" button
- [x] Detect modifications:
  - Player positions change on court ✓
- [ ] TODO: Detect other modifications:
  - Position name changes
  - Rotation assignments change
  - Scenario start/end changes
  - Sequence order changes
- [x] Auto-hide save prompt when saved or discarded
- [ ] TODO: Improve save prompt UX (animations, better positioning)

## Animation Enhancements

### ⚠️ Phase 10: Enhanced Animation - PARTIAL
- [x] Update sequences.js for sequential playback:
  - Track current scenario in sequence
  - "Next" button functionality
  - Sequence progress tracking
- [x] Update UI for sequence playback:
  - Show sequence progress (e.g., "Scenario 2 of 5")
  - Hide "Next" button on last scenario
- [ ] TODO: Improve animation.js integration:
  - Better integration with scenario playback
  - Support playing multiple scenarios in sequence more smoothly
  - Auto-advance option (optional)
- [ ] TODO: Add "Reset Sequence" button
- [ ] TODO: Improve animation transitions between scenarios

## Styling & Polish

### ✅ Phase 11: UI/UX Improvements - MOSTLY COMPLETE
- [x] Update styles.css for wider sidebar (350px)
- [x] Style accordion components
- [x] Style mode selector/tabs
- [x] Style state indicators and save prompts
- [x] Add smooth transitions
- [x] Update button styles for new actions
- [x] Add icons for new features (using Lucide)
- [x] Fix scrolling and space management
- [ ] TODO: Ensure responsive design (if needed)
- [ ] TODO: Polish animations and transitions
- [ ] TODO: Improve visual hierarchy and spacing

## Testing & Migration

### ❌ Phase 12: Data Migration & Testing - NOT STARTED
- [ ] Test migration from old data.json format
- [ ] Test all CRUD operations for each entity type:
  - [ ] Players (create, update, delete)
  - [ ] Rotations (create, update, delete)
  - [ ] Positions (create, update, delete, assign to rotations)
  - [ ] Scenarios (create, update, delete, play)
  - [ ] Sequences (create, update, delete, play, next)
- [ ] Test modification tracking
- [ ] Test save/save-as-new flows
- [ ] Test sequence playback
- [ ] Test animation transitions
- [ ] Verify data persistence
- [ ] Test import/export with new structure
- [ ] Test edge cases (empty data, missing references, etc.)

## Documentation

### ❌ Phase 13: Update Documentation - NOT STARTED
- [ ] Update README.md with new features:
  - [ ] Rotations feature
  - [ ] Scenarios feature
  - [ ] Sequences feature
  - [ ] Edit modes
  - [ ] New sidebar structure
- [ ] Document new data structure (v4.0)
- [ ] Document new UI workflows
- [ ] Add usage examples for rotations, scenarios, sequences
- [ ] Document migration from v3.0 to v4.0

---

## Implementation Order Recommendation

1. **Data Model** (Phase 1) - Foundation for everything
2. **State Management** (Phase 2) - Needed for tracking
3. **Sidebar Redesign** (Phase 3) - New UI structure
4. **Rotations** (Phase 4) - Organizes positions
5. **Positions Enhanced** (Phase 5) - Works with rotations
6. **Scenarios** (Phase 6) - Uses positions
7. **Sequences** (Phase 7) - Uses scenarios
8. **Edit Modes** (Phase 8) - Organizes workflows
9. **State Indicators** (Phase 9) - UX improvement
10. **Animation** (Phase 10) - Enhanced playback
11. **Styling** (Phase 11) - Polish
12. **Testing** (Phase 12) - Quality assurance
13. **Documentation** (Phase 13) - User guidance

---

## Current Status Summary

### ✅ Completed Phases (1-7, 11):
- **Phase 1**: Data structure fully implemented with migration
- **Phase 2**: State management complete
- **Phase 3**: Sidebar redesign complete with scrolling fixes
- **Phase 4**: Rotations feature complete
- **Phase 5**: Positions feature complete with modification tracking
- **Phase 6**: Scenarios feature complete
- **Phase 7**: Sequences feature mostly complete (needs drag-and-drop ordering)
- **Phase 11**: Styling mostly complete

### ⚠️ Partial Phases (8-10):
- **Phase 8**: Edit modes work but need UX enhancements
- **Phase 9**: Modification tracking works but needs more detection types
- **Phase 10**: Animation works but needs better sequence integration

### ❌ Not Started (12-13):
- **Phase 12**: Testing needed
- **Phase 13**: Documentation needs updating

### Priority TODO Items:
1. **High Priority**:
   - Add drag-and-drop scenario ordering in sequences
   - Improve animation integration for sequences
   - Add edit functionality for rotations, scenarios, sequences
   - Test all CRUD operations

2. **Medium Priority**:
   - Enhance edit mode UX (better highlighting, visual feedback)
   - Improve modification detection (name changes, rotation assignments)
   - Polish save prompt UX

3. **Low Priority**:
   - Add auto-advance option for sequences
   - Responsive design improvements
   - Documentation updates

---

## Notes

- Positions can belong to multiple rotations (many-to-many) ✓
- Scenarios reference positions by ID ✓
- Sequences reference scenarios by ID (ordered array) ✓
- All entities have unique IDs for better management ✓
- Migration preserves existing position names as IDs initially ✓
- Modification tracking is key to good UX (partially implemented)
