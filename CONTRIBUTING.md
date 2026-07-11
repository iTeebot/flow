# Contributing to Teebot Flow

Thank you for your interest in improving Teebot Flow.

This project is open source and licensed under the GNU Affero General Public License v3.0. By contributing, you agree that your work will be distributed under the same license.

## Ways to contribute

- Report bugs and suggest improvements by opening an issue.
- Propose new features or UX improvements.
- Submit pull requests for fixes, refactors, tests, or documentation.
- Improve translations, examples, or developer docs.

## Before you start

- Read the project overview in [README.md](README.md).
- Review the architecture notes in [docs/database-architecture.md](docs/database-architecture.md).
- Follow the code of conduct in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Development workflow

1. Fork the repository and create a branch from the latest main/default branch.
2. Use a descriptive branch name such as `fix/Web0.0.5-2`, `feat/inventory-export`, or `docs/installation-guide`.
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run the app locally:
   ```bash
   pnpm dev:desktop
   ```
5. Make your changes and verify them with the relevant checks.

## Pull request expectations

- Keep changes focused and well-scoped.
- Include a clear summary of the problem and the solution.
- Add or update documentation when behavior changes.
- Reference any related issue numbers.
- Ensure the branch is up to date before requesting review.

## Review checklist

- The change is understandable and documented.
- The implementation does not introduce obvious regressions.
- The PR title clearly describes the work.
- The change respects the project’s AGPL licensing model.

## Questions?

Open a discussion or issue if you need help getting started.
