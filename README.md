# Flow:

## 1.System Context Diagram

                ┌───────────────────────┐
                │     User (Admin)      │
                └──────────┬────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │      Teeebot Flow Desktop       │
        │   (Tauri + React Application)   │
        └──────────┬──────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌──────────┐  ┌────────────┐
│ SQLite  │  │ File Sys │  │ PDF Export │
│ Database│  │ Storage  │  │ / Reports  │
└─────────┘  └──────────┘  └────────────┘

## 2.Core Application Flow

React UI (Form / Button)
        │
        ▼
Tauri Invoke (IPC Bridge)
        │
        ▼
Rust Command Layer
        │
        ├── Validation
        ├── Business Logic
        ▼
SQLite Database (Read/Write)
        │
        ▼
Response Back to UI
        │
        ▼
UI Updates (State Store)

## 3.Delivery Challan Flow

User opens "Create Delivery Challan"
            │
            ▼
Select Customer
            │
            ▼
Add Items (Inventory)
            │
            ▼
Frontend validates form
            │
            ▼
Invoke: create_dc()
            │
            ▼
Rust:
 ├─ Generate DC Number
 ├─ Check stock
 ├─ Save DC + Items
            │
            ▼
SQLite Stores Data
            │
            ▼
Return DC ID + Number
            │
            ▼
UI shows success + Print option
            │
            ▼
PDF Generator (optional step)

## 4.Database Relationship Diagram

Customers
   │
   ├──< Delivery Challans >──┐
   │                         │
   │                    DC Items
   │                         │
Products / Inventory ───────┘

Invoices (future) ← linked from DC

## 5.Module Architecture Diagram

Teeebot Flow

Frontend Modules:
 ├── Dashboard
 ├── Delivery Challan
 ├── Inventory
 ├── Customers
 ├── Reports

Backend Commands:
 ├── dc.rs
 ├── inventory.rs
 ├── customers.rs

Shared Layer:
 ├── types
 ├── utils

## 6.Build Order

### STEP 1 (Foundation)
    Setup Tauri project
    React layout (sidebar + routing)
    Zustand store
### STEP 2 (Database Foundation)
    SQLite setup
    Customers table
    Products table
### STEP 3 (First Real Feature)
    Delivery Challan module
    Create DC flow
    Save to DB
### STEP 4 (Business Layer)
    Inventory stock update
    DC item linking
### STEP 5 (Output Layer)
    PDF export
    Print view
### STEP 6 (Scaling)
    Invoices
    Reports
    Dashboard KPIs

## 7. What NOT to do (important)

Avoid these early mistakes:

    Don’t start UI without DB design
    Don’t build invoices before DC
    Don’t add cloud sync early
    Don’t mix frontend logic with Rust logic
    Don’t skip module isolation

# Architecture Digarams

## 1. System Architecture

flowchart TD

A[User (Admin / Staff)] --> B[React Frontend UI]

B --> C[Tauri Invoke Bridge]

C --> D[Rust Backend Commands]

D --> D1[Validation Layer]
D --> D2[Business Logic Layer]

D1 --> E[(SQLite Database)]
D2 --> E

D --> F[File System Storage]
D --> G[PDF / Report Generator]

E --> D
F --> D
G --> B

B --> H[State Management<br/>Zustand]

H --> B

# 2. Delivery Challan Flow (Core ERP Module)

flowchart TD

A[Open Create Delivery Challan Page] --> B[Select Customer]
B --> C[Add Products / Items]
C --> D[Frontend Validation]

D --> E[Tauri Invoke: create_dc]

E --> F[Rust Command: dc.rs]

F --> G[Generate DC Number]
F --> H[Check Stock Levels]
F --> I[Save DC Header]
F --> J[Save DC Items]

G --> K[(SQLite DB)]
H --> K
I --> K
J --> K

K --> L[Return DC ID + Number]

L --> M[UI Success Screen]
M --> N[Print / PDF Export Option]

N --> O[PDF Generator Service]
O --> P[Saved File System]

# 3. Database Relationship Diagram (ER Style)

erDiagram

CUSTOMERS ||--o{ DELIVERY_CHALLANS : places
DELIVERY_CHALLANS ||--o{ DC_ITEMS : contains
PRODUCTS ||--o{ DC_ITEMS : included_in

CUSTOMERS {
  int id
  string name
  string phone
  string address
}

PRODUCTS {
  int id
  string name
  string sku
  int stock_qty
  float price
}

DELIVERY_CHALLANS {
  int id
  string dc_number
  int customer_id
  date created_at
}

DC_ITEMS {
  int id
  int dc_id
  int product_id
  int quantity
  float rate
}

# 4. Full Teeebot Flow Module Architecture

flowchart LR

subgraph FRONTEND [React Frontend]
A1[Dashboard]
A2[Delivery Challan]
A3[Inventory]
A4[Customers]
A5[Reports]
end

subgraph BRIDGE [Tauri Bridge]
B1[Invoke API Layer]
B2[Event System]
end

subgraph BACKEND [Rust Backend]
C1[dc.rs]
C2[inventory.rs]
C3[customers.rs]
C4[reports.rs]
end

subgraph DATA [Data Layer]
D1[(SQLite DB)]
D2[File Storage]
D3[PDF Engine]
end

A1 --> B1
A2 --> B1
A3 --> B1
A4 --> B1
A5 --> B1

B1 --> C1
B1 --> C2
B1 --> C3
B1 --> C4

C1 --> D1
C2 --> D1
C3 --> D1
C4 --> D1

C1 --> D2
C4 --> D3

D1 --> B1
D2 --> B1
D3 --> A1