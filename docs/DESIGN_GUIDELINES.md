# Impactly Design Guidelines

## Core Principles

These principles guide all feature development and component design decisions.

### 1. Planning Visibility
**"The planning area needs to show me where we are and where we are going."**

- Planning interfaces must provide clear visual indicators of:
  - Current project state (what's done, in progress, blocked)
  - Future trajectory (what's next, what's planned)
  - Progress metrics and milestones
- Avoid burying important status information
- Use visual hierarchies to surface "where we are" vs "where we're going"

### 2. Full Project Lifecycle Support
**"I want to make this tool such that it's there from start to finish of a technical project."**

- Features should support projects from initial ideation through completion
- Avoid features that only work at specific project stages
- Design for continuity - users shouldn't need to switch tools as projects evolve
- Support both early-stage planning and late-stage execution

### 3. Mental Space / Zero-Cognitive-Load
**"I want this to be a mental space, somewhere you can come and just drop, let's the tracking and planning be done by the UI, you focus on acting and forget about remembering anything."**

- UI should handle tracking and organization automatically
- Minimize manual data entry and status updates
- Auto-save everything - users should never lose work
- Infer context and relationships from user actions
- Reduce decision fatigue - provide smart defaults
- Make it easy to "dump" thoughts/ideas without structure
- The system should remember, not the user

## Design Decision Framework

When evaluating features or components, ask:

1. **Does this help users see where they are and where they're going?**
   - If not, how can we add that visibility?

2. **Does this work across the full project lifecycle?**
   - If it's stage-specific, can we generalize it?

3. **Does this reduce cognitive load?**
   - Can we automate this?
   - Can we infer this from context?
   - Does this require the user to remember something?

## Implementation Guidelines

### Auto-save & Persistence
- All user input should auto-save
- No "Save" buttons unless explicitly needed for user control
- Persist state across sessions automatically

### Context Awareness
- Infer relationships (e.g., tasks → features, thoughts → features)
- Auto-categorize and organize when possible
- Remember user preferences and patterns

### Visual Feedback
- Show progress and status clearly
- Use visual indicators for "current state" vs "future state"
- Provide immediate feedback for all actions

### Minimal Friction
- Reduce clicks to accomplish common tasks
- Provide keyboard shortcuts for power users
- Support drag-and-drop where natural
- Allow bulk operations

---

*Last updated: [Date will be set when guidelines are finalized]*

