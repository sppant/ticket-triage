# Contributing

- Use Node from `.nvmrc`; run `npm ci` (and `npm ci --prefix web`).
- Before opening a PR: `npm run lint && npm run typecheck && npm test && npm run build`, and the same lint/typecheck/build in `web/`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/). If behavior changes, update `specs/` in the same commit.
- Tests must not need network, an API key or a running model; use the fake provider.
