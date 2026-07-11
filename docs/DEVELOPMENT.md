# Development Guide

## Prerequisites

- Node.js 20+ and pnpm
- Rust and the Tauri prerequisites
- A local development environment with access to the repository

## Setup

```bash
pnpm install
```

## Run locally

### Web app

```bash
pnpm dev
```

### Desktop app

```bash
pnpm dev:desktop
```

## Build

```bash
pnpm build
pnpm build:desktop
```

## Suggested workflow

1. Create a focused branch for each change.
2. Keep frontend and Rust/backend changes scoped and documented.
3. Verify UI behavior and relevant build steps before opening a pull request.
4. Update documentation when the workflow, architecture, or user behavior changes.

## Notes

- The project uses a Tauri + React + Rust architecture.
- Database changes should be documented in [database-architecture.md](database-architecture.md).
- Keep feature work modular to reduce regressions.
