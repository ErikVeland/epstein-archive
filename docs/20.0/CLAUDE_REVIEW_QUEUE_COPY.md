# Review & Ambiguity Queue — Copy Specifications

**Owner**: Claude (Product/UX)
**Status**: Draft
**Last Updated**: 2026-04-29

## Queue Item Types

### Alias Conflict

**Label**: "Alias conflict"
**Description**: "Multiple names may refer to the same entity: {name1}, {name2}, {name3}"
**Priority**: "Medium" (default)
**Action options**: "Merge aliases", "Keep separate", "Defer"

### Duplicate Entity

**Label**: "Potential duplicate"
**Description**: "{entity1} and {entity2} may be the same entity based on shared attributes."
**Priority**: "High" (if confidence >80%)
**Action options**: "Merge entities", "Keep separate", "Defer"

### Conflicting Dates

**Label**: "Date conflict"
**Description**: "Multiple sources give different dates for {event}: {date1}, {date2}, {date3}"
**Priority**: "Medium"
**Action options**: "Accept {dateX}", "Mark all uncertain", "Defer"

### Weak Extraction Confidence

**Label**: "Low confidence extraction"
**Description**: "Extraction for {field} has only {confidence}% confidence."
**Priority**: "Low" (if <50%), "Medium" (50-70%)
**Action options**: "Verify manually", "Accept as-is", "Reject", "Defer"

### Missing Provenance

**Label**: "Missing provenance"
**Description**: "{entity/document/claim} has no linked source document."
**Priority**: "High"
**Action options**: "Link source", "Mark as unverified", "Defer"

### Claims Needing Review

**Label**: "Unreviewed claim"
**Description**: "Claim about {entity} hasn't been human-verified: {claimText}"
**Priority**: "Medium"
**Action options**: "Accept", "Reject", "Request more evidence", "Defer"

---

## Review State Transitions

### From "Unreviewed" → "Accepted"

**Confirmation**: "Mark as verified?"
**Detail**: "This marks the item as human-verified. Original source data is preserved."
**Action**: "Verify" (primary)
**Undo**: "Undo" (appears for 5 seconds after action)

### From "Unreviewed" → "Rejected"

**Prompt**: "Reject this item?"
**Reason options**:

- "Incorrect extraction"
- "Source unreliable"
- "Insufficient evidence"
- "Duplicate" (specify which item)
  **Action**: "Reject" (danger)
  **Note**: Original source text preserved in audit log.

### From "Unreviewed" → "Deferred"

**Prompt**: "Defer this item?"
**Options**:

- "Defer for now" (no date)
- "Defer until {date}" (date picker)
- "Defer to {user}" (assignee picker)
  **Action**: "Defer" (secondary)

### From "Unreviewed" → "Insufficient Evidence"

**Prompt**: "Mark as insufficient evidence?"
**Detail**: "This indicates the data can't be verified with current sources."
**Action**: "Mark insufficient" (warning)

---

## Audit Log Language

### Verification action

**Log entry**: "{user} verified {itemType} on {timestamp}"
**Preserved data**: Original extraction, source hash, confidence score

### Rejection action

**Log entry**: "{user} rejected {itemType} on {timestamp}. Reason: {reason}"
**Preserved data**: Original extraction, rejection reason, source hash

### Deferral action

**Log entry**: "{user} deferred {itemType} on {timestamp}. {optional: Until {date}, Assigned to {user}}"
**Preserved data**: Original data, deferral reason, assigned user

### Merge action (aliases/duplicates)

**Log entry**: "{user} merged {item1} and {item2} on {timestamp}. Master record: {masterId}"
**Preserved data**: Both original records, merge reasoning

---

## Queue Header & Summary

### Queue with items

**Heading**: "Review Queue ({count} items)"
**Subheading**: "{conflictCount} conflicts • {missingCount} missing provenance • {weakConfidenceCount} low confidence"
**Filter**: Dropdown: "All", "Conflicts", "Missing Provenance", "Low Confidence", "Deferred"

### Empty queue

**Heading**: "All caught up"
**Body**: "No unresolved conflicts, missing provenance, or weak-confidence items to review."
**Icon**: Checkmark in circle (green)

### Queue with deferred only

**Heading**: "Review Queue ({count} deferred)"
**Body**: "You have {count} deferred items. Review them when ready."
**Filter**: Default to "Deferred" items.

---

## Bulk Actions

### Bulk verify (all high-confidence)

**Prompt**: "Verify all {count} high-confidence items?"
**Detail**: "This will mark {count} items as human-verified. Original source data preserved."
**Action**: "Verify all" (primary)
**Cancel**: "Cancel"

### Bulk defer

**Prompt**: "Defer selected {count} items?"
**Options**: Same as single defer (date, assignee)
**Action**: "Defer {count} items" (secondary)

### Bulk reject

**Prompt**: "Reject selected {count} items?"
**Reason required**: Yes (same options as single reject)
**Action**: "Reject {count} items" (danger)
**Warning**: "Original source data will be preserved in audit log."

---

## Priority Definitions (for reviewers)

### Critical

"Requires immediate attention. Blocks export or investigation progress."
**Color**: Red
**Examples**: Missing provenance on key evidence, conflicting dates on critical events

### High

"Important to resolve soon. Affects investigation reliability."
**Color**: Orange
**Examples**: Duplicate entities, rejected extractions on core data

### Medium

"Should be reviewed during normal workflow."
**Color**: Yellow
**Examples**: Alias conflicts, medium-confidence extractions

### Low

"Can be deferred or reviewed during cleanup."
**Color**: Gray
**Examples**: Low-confidence extractions on minor fields, old deferred items

---

## Mobile Considerations

### Queue item (card)

- Type icon + label (top left)
- Description (1-2 lines, ellipsis)
- Priority badge (top right)
- Action buttons: "Review" (primary, full-width), "Defer" (secondary, text)

### Swipe actions

- Swipe right: "Quick verify" (green)
- Swipe left: "Defer" (yellow)
- Long press: Context menu (Verify, Reject, Defer, Details)

### Review modal

- Full-screen modal (not bottom sheet)
- Show original extraction, source, confidence
- Action buttons: "Verify", "Reject", "Defer" (all full-width)
- "Back" button to return to queue

---

## Accessibility Notes

### Screen reader announcements

- Queue update: "Review queue updated, {count} items"
- Item review: "{itemType} marked as {state}"
- Bulk action: "{count} items marked as {state}"

### Keyboard navigation

- Tab through queue items (each item is focusable)
- Enter/Space: Open review modal
- Tab within modal: Through action buttons
- Escape: Close modal, return to queue

### Focus indicators

- Queue item: 2px blue ring
- Action buttons: 2px blue ring, inset
- Ensure 4.5:1 contrast for all text
