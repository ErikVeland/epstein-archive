# Investigation Report Format — Standard Specification

This document defines the canonical Markdown format for investigation reports that the Epstein Archive's **Universal Investigation Ingestor** can automatically parse.

A conformant report will automatically populate:

- Investigation title and description
- Linked evidence (EFTA document IDs auto-resolved to internal records)
- Timeline events
- Open leads (tracked in the Leads Tracker)
- Testable hypotheses

---

## Report Structure

### 1. Title (Required)

```markdown
# Vladislav Doronin: The Russian Connection (Epstein-Trump Bridge)
```

- The first `#` heading becomes the investigation title.
- Prefixes like `"Investigation Report:"` are stripped automatically.

---

### 2. Summary / Description (Optional)

Any paragraph text appearing between the `#` title and the first `##` heading is treated as the investigation description. This is shown in the overview card.

```markdown
This investigation tests the thesis that Doronin served as a bridge between Epstein and Trump...
```

---

### 3. Key Evidence (Auto-linked)

Use `EFTA########` identifiers anywhere in the report. They are auto-resolved to internal document records.

```markdown
## Key Evidence

- **[EFTA02426275](https://epstein.live/documents/1205315)**: Confirms "DV" alias.
- **[EFTA00741277](https://epstein.live/documents/778880)**: Kremlin penthouse outreach.
```

Any line containing an EFTA reference will trigger evidence linking. The EFTA ID must be **8 digits**.

---

### 4. Timeline Events

```markdown
## Timeline

- **2009-02-01**: Moscow Penthouse Offer - Doronin's Capital Group contacts Epstein about a Kremlin-facing penthouse.
- **Feb 2010**: Businessman of the Year - Doronin awarded at Kremlin ceremony.
```

**Format**: `- **<date>**: <Title> - <Description>`

- The date can be ISO (`YYYY-MM-DD`), short form (`Feb 2010`), or a year (`2010`).
- Title and description are split on the first `-` separator.
- Events are re-synced on every import (delete + re-insert for idempotency).

---

### 5. Leads (Open Investigation Threads)

```markdown
> [!NOTE]
> **Lead #1 (Moscow Penthouse)**: Need to locate the missing notes regarding the Kremlin penthouse deal. See EFTA00741277 for reference.
```

- Uses the `> [!NOTE]` GitHub-flavored callout block.
- Bold text (`**...**`) before the colon is the lead title.
- The rest is the description. Any EFTA ID in the description is linked to the source document.
- Leads are created with `status: open` and `priority: high`.
- Leads are **additive** — re-importing will not duplicate a lead with the same title.

---

### 6. Hypotheses

```markdown
> [!IMPORTANT]
> **Epstein-Trump Bridge**: Doronin's proximity to both subjects suggests a deliberate backchannel.
```

- Uses `> [!IMPORTANT]` or `> [!CAUTION]` callout blocks.
- Hypotheses are **additive** — not deleted on re-import.

---

## Full Example

```markdown
# Vladislav Doronin: The Russian Connection

This investigation into Vladislav Doronin tests the thesis that he served as an instrumental connection between Jeffrey Epstein and Donald Trump.

## Key Evidence

- **[EFTA02426275](https://epstein.live/documents/1205315)**: Confirms DV alias.
- **[EFTA00741277](https://epstein.live/documents/778880)**: Kremlin penthouse outreach.
- **[EFTA00689980](https://epstein.live/documents/807149)**: Epstein discussing property with Peter Mandelson.

## Timeline

- **2009-01-01**: Kremlin Penthouse Offer - Doronin's head of creative department contacts Epstein.
- **Feb 2010**: Businessman of the Year - Awarded ceremony held at the Moscow Kremlin.
- **Dec 2010**: Putin Certificate of Merit - Vladimir Putin awards Doronin for tiger conservation.

## Leads

> [!NOTE]
> **Lead #1 (Moscow Penthouse Notes)**: Locate the missing correspondence regarding the Kremlin penthouse deal. See EFTA00741277.

> [!NOTE]
> **Lead #2 (Aman Resorts Access)**: Investigate whether Epstein held equity or preferred guest access at Aman Resorts 2010–2015.

## Hypotheses

> [!IMPORTANT]
> **Epstein-Trump Bridge**: Doronin's geographical proximity and shared advisors (Kasowitz Benson) suggests he served as a deliberate backchannel between the two.
```

---

## CLI Usage

```sh
# Import from a file
npx tsx scripts/ingest-investigation.ts vladislav_doronin_investigation.md

# With specific owner
npx tsx scripts/ingest-investigation.ts my_report.md user-1
```

## API Usage (In-App)

Click **"Import Report"** in the investigation workspace header, paste your markdown, and click **Import**. The system will return a summary of what was ingested.

```
POST /api/investigations/import-report
Content-Type: application/json

{ "markdown": "# My Investigation\n..." }
```

Response:

```json
{
  "investigationId": 7,
  "addedEvidence": 11,
  "addedTimelineEvents": 6,
  "addedHypotheses": 1,
  "addedLeads": 2
}
```
