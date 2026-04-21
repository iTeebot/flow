# Teebot Flow Engineering Rules

## Build Order (strict)
1. Inventory (products and stock)
2. Customers
3. Delivery Challan

Do not start invoices, reports, or cloud features before the above are stable.

## Module Isolation
- Keep each domain in its own module and file boundary.
- Backend domain logic must remain in Rust modules under `src-tauri/src/modules/`.
- Do not place business logic in React components.
- Shared concerns only go in shared layers (`db`, shared types, shared helpers).

## Frontend and Backend Boundaries
- Frontend calls Tauri commands only through invoke APIs.
- Rust owns validation, transactions, and DB writes for business entities.
- UI can validate basic form completeness but cannot replace backend validation.

## Database Discipline
- SQLite is the source of truth.
- Use transactions for multi-step writes (e.g., Delivery Challan + items + stock update).
- Keep schema relationships aligned with README ER design.

## What Not To Do
- Do not mix frontend logic with Rust logic.
- Do not skip module isolation.
- Do not add cloud sync early.
- Do not build invoices before Delivery Challan flow is stable.
