# Liquid Glass Design System

This document is the living contract for the Epstein Archive design system. Tailwind retirement is complete, but design-system consolidation is still active. The design system now has one canonical implementation surface:

- `src/client/design-system/lib`

Deprecated compatibility surfaces may continue to exist temporarily during migration, but new UI work should not import from `src/client/components/ui/*` or rely on global presentation classes like `surface-glass-card`, `surface-glass`, `glass-panel`, `app-header-glass`, `control`, or `modal-header`.

## Principles

1. Cohesive: repeated UI concepts must be implemented once as primitives or patterns.
2. Intentional: visual choices should communicate hierarchy, risk, and context rather than decoration alone.
3. Usable: controls must feel predictable across pages, densities, and data-heavy workflows.
4. Accessible: keyboard support, focus visibility, semantics, and contrast are part of the component contract.
5. Extensible: a new “custom” widget should consume shared tokens, surfaces, inputs, and states before introducing any local styling.

## Runtime Token Source

`src/client/index.css` is the runtime source of truth for CSS custom properties.

- `src/designTokens.ts` is now a JS helper layer only.
- Design tokens must not be redefined in JS or injected into the document at runtime.
- New token work should prefer semantic names such as `--nav-flights`, `--risk-high`, and `--accent-warning` over raw palette literals.

## Component Layers

### Foundation primitives

- Layout: `Box`, `Flex`, `Stack`, `Grid`
- Surfaces: `Surface`
- Typography: `LqText`
- Actions: `Button`
- Forms: `TextInput`, `SearchField`, `Select`, `Textarea`, `Switch`
- Overlays: `Dialog`, `DropdownMenu`, `Tooltip`
- Feedback/navigation: `Badge`, `EmptyState`, `Pagination`

### Pattern components

Pattern components should be built on top of the foundation primitives and should own repeated product structures such as:

- page headers
- filter/search bars
- toolbars
- cards and result rows
- modal headers
- empty/loading/error states
- browser/viewer shells

### Feature-owned components

Feature-owned components are allowed when they encode domain behavior, but they must consume shared tokens and system primitives. They should not recreate generic controls, surfaces, form fields, or badges locally.

## Visual Direction

The system refines the existing Liquid Glass forensic aesthetic rather than replacing it.

- Surfaces should feel layered and calm, not noisy.
- Accent color should guide attention, not flood the interface.
- Dense investigative screens should preserve hierarchy through spacing, type, and surface strength.
- Motion should be restrained and informative.

## Accessibility Contract

Every reusable primitive should guarantee:

- visible `:focus-visible` treatment
- keyboard-operable interaction
- sensible `aria-*` semantics
- disabled and loading states
- no reliance on color alone for meaning
- readable contrast against glass surfaces

## Chart And Visualization Tokens

Visualizations remain feature-owned where necessary, but they must consume shared semantic chart tokens for:

- series colors
- risk/severity colors
- axis/grid styling
- hover and selection surfaces

Use `semanticChartTokens` from `src/client/design-system/lib`.

## Migration Rules

- New code imports from `src/client/design-system/lib`.
- If a feature needs a pattern more than once, promote it.
- CSS modules should mostly express composition and feature layout, not re-implement generic UI widgets.
- Exceptions belong in `scripts/design-system-exceptions.json` with owner, reason, and expiry.

## Apple HIG Design Standardization (High-Fidelity Guidelines)

To maintain a premium, state-of-the-art forensic aesthetic, our "Liquid Glass" interfaces adhere strictly to Apple's Human Interface Guidelines (HIG):

### 1. Typographic Alignment & Grids (No Centering)
- **Rule**: All textual content, metadata elements, action lists, and form inputs must be left-aligned (or right-aligned for numeric/status values in a row) to establish a strong, predictable reading axis.
- **Rule**: Avoid centering body text or metadata elements in cards, lists, or headers.

### 2. Apple Settings Row Pattern (Key-Value Lists)
- **Application**: Core metadata lists, settings panels, or key-value indices (such as those in `EvidenceDetail.tsx` or `ForensicDocumentAnalyzer.tsx`).
- **Structure**:
  - Housed in an elegant unified group card (`.appleSettingsGroup`) with subtle borders and standard spacing.
  - Rows are laid out horizontally using `Flex` containers: light uppercase labels on the left, primary values or badges on the right.

### 3. Badged Stack Row Items (Master-Detail Rows)
- **Application**: Related lists, entity lists, action feeds, search results, or anywhere hierarchical details are displayed.
- **Structure**:
  - A circular left-aligned icon badge (`.docIconBadge` or `.entityIconBadge`) with subtle background coloring and centered glyph.
  - A vertical stack on the right: primary label/title on top, subdued secondary label on the bottom (left-aligned).

### 4. Interactive Micro-animations
- Hover and active states on list items and buttons must use restrained, glassmorphic color-mix animations rather than aggressive color changes.

