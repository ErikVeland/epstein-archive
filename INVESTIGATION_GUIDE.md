# Investigation System Guide

## Overview

The **Investigation System** is the core collaborative workspace of the Epstein Archive. It allows researchers to move from passive viewing to active analysis by organizing entities, documents, and other evidence into coherent cases.

## 🚀 Quick Start

1.  Navigate to **"Investigations"** in the main menu.
2.  Click **"New Investigation"**.
3.  Enter a **Title** and a **Hypothesis** (what you are trying to prove).
4.  Browse the archive. When you find relevant items (Person, Document, Flight), click the **"Add to Investigation"** button.

## 🏗️ Architecture

The system is built around a central Context Provider that manages state and API sync.

```mermaid
graph TD
    User[User / Researcher]

    subgraph Core[Frontend Core]
        Context[InvestigationsContext<br/>(State Management)]
        Router[React Router]
    end

    subgraph Workspace[Investigation Workspace]
        Container[InvestigationWorkspace.tsx<br/>(Main Layout)]

        Board[InvestigationBoard.tsx<br/>(Visual Canvas)]
        Evidence[InvestigationEvidencePanel.tsx<br/>(Right Sidebar)]
        Timeline[InvestigationTimelineBuilder.tsx<br/>(Chronological View)]
        Feed[InvestigationActivityFeed.tsx<br/>(Audit Log)]
    end

    subgraph Tools[Analysis Tools]
        Forensic[ForensicAnalysisWorkspace.tsx]
        Correlation[MultiSourceCorrelationEngine.tsx]
        Hypothesis[HypothesisTestingFramework.tsx]
    end

    User -->|Creates| Context
    Context -->|hydrates| Container
    Container --> Board
    Container --> Evidence
    Container --> Timeline

    Evidence --"Drag & Drop"--> Board
    Board --"Links to"--> Tools

    click Context "https://github.com/ErikVeland/epstein-archive/blob/main/src/contexts/InvestigationsContext.tsx"
    click Container "https://github.com/ErikVeland/epstein-archive/blob/main/src/client/components/investigation/InvestigationWorkspace.tsx"
```

## 🧩 Key Components

### 1. The Workspace (`InvestigationWorkspace.tsx`)

The main container. It manages the layout and switches between views (Board, Timeline, Graph). It listens for global events like `investigation-item-added`.

### 2. Evidence Panel (`InvestigationEvidencePanel.tsx`)

Located on the right. It lists all items "pinned" to the investigation.

- **Function**: Draggable source for the board.
- **Features**: Filtering by type (Entity, Document, Media), relevance scoring.

### 3. Infinite Board (`InvestigationBoard.tsx`)

A 2D canvas where researchers can spatially organize evidence.

- **Nodes**: Cards representing entities/docs.
- **Edges**: User-created connections between nodes.

### 4. Forensic Tools (`ForensicAnalysisWorkspace.tsx`)

Advanced tools for deep diving into specific documents. Allows annotation and OCR verification within the investigation context.

## 🔄 Data Flow

1.  **Selection**: User finds an item (e.g., "Ghislaine Maxwell" entity card).
2.  **Dispatch**: `addToInvestigation(id, item, relevance)` is called via Context.
3.  **Persist**: Item is saved to DB via API (`POST /api/investigations/:id/evidence`).
4.  **Broadcast**: `CustomEvent('investigation-item-added')` triggers UI updates.
5.  **Visualization**: Item appears in the Evidence Panel, ready to be placed on the Board.

## 🛠️ Extending the System

To add a new tool to the investigation workspace:

1.  Create your component in `src/components/investigation/`.
2.  Register it in the tab switcher in `InvestigationWorkspace.tsx`.
3.  Use `useInvestigations()` hook to access current case data.
