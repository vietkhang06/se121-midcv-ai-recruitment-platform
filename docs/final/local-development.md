# Local Development Guide (`docs/final/local-development.md`)

## 1. Prerequisites
Before running the local environment, verify the following dependencies:
- **Operating System**: Windows 10 / 11 (PowerShell 5.1+ or PowerShell 7+)
- **Docker Desktop**: Installed and running (WSL 2 or Hyper-V backend)
- **Java Runtime**: **Java 21 LTS** (`java --version` / `where java`). Note: `JAVA_HOME` is optional when `java.exe` is available through system `PATH`.
- **Build Tools**: Apache Maven 3.8+ (`mvn -v`)
- **Python**: Python 3.11 (`python --version`)
- **Node.js & npm**: Node.js 20+ (`node -v`, `npm -v`)

---

## 2. One-Click Startup (Recommended)
Double-click `start-dev.bat` in the project root directory, or run via PowerShell:

```powershell
.\start-dev.bat
```

### Automated Startup Flow
1. **Prerequisite Check**: Validates Docker Desktop, Java 21 LTS (via `where java` and `java --version`), Maven, Python, and Node environment.
2. **Database Launch**: Executes `docker compose up -d` and polls PostgreSQL + Pgvector health check (`airecruit-postgres-pgvector` container).
3. **Backend Service**: Opens dedicated terminal window `"AI Recruitment - Backend"`, starts Spring Boot (`mvn spring-boot:run`), automatically applies Flyway migrations (`v1`, `v2`, `v3`), and waits for readiness on port `8080`.
4. **AI Worker Service**: Opens dedicated terminal window `"AI Recruitment - AI Worker"`, activates Python environment, launches FastAPI (`uvicorn app.main:app --port 8000`), and waits for health check (`/api/v1/health`).
5. **Frontend Web App**: Opens dedicated terminal window `"AI Recruitment - Frontend"`, launches Next.js (`npm run dev`), and waits for HTTP readiness on port `3000`.
6. **Browser Launch**: Automatically opens `http://localhost:3000` in the default web browser.

---

## 3. One-Click Utilities & Management

### Checking Local Status
Double-click `status-dev.bat` or run:
```powershell
.\status-dev.bat
```
Displays real-time status (`READY`, `NOT READY`, `NOT RUNNING`) for PostgreSQL, Backend, AI Worker, and Frontend.

### Stopping All Local Services
Double-click `stop-dev.bat` or run:
```powershell
.\stop-dev.bat
```
Stops Frontend (3000), AI Worker (8000), Backend (8080) processes and executes `docker compose stop`. **Database volumes and stored records remain completely safe.**

### Resetting Local Database
Double-click `reset-db-dev.bat` or run:
```powershell
.\reset-db-dev.bat
```
> [!WARNING]
> **This will delete all local PostgreSQL database volumes and data.**
> Requires explicit `Y/N` confirmation before executing `docker compose down -v`.

---

## 4. Manual Startup Commands (Debugging Fallback)

If manual execution is required for debugging:

### 1. Database (Docker)
```bash
docker compose up -d
```

### 2. Spring Boot Backend
```bash
cd backend
mvn spring-boot:run
```

### 3. Python AI Worker
```bash
cd ai-worker
# Windows PowerShell
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --port 8000 --reload
```

### 4. Next.js Frontend
```bash
cd frontend
npm run dev
```

---

## 5. System Ports & Endpoints Reference

| Service | Host Port | Protocol | Readiness Check Endpoint |
|---|---|---|---|
| **PostgreSQL + Pgvector** | `5432` | TCP | `pg_isready -U postgres -d airecruit_db` |
| **Spring Boot Backend** | `8080` | HTTP | `http://localhost:8080/api/v1/jobs` |
| **AI Worker** | `8000` | HTTP | `http://localhost:8000/internal/ai/health` |
| **Next.js Frontend** | `3000` | HTTP | `http://localhost:3000` |

---

## 6. Troubleshooting

### 1. Docker Desktop Not Running
**Error**: `Docker Desktop is not running.`  
**Fix**: Open Docker Desktop app on Windows and wait until engine status reports "Engine running".

### 2. Java Version Mismatch
**Error**: `Java 21 is required by this project.`  
**Fix**: Ensure Java 21 LTS is installed and `java.exe` is in `PATH`. `JAVA_HOME` is optional; if set, it will be validated.

### 3. Port Occupied
**Error**: `Port 8080 is already in use.`  
**Fix**: Run `.\status-dev.bat` to check if a project process is already running, or run `.\stop-dev.bat` to clear previous instances.
