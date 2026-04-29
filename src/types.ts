// Shared type exports for both server and client.
//
// The client keeps its canonical type definitions in `src/client/types.ts`.
// Server code imports these via `src/types.ts` to avoid reaching into client paths.
export * from './client/types';
