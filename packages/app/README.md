# @quarter-tone/app

Vite + React + TypeScript front-end for the [Quarter Tone](../../README.md)
arcade cabinet. Hosts the cabinet UI, game canvas, and all browser-facing
concerns (Tone.js audio wiring, input, HUD). Runtime game and music logic is
imported from [`@quarter-tone/core`](../core).

## Scripts

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Start the Vite dev server with HMR.         |
| `npm run build`     | Type-check and produce a production bundle. |
| `npm run preview`   | Preview the production build locally.       |
| `npm run lint`      | Lint `.ts`/`.tsx` sources with ESLint.      |
| `npm run typecheck` | Run `tsc --noEmit` against the app sources. |

## Path aliases

| Alias     | Resolves to                           |
| --------- | ------------------------------------- |
| `@/*`     | `packages/app/src/*`                  |
| `@app/*`  | `packages/app/src/*`                  |
| `@core/*` | `packages/core/src/*` (direct access) |

`@quarter-tone/core` is also available as an ordinary workspace import and is
the preferred way to consume the core package.
