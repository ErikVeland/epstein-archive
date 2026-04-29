# Investigation Command Center — UI Copy Specifications

**Owner**: Claude (Product/UX)
**Status**: Draft
**Last Updated**: 2026-04-29

## Empty States

### No Investigations

**When**: User has no investigations yet.
**Heading**: "No investigations yet"
**Body**: "Create your first investigation to start organizing evidence and building case files."
**Action**: "Create Investigation" (primary button)

### Investigation has no evidence

**When**: Investigation exists but has no evidence added.
**Heading**: "No evidence added"
**Body**: "Start building your case by adding documents, entities, or media from search results."
**Action**: "Search Archive" (primary button)

### No unresolved items

**When**: Review queue is empty.
**Heading**: "All caught up"
**Body**: "No unresolved conflicts, missing provenance, or weak-confidence items to review."
**State**: Show checkmark icon, calm green accent.

### No active investigations

**When**: User has investigations but none are active.
**Heading**: "No active investigations"
**Body**: "You have investigations, but none are marked as active. Resume a draft or create a new one."
**Action**: "View All Investigations" (secondary button)

---

## Loading States

### Investigations loading

**Skeleton**: Show 3 card skeletons with title, status badge, evidence count placeholder.
**Screen reader**: "Loading your investigations..."

### Evidence loading

**Skeleton**: Show list skeleton with entity/document/media type icons.
**Screen reader**: "Loading evidence..."

### Review queue loading

**Skeleton**: Show 3 queue item skeletons with type icon, title, priority badge.
**Screen reader**: "Loading review queue..."

---

## Error States

### API unavailable (degraded mode)

**Heading**: "Investigation service unavailable"
**Body**: "The investigation service is temporarily unavailable. You can still search the archive, but investigation features are disabled."
**Action**: "Retry" (primary button)
**Note**: Show degraded banner at top of command center.

### Failed to create investigation

**Heading**: "Couldn't create investigation"
**Body**: "There was a problem creating your investigation. Please check your connection and try again."
**Error detail** (collapsible): Show specific error from API if available.
**Action**: "Retry" (primary button)

### Failed to load investigations

**Heading**: "Couldn't load investigations"
**Body**: "We couldn't load your investigations. This might be a temporary issue."
**Action**: "Retry" (primary button)

---

## Card Copy (Investigation Cards)

### Status badges

- `active`: "Active" (blue badge)
- `archived`: "Archived" (gray badge)
- `closed` / `published`: "Published" (green badge)
- `draft`: "Draft" (yellow badge)

### Evidence count

- 0: "No evidence"
- 1: "1 item"
- 2+: "{count} items"

### Conflict count

- 0: (no indicator)
- 1: "1 conflict" (orange indicator)
- 2+: "{count} conflicts" (orange indicator)

### Export readiness

- `ready`: "Ready to export" (green dot)
- `warning`: "Export warnings" (orange dot)
- `blocked`: "Export blocked" (red dot)

### Last activity

Use relative time: "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "{date}"

---

## Triage Panel Copy

### Missing provenance

**Label**: "Missing provenance"
**Description**: "Items without source documentation or verification."
**Action**: "Review {count} items"

### Weak confidence

**Label**: "Low confidence"
**Description**: "Extractions with confidence below 70%."
**Action**: "Review {count} items"

### Unresolved aliases

**Label**: "Alias conflicts"
**Description**: "Potential duplicate entities needing resolution."
**Action**: "Resolve {count} conflicts"

### Failed imports

**Label**: "Import failures"
**Description**: "Documents or media that failed to process."
**Action**: "View {count} failures"

### Export blockers

**Label**: "Export blockers"
**Description**: "Issues preventing evidence packet export."
**Action**: "Fix {count} blockers"

---

## Resume Actions (Quick Actions)

### Last opened investigation

**Label**: "Resume: {investigation title}"
**Description**: "Last opened {relative time}"

### Recently viewed entity

**Label**: "Entity: {entity name}"
**Description**: "Viewed {relative time}"

### Recently viewed document

**Label**: "Document: {document title}"
**Description**: "Viewed {relative time}"

### Current review queue

**Label**: "Review Queue ({count} items)"
**Description**: "Unresolved conflicts and missing provenance"

---

## Investigation Status Definitions (for users)

### Draft

"Investigation is being set up. No evidence added yet."

### Active

"Investigation is in progress. Evidence is being collected and analyzed."

### Review

"Investigation is under review. Evidence is being verified and conflicts resolved."

### Export-Ready

"Investigation is ready for export. All evidence is verified and documented."

### Published

"Investigation is complete and published. No further edits expected."

### Archived

"Investigation is archived. Read-only access for reference."

---

## Mobile Considerations

### Card truncation

- Title: max 2 lines, ellipsis
- Description: max 1 line, ellipsis
- Status/evidence: always visible

### Bottom sheet actions

- "Resume Investigation" (primary)
- "Edit Details" (secondary)
- "Archive" (danger, if active)

### Pull-to-refresh

**Label**: "Pull to refresh investigations"
**Loading**: Spinner with "Updating..."

---

## Accessibility Notes

### Screen reader announcements

- Investigation list changes: "Investigations updated, {count} total"
- Status change: "{investigation} is now {status}"
- Evidence added: "{count} evidence items added to {investigation}"

### Keyboard navigation

- Tab through cards (card is focusable)
- Enter/Space to open investigation
- Tab within card for actions
- Escape to close any open modals

### Focus indicators

- Card focus: 2px blue ring, offset 2px
- Button focus: 2px blue ring, inset
- Ensure 4.5:1 contrast ratio for all text
