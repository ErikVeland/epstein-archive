# Proposed Canonical Schema

This is the target state — what the schema should look like after all recommended changes are applied. No changes happen here; this is the reference goal state for migrations.

**This document does not authorise any change. Every change requires a corresponding migration in the staged plan.**

---

## Design Principles

1. **One table per concept** — no two tables should represent the same domain object
2. **FKs on every cross-table reference** — no dangling text IDs
3. **snake_case columns throughout** — no mixed naming within a table
4. **Pipeline state in dedicated tables** — not embedded in domain tables
5. **Dead tables removed** — tables with 0 rows and no active writers are dropped

---

## Core Tables (current → target)

### `entities` table (target)

Remove duplicate `type` column; keep `entity_type`. Add missing `aliases` as a proper array with FK junction if needed.

```
entities:
  id                bigint PK
  name              text NOT NULL
  canonical_name    text
  entity_type       text NOT NULL          -- drop 'type' column
  primary_role      text
  bio               text
  birth_date        timestamp
  death_date        timestamp
  red_flag_rating   integer DEFAULT 0
  red_flag_desc     text
  embedding_vector  vector(1536)           -- pgvector, nullable until populated
  provenance_status text DEFAULT 'missing'
  review_state      text DEFAULT 'unreviewed'
  created_at        timestamptz DEFAULT now()
  updated_at        timestamptz DEFAULT now()
  canonical_id      bigint REFERENCES entities(id)  -- entity dedup link
```

Drop: `type` (conflict column), `aliases` (99.94% null — move to `entity_aliases` junction if needed)

---

### `documents` table (target — reduce from 60 to ~35 columns)

Remove dead/duplicated columns; extract pipeline state to `document_processing_state`.

```
documents:
  id                      bigint PK
  file_name               text
  file_path               text
  original_file_path      text
  title                   text
  content                 text             -- keep as canonical content
  content_refined         text             -- keep (pipeline-cleaned)
  content_preview         text             -- keep (UI display)
  file_type               text
  file_size               bigint
  page_count              integer
  is_sensitive            boolean DEFAULT false
  is_hidden               integer DEFAULT 0
  has_failed_redactions   integer DEFAULT 0
  failed_redaction_count  integer DEFAULT 0
  evidence_type           text
  red_flag_rating         integer DEFAULT 0
  significance_score      float8 NOT NULL DEFAULT 0
  fts_vector              tsvector
  metadata_json           jsonb
  word_count              integer
  date_created            timestamptz
  created_at              timestamptz DEFAULT now()
  extracted_date          timestamptz
  content_sha256          text             -- canonical hash
  hash_algo               text DEFAULT 'sha256'
  normalized_text_sha256  text
  source_collection       text
  source_path             text
  source_system           text
  source_release          text
  source_acquired_at      timestamptz
  parent_document_id      bigint REFERENCES documents(id)
  provenance_status       text DEFAULT 'missing'
  provenance_score        float8
  original_file_id        bigint
```

Columns to DROP:

- `source_original_url` (100% null)
- `source_url` (~100% null)
- `source_acquisition_method` (mostly null, vague)
- `start_offset`, `end_offset` (97% null, speculative)
- `content_hash` (superseded by `content_sha256`)
- `pipeline_version` (97.5% null — move to `document_processing_state`)
- `ingestion_run_id` (move to `document_processing_state`)
- `unredacted_span_json` (move to `redaction_spans`)
- `unredaction_baseline_vocab`, `unredaction_attempted`, `unredaction_succeeded`, `unredacted_text_gain`, `redaction_coverage_before`, `redaction_coverage_after` (move to `document_processing_state` or `redaction_spans`)

New child table:

```
document_processing_state:
  document_id         bigint PK REFERENCES documents(id)
  processing_status   text DEFAULT 'pending'
  processing_error    text
  processing_attempts integer DEFAULT 0
  worker_id           text
  lease_expires_at    timestamptz
  last_processed_at   timestamptz
  analyzed_at         timestamptz
  pipeline_version    text
  ingestion_run_id    text
```

---

### `global_timeline_events` table (target → rename to `timeline_events`)

```
timeline_events:                              -- renamed from global_timeline_events
  id                  bigint PK
  title               text NOT NULL
  date                date NOT NULL
  description         text
  type                text
  significance        text
  related_document_id bigint REFERENCES documents(id)
  source              text
  created_at          timestamptz DEFAULT now()
  -- Remove 'entities' text column

timeline_event_entities:                      -- new junction table
  event_id   bigint REFERENCES timeline_events(id)
  entity_id  bigint REFERENCES entities(id)
  PRIMARY KEY (event_id, entity_id)
```

Drop old `timeline_events` (0 rows) and recreate with this schema.

---

### Rename `relations` → `extracted_entity_triples`

```
extracted_entity_triples:                     -- renamed from relations
  id                  text PK
  subject_entity_id   bigint REFERENCES entities(id)
  object_entity_id    bigint REFERENCES entities(id)
  predicate           text
  direction           text
  weight              real
  first_seen_at       timestamptz
  last_seen_at        timestamptz
  status              text

entity_triple_evidence:                       -- renamed from relation_evidence
  relation_id         text REFERENCES extracted_entity_triples(id)
  document_id         bigint REFERENCES documents(id)
  span_id             text REFERENCES document_spans(id)
```

---

### `entity_relationships` table (keep, rename to `entity_graph_edges`)

```
entity_graph_edges:                           -- renamed from entity_relationships
  source_entity_id   bigint NOT NULL REFERENCES entities(id)
  target_entity_id   bigint NOT NULL REFERENCES entities(id)
  relationship_type  text NOT NULL
  strength           real
  confidence         real
  proximity_score    real
  risk_score         real
  first_seen_at      timestamptz
  last_seen_at       timestamptz
  evidence_pack_json jsonb
  was_agentic        integer DEFAULT 0
  signal_ids         bigint[]
  created_at         timestamptz DEFAULT now()
  updated_at         timestamptz DEFAULT now()
  PRIMARY KEY (source_entity_id, target_entity_id, relationship_type)
```

---

### `palm_beach_properties` → `properties`

No column changes — just rename.

---

### `investigation_evidence` (fix bifurcated FK)

```
investigation_evidence:
  id               bigint PK
  investigation_id bigint NOT NULL REFERENCES investigations(id)
  document_id      bigint NOT NULL REFERENCES documents(id)  -- canonical
  added_by         text
  added_at         timestamptz DEFAULT now()
  notes            text
  relevance        text
  -- DROP evidence_id (reference to legacy 11-row evidence table)
```

---

### Tables to DROP

| Table                   | Reason                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `mentions`              | 0 rows, superseded by `entity_mentions`                                                         |
| `timeline_events` (old) | 0 rows, superseded; name reused for `global_timeline_events`                                    |
| `media_assets`          | 0 rows, never used                                                                              |
| `evidence_entity`       | 0 rows, never populated                                                                         |
| `resolution_candidates` | 0 rows, depends on `mentions` (also 0 rows)                                                     |
| `evidence`              | 11 rows — after data migration to `documents`                                                   |
| `chain_of_custody`      | References `evidence` — drop when `evidence` is dropped                                         |
| `evidence_chain_items`  | References `evidence` + `investigations` — reassign or drop                                     |
| `hypothesis_evidence`   | References `evidence` (hypotheses reference evidence, not documents) — update FK to `documents` |

---

### New tables needed

| Table                       | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `document_processing_state` | Extract 9 pipeline columns from `documents`              |
| `timeline_event_entities`   | Replace text `entities` column on timeline events        |
| `entity_aliases`            | If `aliases` needs to be populated — properly normalised |

---

### `financial_transactions` — add entity ID FKs

```
financial_transactions:
  -- existing columns ...
  from_entity      text              -- keep for display
  to_entity        text              -- keep for display
  from_entity_id   bigint REFERENCES entities(id) NULL  -- NEW
  to_entity_id     bigint REFERENCES entities(id) NULL  -- NEW
```

---

### Dead columns to DROP (by table)

| Table              | Columns to drop                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `documents`        | `source_original_url`, `source_url`, `source_acquisition_method`, `start_offset`, `end_offset`, `content_hash` |
| `entities`         | `type` (after resolving conflict with `entity_type`)                                                           |
| `articles`         | `url`, `published_date`                                                                                        |
| `forensic_signals` | Rename `source_source` → `source_type`                                                                         |

---

### Index cleanup

Remove these duplicate indexes (identified by agent audit):

- Duplicate on `documents(source_collection)`
- Duplicate on `documents(file_path)`
- Duplicate on `entities(name)`
- Duplicate on `flight_passengers(entity_id)`
- Duplicate on `forensic_signals(entity_id)`
- Duplicate on `pipeline_runs(status)`
- Duplicate on `investigation_leads(investigation_id)`
- Duplicate on `boilerplate_phrases(phrase_hash)`
- `gin` trigram index on `entities.aliases` (99.94% null — wasted)

---

## Summary of Changes

| Category                  | Count |
| ------------------------- | ----- |
| Tables to DROP            | 8     |
| Tables to RENAME          | 5     |
| New tables to CREATE      | 3     |
| Columns to DROP           | ~20   |
| Columns to RENAME         | 2     |
| Duplicate indexes to DROP | 9     |
| FK type mismatches to fix | 3     |
| Missing FKs to add        | 5     |
