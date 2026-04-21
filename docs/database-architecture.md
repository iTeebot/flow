# Teebot Flow SQLite Architecture (Future-Proof)

## Design Goals
- Multi-tenant ownership by `company_profiles`.
- Strong local-first SQLite behavior for desktop reliability.
- Cloud-sync-ready records using deterministic external IDs and sync metadata.
- Soft-delete support for conflict-safe replication.

## Core Tables

### `company_profiles`
- `id` INTEGER PK (local surrogate key)
- `external_id` TEXT UNIQUE (cloud-safe identity)
- `company_name` TEXT NOT NULL
- `tax_registration_number` TEXT NULL
- `owner_name`, `email`, `phone`, `address` TEXT NULL
- `sync_status` TEXT NOT NULL DEFAULT `local_only`
- `sync_version` INTEGER NOT NULL DEFAULT `1`
- `last_synced_at` TEXT NULL
- `deleted_at` TEXT NULL
- `created_at` TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP

### `products`
- `id` INTEGER PK
- `external_id` TEXT UNIQUE
- `company_id` INTEGER (tenant owner)
- `name`, `sku` TEXT NOT NULL
- `stock_qty` INTEGER NOT NULL
- `price` REAL NOT NULL
- `sync_status`, `sync_version`, `last_synced_at`, `deleted_at`, `created_at`

### `customers` (buyer records)
- `id` INTEGER PK
- `external_id` TEXT UNIQUE
- `company_id` INTEGER (tenant owner)
- `name` TEXT NOT NULL
- `tax_registration_number` TEXT NULL (buyer tax registration)
- `phone`, `address` TEXT NULL
- `sync_status`, `sync_version`, `last_synced_at`, `deleted_at`, `created_at`

### `delivery_challans`
- `id` INTEGER PK
- `external_id` TEXT UNIQUE
- `dc_number` TEXT UNIQUE
- `company_id` INTEGER (issuer company)
- `customer_id` INTEGER NOT NULL (buyer)
- `sync_status`, `sync_version`, `last_synced_at`, `deleted_at`, `created_at`

### `dc_items`
- `id` INTEGER PK
- `external_id` TEXT UNIQUE
- `dc_id` INTEGER NOT NULL
- `product_id` INTEGER NOT NULL
- `quantity` INTEGER NOT NULL
- `rate` REAL NOT NULL
- `sync_status`, `sync_version`, `last_synced_at`, `deleted_at`, `created_at`

## Isolation + Ownership Rules
- Every business row is scoped to one `company_id`.
- Delivery challan creation validates that `customer_id` and all `product_id`s belong to the same company.
- Stock deduction happens only in that company scope and inside one transaction.

## Cloud Sync Compatibility (MongoDB later)
- Use `external_id` as canonical cross-database ID.
- Keep local `id` for SQLite performance and FK ergonomics.
- Sync engine can map:
  - SQLite `external_id` <-> Mongo `_id` (or separate unique `externalId`)
  - SQLite `sync_version` for optimistic conflict checks
  - `deleted_at` for tombstone replication

## Suggested Next Hardening
- Add `(company_id, sku)` unique index migration for per-tenant SKU uniqueness.
- Add audit fields (`created_by_user_id`, `updated_by_user_id`) once auth/users module is introduced.
- Add outbox table (`sync_outbox`) for resilient push-to-cloud sync retries.
