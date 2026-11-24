# Instructions for AI agents

Project-specific rules for this repository (read by Claude Code via `CLAUDE.md`, GitHub Copilot, Codex and other tools following the AGENTS.md convention).

## Changelog and release notes

- **Do not write a changelog.** There is no `CHANGELOG.md` and none should be created or updated.
- Release notes are generated from the commit messages since the previous tag (`scripts/release-notes.mjs`, run by the `Release` workflow on a `v*` tag). The commit messages are the changelog.
- Therefore write commit messages in [Conventional Commits](https://www.conventionalcommits.org/) form (`feat(menu): …`, `fix(security): …`, `docs: …`, `chore(deps): …`, `!` for breaking changes) with a subject that makes sense to a reader of the release notes.

## Other project facts

- Releasing is documented in `pages/development.md`; bump the CDN version tag in `pages/quick-start.md` on each release.
- `assets/vendor/` is generated (`npm run vendor`), never edit it by hand.
- Tests: `npm test` (no dependencies needed).
