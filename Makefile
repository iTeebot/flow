.PHONY: all help format-check clippy test frontend-build desktop-build ci-local

# Default target runs all checks
all: ci-local

help:
	@echo "Available make targets for local CI verification:"
	@echo "  make ci-local       - Run all CI verification checks locally (format, clippy, tests, frontend, desktop)"
	@echo "  make format-check   - Verify Rust code formatting (cargo fmt --check)"
	@echo "  make clippy         - Run Rust linter (cargo clippy -D warnings)"
	@echo "  make test           - Run Rust backend unit tests (cargo test)"
	@echo "  make frontend-build - Install dependencies and verify frontend build & typecheck"
	@echo "  make desktop-build  - Verify Tauri desktop app build compiles (--no-bundle)"

ci-local: format-check clippy test frontend-build desktop-build
	@echo ""
	@echo "============================================="
	@echo "🎉 All local CI checks passed successfully! 🎉"
	@echo "============================================="

format-check:
	@echo ""
	@echo "--- [1/5] Running Rust Format Check ---"
	cargo fmt --manifest-path src-tauri/Cargo.toml -- --check

clippy:
	@echo ""
	@echo "--- [2/5] Running Rust Clippy Check ---"
	cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

test:
	@echo ""
	@echo "--- [3/5] Running Backend Tests ---"
	cargo test --manifest-path src-tauri/Cargo.toml

frontend-build:
	@echo ""
	@echo "--- [4/5] Installing Frontend Deps and Building ---"
	pnpm install --frozen-lockfile
	pnpm run build

desktop-build:
	@echo ""
	@echo "--- [5/5] Building Tauri Desktop App Check ---"
	pnpm tauri build --no-bundle
