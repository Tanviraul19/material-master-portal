# Material Master Request & Approval Portal 🚀

An enterprise-grade Master Data Management (MDM) portal designed for SAP-standard material master workflows. Built with a high-performance React/Node.js stack and optimized for multi-role corporate environments.

---

## 💎 Core Capabilities

### 🛡️ Enterprise Governance
- **7-Stage Workflow**: Multi-level approvals from Plant Head to IT Final Approval.
- **Role-Based Access Control (RBAC)**: Distinct permissions for 12+ corporate roles.
- **Audit Trails**: Complete immutable history of every modification and approval.

### 🧠 Intelligent Data Management
- **Advanced Duplicate Detection**: Word-sorting algorithm prevents redundant SAP entries.
- **Auto-Valuation Mapping**: Standardized mapping of Material Types to Valuation Classes/Categories.
- **Real-time Validations**: Field-level validation ensures data fits SAP nomenclature (Length, UOM, etc.).

### 📊 Business Intelligence
- **Interactive Dashboards**: Powered by Recharts for real-time visualization of inventory traffic.
- **Secure Exports**: Export audit-ready data to **Premium Excel (.xlsx)** format.
- **Activity Feed**: Live timeline of workflow actions and collaborator comments.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Tailwind CSS, Framer Motion, Recharts |
| **Backend** | Node.js, Express, Sequelize ORM |
| **Database** | PostgreSQL (Schema Ready) / SQLite (Portable) |
| **Security** | JWT Authentication, Bcrypt Hashing, Role-Guards |

---

## 🚀 Rapid Setup Guide

### 1. Prerequisites
- Node.js (v18+)
- npm

### 2. Backend Initialization
```bash
cd backend
npm install
# Create .env file based on .env.example
npm run dev
```

### 3. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```

### 4. Sample Credentials (Seed Data)
| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | saurabh@enterprise.com | password123 |
| **Super Admin** | komal@enterprise.com | password123 |

---

## 📑 API Documentation (Key Endpoints)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Secure JWT Authentication |
| `GET` | `/api/requests` | Paginated Material List |
| `GET` | `/api/requests/check-duplicate` | Advanced Duplicate Search |
| `POST` | `/api/workflow/:id/approve` | Execute Next-Stage Workflow Action |
| `GET` | `/api/workflow/:id/history` | Fetch Audit Trail Timeline |
| `GET` | `/api/stats` | Business Intelligence Metrics |

---

## 🏗️ Deployment Architecture
The system is designed for **Docker** containerization and scale. For production:
1. Transition to the provided **PostgreSQL** schema in `/database/postgresql_schema.sql`.
2. Configure **Nginx** as a reverse proxy for the backend microservice.
3. Enable **SSL/TLS** for secure enterprise data transmission.

---

**Built with ❤️ for Enterprise Excellence 🏭**
