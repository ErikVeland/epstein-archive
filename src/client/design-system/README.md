# Design System

This folder is the only place where client UI primitives may depend directly on Radix or Lucide.

## Structure

- `tokens/`: typed token exports that mirror CSS custom properties
- `components/`: primitives such as `Button`, `Surface`, `Badge`, `Icon`, and Radix wrappers
- `patterns/`: shared composites such as `Toolbar`, `FilterBar`, and `StatusBanner`
- `lib/`: composition helpers like `cn()` and variant utilities

## Wrapper conventions

- Use `forwardRef` for every exported component
- Support `asChild` where composition matters
- Prefer semantic `variant` and `tone` props over raw class names
- Expose `data-slot`, `data-variant`, `data-size`, `data-tone`, and native Radix state hooks where relevant
- Keep wrappers token-driven; no page-level CSS dependencies except shared design-system-owned utility classes
- Feature code should import from `@design-system`, not from Radix, Lucide, `index.css`, or `styles/designSystem`

## Migration guidance

- Add new primitives here first
- Move shared feature composites into `patterns/` once they are reused across domains
- Only shrink `src/client/index.css` after all consumers of a utility have been migrated
