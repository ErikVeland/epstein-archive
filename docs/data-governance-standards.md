# Data Governance & Custody Standards

Given the sensitive and forensic nature of the project's data, we enforce strict governance routines.

## 1. Provenance Integrity

- All extracted DOJ/court document rows MUST point to an immutable source hash.
- Entity extraction tools are strictly append-only or update-metadata only. Destructive schema alterations on base intelligence are prohibited.

## 2. Chain of Custody

When analysts attach a piece of evidence to the `InvestigationWorkspace`, an audit entry is generated.
Evidence packets exported from the system include cryptographic signatures validating that the data payload perfectly mirrors the database state at the moment of export (i.e. to prevent tampering).

## 3. Alias Normalization

Subjects with varying input strings (e.g., flight logs using "DV" or "dvycit") must be mapped algorithmically to canonical identifiers (e.g. Subject #405628, Vladislav Doronin) without deleting the original source trace.

## 4. UI Governance

Client features utilize `DataIntegrityPanel` elements to relay to investigators how complete the metadata coverage is, keeping analysis transparent and rigorous.
