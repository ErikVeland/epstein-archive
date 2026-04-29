# Source-First Evidence UX — Copy Specifications

**Owner**: Claude (Product/UX)
**Status**: Draft
**Last Updated**: 2026-04-29

## Provenance Badges (Status Indicators)

### Source Hash Present

**Badge**: "Source verified" (green, checkmark)
**Tooltip**: "This record links to source document {hashShort}"
**Click action**: Jump to source document

### Source Missing

**Badge**: "Source missing" (orange, warning icon)
**Tooltip**: "No source document recorded for this extraction"
**Action**: "Mark as needing review" (if user can edit)

### Review State: Unreviewed

**Badge**: "Unreviewed" (gray, clock icon)
**Tooltip**: "This extraction hasn't been human-verified yet"

### Review State: Accepted

**Badge**: "Verified" (green, checkmark)
**Tooltip**: "Human-verified on {lastVerifiedAt}"

### Review State: Rejected

**Badge**: "Rejected" (red, X icon)
**Tooltip**: "Rejected during review. Reason: {reason}"

### Review State: Deferred

**Badge**: "Deferred" (yellow, pause icon)
**Tooltip**: "Review deferred for later investigation"

### Review State: Insufficient Evidence

**Badge**: "Insufficient" (orange, dash icon)
**Tooltip**: "Not enough evidence to verify this claim"

---

## Confidence Labels

### High Confidence (90-100%)

**Label**: "High confidence" (green)
**Tooltip**: "Extraction confidence: {confidence}%"

### Medium Confidence (70-89%)

**Label**: "Medium confidence" (yellow)
**Tooltip**: "Extraction confidence: {confidence}% — verify if critical"

### Low Confidence (40-69%)

**Label**: "Low confidence" (orange)
**Tooltip**: "Extraction confidence: {confidence}% — requires verification"

### Very Low Confidence (<40%)

**Label**: "Very low confidence" (red)
**Tooltip**: "Extraction confidence: {confidence}% — likely unreliable"

---

## Extraction Method Labels

### OCR (Optical Character Recognition)

**Label**: "OCR extraction"
**Tooltip**: "Text extracted via OCR from source document"

### LLM (Language Model)

**Label**: "AI extraction"
**Tooltip**: "Data extracted using AI analysis"

### Manual

**Label**: "Manual entry"
**Tooltip**: "Entered manually by investigator"

### Database Import

**Label**: "Imported"
**Tooltip**: "Imported from external database"

---

## Source Jump Links (Evidence → Source)

### Entity dossier

**Link text**: "View source document"
**Location**: Below entity metadata, next to "Source verified" badge
**Action**: Open document modal at relevant page/section

### Document evidence tab

**Link text**: "Jump to source"
**Location**: Next to each evidence item
**Action**: Open source document, highlight relevant text

### Claim list

**Link text**: "Source: {documentTitle}"
**Location**: Below each claim
**Action**: Open document modal at claim location

### Timeline event

**Link text**: "{sourceType} • {date}"
**Location**: Below event description
**Action**: Open source document

---

## Empty/No-Source States

### No source linked

**Heading**: "No source recorded"
**Body**: "This record doesn't have a linked source document. Add one or mark as needing review."
**Actions**: "Link source" (primary), "Mark for review" (secondary)

### Source document unavailable

**Heading**: "Source unavailable"
**Body**: "The linked source document ({hashShort}) is not available in this archive."
**Actions**: "Request document" (if available), "Remove link" (danger)

### Extraction without confidence

**Heading**: "Confidence not rated"
**Body**: "This extraction doesn't have a confidence score. It may need manual review."
**Actions**: "Mark for review" (primary)

---

## Warning Messages

### Weak confidence warning

**Message**: "This extraction has low confidence ({confidence}%). Verify before using in reports."
**Type**: Warning (orange)
**Action**: "Review extraction" (link)

### Missing provenance warning

**Message**: "No source document recorded. This data cannot be verified."
**Type**: Warning (orange)
**Action**: "Add source" (link)

### Conflicting sources

**Message**: "Multiple sources conflict on this data point. Review all sources."
**Type**: Error (red)
**Action**: "Compare sources" (link)

### Unverified claim

**Message**: "This claim is unreviewed. Treat as unverified evidence."
**Type**: Info (blue)
**Action**: "Review claim" (link)

---

## Export Warnings (Evidence Packet)

### Unverified items included

**Warning**: "Includes {count} unverified items"
**Detail**: "These items haven't been human-verified. Review before exporting."
**Action**: "Review {count} items"

### Missing source references

**Warning**: "Includes {count} items without source references"
**Detail**: "These items can't be traced to source documents."
**Action**: "Add sources" (if editable)

### Low-confidence items

**Warning**: "Includes {count} low-confidence extractions"
**Detail**: "Confidence below 70%. Verify before using in reports."
**Action**: "Review extractions"

---

## Mobile Considerations

### Badge truncation

- Show icon + short label: "Verified", "Unreviewed", "Low conf."
- Full text in tooltip/on long-press

### Source link

- Full-width tappable area
- Icon + "View source" text
- Haptic feedback on tap

### Confidence indicator

- Color bar (not just text) for colorblind accessibility
- Percentage shown on tap

---

## Accessibility Notes

### Screen reader announcements

- Badge: "{entity} source status: Verified, linked to document ABC123"
- Confidence: "Extraction confidence: 85%, High"
- Source link: "View source document for {entity}, opens modal"

### Colorblind considerations

- Never rely on color alone
- Use icons: ✓ (verified), ? (unreviewed), ⚠ (warning), ✗ (rejected)
- Use text labels alongside colors

### Keyboard navigation

- Tab to badge → announces status
- Tab to source link → Enter to open source
- Tab to confidence indicator → announces confidence level
