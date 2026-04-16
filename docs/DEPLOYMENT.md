# Deployment

Quarter Tone is deployed to [Vercel](https://vercel.com) via GitHub Actions.

| Trigger                | Workflow                                  | Environment             |
| ---------------------- | ----------------------------------------- | ----------------------- |
| Push to `main`         | `.github/workflows/deploy-production.yml` | production              |
| Pull request to `main` | `.github/workflows/deploy-preview.yml`    | preview                 |
| Push / PR              | `.github/workflows/ci.yml`                | tests, typecheck, build |

The Vercel build is configured by `vercel.json` at the repo root. The site is
served as static assets (`index.html` plus the `@quarter-tone/core` build
output), so no server runtime is required.

## One-time setup

### 1. Create the Vercel project

```bash
npm i -g vercel
vercel link            # link this directory to a Vercel project
```

This creates a `.vercel/` folder locally — keep it out of git (already covered
by `.vercel` in `.gitignore` if missing, otherwise add it).

### 2. Disable Vercel's Git integration auto-deploys

GitHub Actions drives all deploys, so disable Vercel's automatic Git deploys
in **Project Settings → Git** to avoid double-deployment. The
`"github": { "silent": true }` flag in `vercel.json` also silences the Vercel
bot's PR comments (the workflow posts its own).

### 3. Add repository secrets

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Secret              | Where to find it                                         |
| ------------------- | -------------------------------------------------------- |
| `VERCEL_TOKEN`      | Vercel → Account Settings → Tokens (scope: full account) |
| `VERCEL_ORG_ID`     | `.vercel/project.json` → `orgId`                         |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → `projectId`                     |

### 4. (Optional) Create a `production` environment

In **GitHub → Settings → Environments → New environment → `production`**
to gate prod deploys behind required reviewers / wait timers. The
production workflow already binds to `environment: production`.

## Custom domain

1. **Add the domain in Vercel** — Project → Settings → Domains → Add
   (e.g. `quarter-tone.app` and `www.quarter-tone.app`).
2. **Configure DNS** at your registrar:
   - Apex (`quarter-tone.app`): `A` record → `76.76.21.21`
   - Subdomain (`www`): `CNAME` → `cname.vercel-dns.com`
3. **Pick a primary** — in Vercel, mark one as primary; the other will
   308-redirect to it.
4. **TLS** is provisioned automatically by Vercel once DNS resolves.
5. **Preview domains** — every PR gets a unique
   `quarter-tone-git-<branch>-<scope>.vercel.app` URL, posted as a PR comment
   by the preview workflow.

## Rollback

From the Vercel dashboard: **Deployments → pick a previous successful prod
deployment → Promote to Production**. Or via CLI:

```bash
vercel rollback <deployment-url> --token=$VERCEL_TOKEN
```
