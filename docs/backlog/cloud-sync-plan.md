# Cloud Sync Feature Plan

## Objective
Implement a "Cloud Sync" feature allowing users to backup and restore their local IndexedDB data (Interviews, Settings, Resumes) to a Neon PostgreSQL database. This feature includes strict security and rate-limiting measures.

## Architecture

### 1. Backend Layer (Serverless Functions)
Since the frontend is a client-side Vite application, we cannot securely store database credentials or perform IP-based rate limiting. We will introduce a lightweight serverless backend (compatible with Vercel/Netlify functions).

*   **Location**: `api/` directory (standard for Vercel/Next.js, adaptable for others).
*   **Runtime**: Node.js.
*   **Dependencies**: `pg` (or `@neondatabase/serverless`) for database connection.

### 2. Database Schema (Neon PostgreSQL)
We will use a minimal schema to store the encrypted/serialized data.

#### Table: `backups`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(16)` | `PRIMARY KEY` | User-provided or generated ID. Strict format: 16 alphanumeric characters, no special chars. (Layer 1 Security) |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Bcrypt hash of the user's password. Required for overwriting/updating data. (Layer 2 Security) |
| `data` | `JSONB` | `NOT NULL` | The complete export of the user's IndexedDB. |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMP` | `DEFAULT NOW()` | Last update timestamp. |
| `last_ip` | `VARCHAR(45)` | | IP address of the last uploader (for audit/rate limiting). |

#### Table: `rate_limits` (Optional but recommended for strict limiting without Redis)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `ip` | `VARCHAR(45)` | | Client IP address. |
| `action` | `VARCHAR(10)` | | 'upload' or 'download'. |
| `timestamp` | `TIMESTAMP` | `DEFAULT NOW()` | When the action occurred. |

### 3. API Endpoints

#### `POST /api/sync` (Upload / Update)
*   **Headers**: `x-sync-id` (The 16-char ID).
*   **Body**: JSON object containing `{ password: "...", data: { interviews: [], ... } }`.
*   **Logic**:
    1.  Validate ID format (16 chars, alphanumeric).
    2.  Check Rate Limit.
    3.  Check if record exists for `id`.
        *   **If Exists**: Verify provided `password` against stored `password_hash`.
            *   If Valid: Update `data`, `updated_at`, `last_ip`.
            *   If Invalid: Return 401 Unauthorized.
        *   **If New**: Hash `password` (bcrypt) and Insert new record (`id`, `password_hash`, `data`, `last_ip`).
    4.  Return success status.

#### `GET /api/sync?id=...` (Download)
*   **Query Param**: `id`
*   **Logic**:
    1.  Validate ID format.
    2.  Check Rate Limit.
    3.  Fetch `data` from `backups` table where `id` matches. (No password required for download, relying on ID complexity as Layer 1).
    4.  Return JSON data.

### 4. Frontend Implementation

#### Service: `src/services/syncService.ts`
*   **`exportData()`**: Fetches all records from Dexie tables (`interviews`, `userSettings`, `resumes`).
*   **`importData(data)`**: Clears current local DB (optional, or merges) and bulk adds the downloaded data.
*   **`uploadToCloud(id, password, data)`**: Calls `POST /api/sync` with password.
*   **`downloadFromCloud(id)`**: Calls `GET /api/sync`.

#### UI Components
*   **`CloudSyncModal`**: A dialog with two tabs:
    *   **Upload**: 
        *   ID Input (Read-only generated or Editable).
        *   **Password Input**: New field for Layer 2 security.
        *   Button "Sync to Cloud".
    *   **Download**: 
        *   Input field for 16-char ID. 
        *   Button "Restore from Cloud".
*   **Header Integration**: Add a "Cloud" icon button to `src/App.tsx` or the main layout to trigger the modal.

#### Validation
*   **ID Generator**: Function to generate a random 16-char alphanumeric string.
*   **ID Validator**: Regex `^[a-zA-Z0-9]{16}$`.

## Security & Rate Limiting
*   **IP Blocking**: The backend will extract the client IP (via `x-forwarded-for` or similar headers).
*   **Rate Limiting Strategy**:
    *   Simple: Query `rate_limits` table for count of records for this IP in the last hour.
    *   If count > Limit, return 429 Too Many Requests.
*   **Data Size**: Limit payload size to avoid abuse (e.g., 4MB limit).

## Implementation Steps
1.  **Setup Backend**: Initialize `api/` folder and install `pg`.
2.  **Database**: Create tables in Neon (provide SQL script).
3.  **Frontend Service**: Create `syncService` to handle Dexie export/import.
4.  **UI**: Create `CloudSyncModal` and connect it to the service.
5.  **Integration**: Add button to Header.
