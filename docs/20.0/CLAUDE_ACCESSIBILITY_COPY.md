# Accessibility & Mobile Polish — Copy Specifications

**Owner**: Claude (Product/UX)
**Status**: Draft
**Last Updated**: 2026-04-29

## Mobile-Specific Copy

### Bottom navigation labels

- "Search" (magnifying glass icon)
- "Investigations" (folder icon)
- "Documents" (document icon)
- "Evidence" (stack icon)
- "More" (ellipsis icon)

### Pull-to-refresh

**Label**: "Pull to refresh"
**Loading**: "Updating..."
**Success**: "Updated just now"

### Bottom sheet actions

**Dismiss**: "Swipe down to dismiss"
**Action**: "{Action} (tap)"
**Close button**: "Close" (X icon, top right)

### Mobile empty states

**Heading**: Same as desktop, but shorter if needed
**Body**: Max 2 lines, ellipsis + "Read more" link
**Action buttons**: Full-width, stacked vertically

### Mobile error states

**Heading**: "Something went wrong"
**Body**: Max 1 line + "Details" expandable section
**Retry button**: Full-width, primary

---

## Keyboard Navigation Labels

### Skip navigation

**Link text**: "Skip to main content"
**Position**: Hidden until focused, top of page
**Action**: Jumps to main content area

### Focus mode indicators

**Announcement**: "Now navigating {section}"
**Sections**: Search, Results, Detail View, Investigation, Evidence

### Keyboard shortcuts (optional, advanced users)

- `/` : Focus search
- `Esc` : Close modal
- `G` then `I` : Go to Investigations
- `G` then `S` : Go to Search
- `?` : Show keyboard shortcuts help

### Button labels (for screen readers)

**Generic**: "Button" (never use alone)
**Specific**: "Search", "Filter", "Sort", "Export", "Add evidence", "Create investigation"
**With count**: "Review queue (5 items)", "Investigations (12)"

---

## Screen Reader Text

### Status announcements

**Loading**: "Loading... {resource name}"
**Success**: "{resource} loaded successfully"
**Error**: "Error loading {resource}. {error message}"
**Empty**: "No {resource} found. {reason}"

### Navigation announcements

**Page change**: "Navigated to {page name}"
**Modal open**: "{modal name} dialog opened"
**Modal close**: "{modal name} dialog closed"
**Tab change**: "{tab name} tab selected"

### Data announcements

**Evidence count**: "{count} evidence items in {investigation}"
**Conflict count**: "{count} conflicts need review"
**Export status**: "Export ready", "Export has warnings", "Export blocked"

### Form announcements

**Validation error**: "{field} error: {message}"
**Success**: "{form} submitted successfully"
**Progress**: "Step {current} of {total}"

---

## Non-Color Indicators

### Status indicators (not relying on color alone)

- **Verified**: ✓ icon + "Verified" text (green)
- **Unreviewed**: ? icon + "Unreviewed" text (gray)
- **Rejected**: ✗ icon + "Rejected" text (red)
- **Deferred**: ⏸ icon + "Deferred" text (yellow)
- **Conflict**: ⚠ icon + "Conflict" text (orange)

### Priority indicators

- **Critical**: 🔴 "Critical" + bold text
- **High**: ↑ "High" + uppercase text
- **Medium**: → "Medium" + normal text
- **Low**: ↓ "Low" + lighter text

### Confidence indicators

- **High**: "High (90%+)" + checkmark
- **Medium**: "Medium (70-89%)" + dash
- **Low**: "Low (<70%)" + warning icon

---

## Focus Indicators

### Visible focus ring

**Style**: 2px solid blue (#0066CC)
**Offset**: 2px from element
**Contrast**: 4.5:1 minimum against background

### Focus within modals

**Trap focus**: Inside modal, won't escape to background
**Return focus**: Returns to triggering element when modal closes
**Announcement**: "{modal} dialog opened, {count} items in tab order"

### Focus on cards/items

**Indicator**: Blue ring + slight scale (1.02x)
**Announcement**: "{item name}, {item type}, {status}"
**Action**: Enter/Space to open/select

---

## Error Messages (Accessible)

### Form validation

**Format**: "{Field}: {error message}"
**Example**: "Title: Title is required"
**Announcement**: "Error in {form}: {count} errors found"

### API errors

**Generic**: "Something went wrong. Please try again."
**Specific**: "{Action} failed: {specific error}"
**Retry**: "Try again" button, not "OK"

### Network errors

**Message**: "Connection lost. Check your internet and retry."
**Action**: "Retry" button
**Announcement**: "Network error. Connection lost."

---

## Empty State Copy (Accessible)

### No results found

**Heading**: "No results found"
**Body**: "Try adjusting your filters or search terms."
**Screen reader**: "No results found. Try adjusting filters or search terms."
**Action**: "Clear filters" button

### No investigations

**Heading**: "No investigations yet"
**Body**: "Create your first investigation to start organizing evidence."
**Screen reader**: "No investigations. Create first investigation to start."
**Action**: "Create Investigation" button

### No evidence

**Heading**: "No evidence added"
**Body**: "Start building your case by adding documents, entities, or media."
**Screen reader**: "No evidence in investigation. Add documents, entities, or media."
**Action**: "Search Archive" button

---

## Mobile-Specific Accessibility

### Touch targets

**Minimum size**: 44x44 CSS pixels (Apple HIG)
**Spacing**: 8px minimum between targets
**Examples**: Buttons, icons, list items, cards

### Gesture alternatives

**Swipe actions**: Must have button alternative
**Pinch-to-zoom**: Must have button controls for zoom
**Long press**: Must have context menu button

### Orientation changes

**Announcement**: "Rotated to {landscape/portrait}"
**Focus**: Returns to same element after rotation
**Scroll position**: Maintained after rotation

---

## Investigtation Workspace (Mobile)

### Mobile header

**Title**: "{Investigation Name}" (truncated with ellipsis)
**Subtitle**: "{status} • {evidenceCount} items"
**Actions**: "..." menu (vertical ellipsis)

### Evidence list (mobile)

**Item**: Icon + title (1 line) + type badge
**Swipe**: Left = "Defer", Right = "Quick verify" (with button alternatives)
**Tap**: Open evidence detail

### Investigation tools (mobile)

**Tabs**: Scrollable horizontal tabs
**Active tab**: Blue underline + bold text
**Tab labels**: "Evidence", "Notes", "Hypotheses", "Tasks", "Export"

---

## Verification Checklist

### Screen reader testing

- [ ] All interactive elements have accessible names
- [ ] All images have alt text or aria-hidden="true"
- [ ] All form inputs have associated labels
- [ ] All errors are announced via aria-live regions
- [ ] Tab order is logical (left-to-right, top-to-bottom)

### Keyboard testing

- [ ] All interactive elements are reachable via Tab
- [ ] Modal focus is trapped inside
- [ ] Focus is visible on all elements
- [ ] Escape closes modals/dialogs
- [ ] Enter/Space activates buttons/links

### Color contrast testing

- [ ] Text has 4.5:1 contrast against background
- [ ] Status indicators don't rely on color alone
- [ ] Focus indicators have 3:1 contrast
- [ ] Icons have 3:1 contrast (if meaningful)

### Mobile testing

- [ ] Touch targets are 44x44 minimum
- [ ] Text is readable without zoom (16px minimum)
- [ ] No horizontal scrolling at 320px width
- [ ] Swipe actions have button alternatives
- [ ] Orientation changes don't break layout
