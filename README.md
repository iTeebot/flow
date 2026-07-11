# 🌊 Teebot Flow

**Teebot Flow** is a high-performance, professional Desktop ERP solution designed for modern business operations. Built with a focus on speed, reliability, and ease of use, it leverages the power of **Tauri** and **Rust** to provide a secure, offline-first desktop experience.

Teebot Flow is now open for public collaboration. The project is released under **AGPL-3.0**, and contributions, issue reports, and pull requests are welcome.

---

## 🤝 Open Source & Contribution

- **License**: [LICENSE](LICENSE)
- **Contributing guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Code of conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- **Security policy**: [SECURITY.md](SECURITY.md)
- **Documentation index**: [docs/README.md](docs/README.md)

---

## 🚀 Key Features

-   **📦 Inventory Management**: Track stock levels with real-time updates.
-   **📄 Delivery Challan System**: Streamlined flow for creating and managing delivery challans.
-   **👥 Customer Management**: Organize customer data and transaction history.
-   **📊 Dashboard KPIs**: Visual insights into business performance.
-   **🖨️ PDF & Export**: Professional report generation and printing capabilities.

---

## 🛠️ Tech Stack

| Layer          | Technology                                                                                                                                                             |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**   | [React 19](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite 7](https://vitejs.dev/)                                                         |
| **Styling**    | [Tailwind CSS 4](https://tailwindcss.com/)                                                                                                                            |
| **State**      | [Zustand](https://github.com/pmndrs/zustand)                                                                                                                           |
| **Backend**    | [Rust](https://www.rust-lang.org/) (via [Tauri 2.0](https://tauri.app/))                                                                                                 |
| **Database**   | [SQLite](https://www.sqlite.org/) (Local Storage)                                                                                                                      |
| **UI Icons**   | [Lucide React](https://lucide.dev/)                                                                                                                                    |
| **Charts**     | [Recharts](https://recharts.org/)                                                                                                                                      |

---

## 📐 System Architecture

### 1. System Context Diagram
Below is the high-level overview of how Teebot Flow interacts with the local system and the user.

```mermaid
flowchart TD
    A["User (Admin / Staff)"] --> B["React Frontend UI"]
    B --> C["Tauri Invoke Bridge"]
    C --> D["Rust Backend Commands"]

    D --> D1["Validation Layer"]
    D --> D2["Business Logic Layer"]

    D1 --> E[("SQLite Database")]
    D2 --> E

    D --> F["File System Storage"]
    D --> G["PDF / Report Generator"]

    E --> D
    F --> D
    G --> B

    B --> H["State Management<br/>Zustand"]
    H --> B
```

### 2. Core Application Flow
The bridge between the modern web frontend and the high-performance Rust backend.

```mermaid
sequenceDiagram
    participant UI as React UI
    participant Bridge as Tauri IPC
    participant Rust as Rust Command Layer
    participant DB as SQLite Database

    UI->>Bridge: Invoke Command (e.g., create_dc)
    Bridge->>Rust: Pass Data
    Rust->>Rust: Validate & Process
    Rust->>DB: Read/Write Data
    DB-->>Rust: Confirmation/Result
    Rust-->>Bridge: Processed Result
    Bridge-->>UI: Update State
```

---

## 📦 Module Workflow: Delivery Challan

The core workflow for the ERP's Delivery Challan (DC) module.

```mermaid
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
```

---

## 🗄️ Data Model (ER Diagram)

Our relational structure ensures data integrity and supports complex business logic. For more technical details on the database design and cloud-sync strategies, see the [Database Architecture Documentation](docs/database-architecture.md).

```mermaid
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
```

---

## 🏗️ Folder Structure

```text
teebot-flow/
├── src-tauri/             # Rust Backend (Commands, Database Logic)
├── src/                   # React Frontend
│   ├── components/        # Reusable UI Components
│   ├── modules/           # Feature-based Modules (DC, Inventory, etc.)
│   ├── store/             # Zustand State Stores
│   └── types/             # TypeScript Interfaces
├── public/                # Static Assets
└── package.json           # Frontend Dependencies & Scripts
```

---

## 🛠️ Development Setup

### Prerequisites
-   [Node.js](https://nodejs.org/) (LTS recommended)
-   [Rust](https://www.rust-lang.org/tools/install)
-   Tauri Dependencies (refer to [Tauri Setup Guide](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Run Locally
Launch the application in development mode:
```bash
pnpm dev:desktop
```

### Build
Generate the web build or production desktop binary:
```bash
pnpm build
pnpm build:desktop
```

---

## 🛡️ Best Practices & Guidelines

-   **Database First**: Always design and migrate the DB before implementing UI changes.
-   **Logic Separation**: Keep heavy business logic in Rust; UI remains thin and reactive.
-   **Isolation**: Features should be modular to prevent regression.
-   **Security**: Validate all inputs at the Rust layer, even if validated in the frontend.

---
© 2026 Teebot Flow. Licensed under AGPL-3.0.
