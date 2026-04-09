# User Journey Mapping

Understanding how investigators utilize the platform informs our architecture.

## Primary Persona: The Forensic Analyst

**Objective**: To correlate dense timeline data and flight logs against court documents.

**The Workflow:**

1. **Scope Initialization**: The analyst creates a structured "Investigation Track" (e.g. mapping flight logs from 2008 to 2010).
2. **Entity Collation**: The analyst uses the global search and `SubjectDossierPanel` to fetch potential participants.
3. **Workspace Marshalling**: The analyst binds DOJ documents as Evidence to the workspace and assigns hypothesis labels.
4. **Algorithmic Review**: The analyst activates the **CommunicationAnalysis** and **ForensicDocumentAnalyzer** to find hidden network linkages.
5. **Report Generation**: The analyst finalizes their findings into an `Evidence Packet` for external legal/journalistic review.

## UX Principles

- **Information Density over Negative Space**: Investigators need to look at dense data. The "Liquid Glass" system provides a high signal-to-noise ratio.
- **Non-Destructive Workflows**: Analysis logic and hypotheses are never deleted outright, just versions.
