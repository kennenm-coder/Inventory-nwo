# ScanVault — Orca Scan Clone: Complete Project Plan

> **Purpose of this document:** This is a self-contained project plan for building a full Orca Scan clone. Any Claude Code session can pick up this document and know exactly what to build, how to build it, and in what order. Paste this into your project as `CLAUDE.md` or reference it at the start of each session.

---

## 1. PROJECT OVERVIEW

**Product Name:** ScanVault (working name — rename as desired)

**What it is:** A barcode scanning and inventory management platform with a mobile app (React Native), web dashboard (Next.js), and backend API (Node.js/Express + PostgreSQL). It mimics the complete Orca Scan feature set: spreadsheet-like inventory "sheets" with custom fields, real-time barcode scanning on mobile, offline support, team collaboration, triggers/alerts, integrations (webhooks, REST API, Google Sheets, Excel), label printing, audit history, and more.

**Target platforms:**
- iOS & Android (React Native with Expo)
- Web dashboard (Next.js 14+ App Router)
- Desktop (Electron wrapper around web dashboard — Phase 5)

**Tech stack:**
- **Frontend (web):** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui
- **Frontend (mobile):** React Native (Expo), TypeScript, react-native-vision-camera + barcode plugin
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (web) + JWT tokens (mobile/API)
- **File storage:** S3-compatible (AWS S3, Cloudflare R2, or MinIO for self-host)
- **Real-time:** Socket.IO for live collaboration
- **Queue/jobs:** BullMQ + Redis for background jobs (email alerts, webhook dispatch, exports)
- **Email:** Resend or SendGrid

---

## 2. DATA MODEL (DATABASE SCHEMA)

### Core Entities

```
User
├── id (UUID, PK)
├── email (unique)
├── name
├── password_hash
├── avatar_url
├── organization_id (FK → Organization)
├── role (owner | admin | member)
├── created_at
└── updated_at

Organization
├── id (UUID, PK)
├── name
├── slug (unique, for custom domain)
├── custom_domain (nullable)
├── branding (JSON: logo_url, primary_color, etc.)
├── plan (free | starter | business | enterprise)
├── api_key (hashed)
├── created_at
└── updated_at

Sheet
├── id (UUID, PK)
├── organization_id (FK → Organization)
├── name
├── description
├── icon
├── created_by (FK → User)
├── is_archived (boolean)
├── created_at
└── updated_at

Field (columns in a sheet)
├── id (UUID, PK)
├── sheet_id (FK → Sheet)
├── key (slug, unique per sheet — e.g., "item_name")
├── title (display name — e.g., "Item Name")
├── type (enum — see Field Types below)
├── position (integer, for column ordering)
├── settings (JSON — see Field Settings below)
├── created_at
└── updated_at

Row (inventory items)
├── id (UUID, PK)
├── sheet_id (FK → Sheet)
├── barcode (indexed, nullable)
├── data (JSONB — keys match Field.key)
├── created_by (FK → User)
├── last_modified_by (FK → User)
├── created_at
└── updated_at

SheetUser (sharing/permissions)
├── id (UUID, PK)
├── sheet_id (FK → Sheet)
├── user_id (FK → User)
├── permissions (JSON: { canUpdate, canDelete, canExport, canAdmin })
├── created_at
└── updated_at

AuditLog (history/revision trail)
├── id (UUID, PK)
├── sheet_id (FK → Sheet)
├── row_id (FK → Row, nullable)
├── user_id (FK → User)
├── action (enum: row_created | row_updated | row_deleted | field_added | field_updated | field_deleted | sheet_cleared | sheet_deleted | import | export)
├── changes (JSONB — { field_key: { old: x, new: y } })
├── device_info (JSON: { platform, ip, gps })
├── created_at
└── (no updated_at — audit logs are immutable)

Trigger
├── id (UUID, PK)
├── sheet_id (FK → Sheet)
├── name
├── conditions (JSONB — array of { field_key, operator, value })
├── actions (JSONB — array of { type: "email" | "webhook" | "show_field" | "hide_field" | "require_field", config })
├── is_active (boolean)
├── created_by (FK → User)
├── created_at
└── updated_at

Webhook
├── id (UUID, PK)
├── sheet_id (FK → Sheet)
├── url
├── secret (encrypted)
├── events (text[] — e.g., ["rows:add", "rows:update", "rows:delete"])
├── is_active (boolean)
├── created_at
└── updated_at

WebhookLog
├── id (UUID, PK)
├── webhook_id (FK → Webhook)
├── event
├── request_body (JSONB)
├── response_status (integer)
├── response_body (text)
├── created_at

FileUpload
├── id (UUID, PK)
├── organization_id (FK → Organization)
├── uploaded_by (FK → User)
├── filename
├── mime_type
├── size_bytes
├── storage_key (S3 key)
├── url (CDN URL)
├── created_at
```

### Field Types (enum)

```
text
number
number_auto_increase
number_auto_decrease
email
currency
url
barcode
date
date_automatic
date_time
date_time_automatic
time
drop_down
true_false
photo
attachment
signature
gps_location
gps_location_automatic
formula
unique_id
created_by        (system, read-only)
created_date      (system, read-only)
last_modified_by  (system, read-only)
last_modified_date (system, read-only)
```

### Field Settings (JSON schema)

```json
{
  "default_value": "string | null",
  "placeholder": "string | null",
  "required": false,
  "read_only_mobile": false,
  "read_only_web": false,
  "hidden_mobile": false,
  "hidden_web": false,
  "show_in_mobile_list": false,
  "searchable_mobile": true,
  "empty_on_scan": false,
  "empty_on_edit": false,
  "auto_focus": false,
  "auto_select_value": false,
  "min_length": null,
  "max_length": null,
  "locked": false,
  "currency_code": "USD",
  "dropdown_options": ["Option A", "Option B"],
  "formula": "field_key_1 * field_key_2"
}
```

---

## 3. FEATURE BREAKDOWN BY PHASE

### PHASE 1: Foundation (Week 1–2)
> Goal: Backend API, auth, basic web dashboard, sheet/field/row CRUD

**Backend:**
- [ ] Initialize Node.js/Express/TypeScript project
- [ ] Set up PostgreSQL + Prisma schema (all tables above)
- [ ] Implement auth: register, login, JWT token issuance, refresh tokens
- [ ] API key generation for organizations (for REST API access)
- [ ] CRUD endpoints for Sheets (`/api/v1/sheets`)
- [ ] CRUD endpoints for Fields (`/api/v1/sheets/:sheetId/fields`)
- [ ] CRUD endpoints for Rows (`/api/v1/sheets/:sheetId/rows`)
  - Support `?withTitles=true` query param
  - Support `?partial=true` for partial updates
  - Batch create/update/delete rows
  - Row count endpoint
- [ ] CRUD endpoints for SheetUsers (sharing + permissions)
- [ ] Input validation with Zod
- [ ] Error handling middleware
- [ ] Rate limiting (15 req/s per API key)

**Web Dashboard:**
- [ ] Initialize Next.js 14 project with TypeScript, Tailwind, shadcn/ui
- [ ] Auth pages: login, register, forgot password
- [ ] Dashboard home: list all sheets with create/rename/delete
- [ ] Sheet view: spreadsheet-like grid (use TanStack Table or AG Grid)
  - Display columns based on Field definitions
  - Inline editing of cell values
  - Add/remove/reorder columns
  - Add/delete rows
  - Column type selector (all 21+ field types)
  - Column settings panel (all field settings from the JSON schema above)
- [ ] Field type renderers: each field type needs a display component and an edit component
  - text → text input
  - number → number input with +/- buttons
  - email → email input with validation
  - currency → number input with currency symbol
  - url → input with link icon
  - date/datetime/time → date picker
  - drop_down → select/combobox
  - true_false → YES/NO toggle buttons
  - photo → image thumbnail with upload
  - attachment → file icon with upload
  - signature → signature pad
  - gps_location → lat/lng display with map link
  - formula → computed display (read-only)
  - unique_id → auto-generated display (read-only)
  - system fields → read-only display

**Database seeds:**
- [ ] Default inventory template sheet with common fields (Barcode, Item Name, Quantity, Price, Location, Category, Photo)

---

### PHASE 2: Mobile App + Barcode Scanning (Week 3–4)
> Goal: React Native app that scans barcodes and syncs with the backend

**Mobile App:**
- [ ] Initialize Expo project with TypeScript
- [ ] Auth screens: login, register (matching web auth)
- [ ] Home screen: list of sheets the user has access to
- [ ] Sheet list view: scrollable list of rows with configurable visible fields (show_in_mobile_list)
- [ ] Search bar: filter rows by searchable fields
- [ ] Barcode scanner screen:
  - Use `react-native-vision-camera` + `vision-camera-code-scanner` (or Expo Camera barcode API)
  - Support barcode types: QR, Code128, Code39, EAN-13, EAN-8, UPC-A, UPC-E, ITF, Codabar, Data Matrix, PDF417, Aztec
  - On scan: look up barcode in current sheet
    - If found → open row detail for editing
    - If not found → open new row form with barcode pre-filled
  - Continuous scanning mode (scan multiple items rapidly)
  - Flashlight toggle
  - Camera flip (front/back)
- [ ] Row detail screen:
  - Render all fields based on type with appropriate inputs
  - Respect field settings (required, read-only, hidden, auto_focus, etc.)
  - Photo capture: open camera, take photo, upload to S3, save URL in field
  - Signature capture: drawing canvas, save as image
  - GPS capture: request location permission, save lat/lng
  - Number fields: show +/- stepper buttons
  - Drop-down fields: picker/action sheet
  - Auto-increase/decrease fields: update automatically on scan
  - Date automatic fields: set current date/time on scan
- [ ] Pull-to-refresh on sheet list
- [ ] Bottom tab navigation: Sheets, Scanner, Settings

**Offline Support:**
- [ ] Local SQLite database (expo-sqlite or WatermelonDB)
- [ ] On scan/edit: save to local DB immediately
- [ ] Background sync: when connectivity returns, push local changes to API
- [ ] Conflict resolution: last-write-wins with user notification
- [ ] Visual indicator: show sync status (synced ✓ / pending ↑ / conflict ⚠)

---

### PHASE 3: Advanced Web Features (Week 5–6)
> Goal: Triggers, history, imports/exports, views, maps, collaboration

**Audit History:**
- [ ] Record every row/field/sheet change in AuditLog table
- [ ] History panel in web UI: timeline view per sheet
- [ ] Row history: click a row → see all changes with diffs (old value → new value)
- [ ] Filter history by user, date range, action type
- [ ] Undo last action (web only — restore previous values from audit log)

**Import/Export:**
- [ ] Excel import (.xlsx, .xls):
  - Upload file → parse with `exceljs` library
  - Column mapping UI: match spreadsheet columns to sheet fields
  - Preview first 10 rows before confirming
  - Append or Replace modes
  - Handle duplicates by barcode
- [ ] CSV import (.csv, .tsv): same flow as Excel
- [ ] Excel export: generate .xlsx with all rows and field headers
- [ ] CSV export: generate .csv
- [ ] PDF export: generate formatted inventory report
- [ ] Export options: all rows, filtered rows, selected rows

**Triggers System:**
- [ ] Trigger builder UI:
  - Condition builder: select field → operator (equals, not equals, greater than, less than, contains, is empty, is not empty) → value
  - Multiple conditions with AND/OR logic
  - Action types:
    - **Send email**: to specific addresses, with customizable subject/body template using field variables
    - **Send webhook**: POST to URL with row data
    - **Show field**: make a hidden field visible when conditions are met
    - **Hide field**: hide a field when conditions are met
    - **Require field**: make a field required when conditions are met
    - **Set field value**: auto-set a field value based on conditions
- [ ] Trigger evaluation: runs on every row create/update
- [ ] Low stock alerts: pre-built trigger template (Quantity < threshold → email)

**Views:**
- [ ] Saved filter/sort configurations per sheet
- [ ] Grid view (default spreadsheet)
- [ ] Card/Kanban view (group by a drop-down field)
- [ ] Map view: plot rows with GPS data on a map (Leaflet.js or Mapbox)
  - Satellite and street map toggle
  - Click marker → see row details

**Real-time Collaboration:**
- [ ] Socket.IO integration
- [ ] When User A edits a row, User B sees the update live
- [ ] Presence indicators: show who is currently viewing a sheet
- [ ] Optimistic updates with server reconciliation

**Contactless Forms (QR Code Forms):**
- [ ] Generate a public URL/QR code for a sheet
- [ ] Public form page: anyone with the link can submit a new row
- [ ] Form respects field settings (required, hidden, drop-down options)
- [ ] CAPTCHA/rate limiting on public forms

---

### PHASE 4: Integrations & API (Week 7–8)
> Goal: REST API, webhooks, Google Sheets sync, Zapier-ready

**REST API (public, authenticated via API key):**
- [ ] All endpoints matching Orca Scan's API (see Section 2 data model):
  - Sheets: list, get settings, update settings, create, rename, clear, delete
  - Rows: list, count, get, create (single + batch), update (single + batch + partial), delete (single + batch)
  - Fields: list, create, update (single + batch), delete
  - History: sheet history, row history
  - Users: list, add, update permissions, remove
  - Webhooks: list events, list hooks, get, create, update, delete
- [ ] OpenAPI/Swagger documentation (auto-generated)
- [ ] Rate limiting: 15 req/s per API key
- [ ] API key management UI in web dashboard

**Webhook System:**
- [ ] Webhook registration: URL, secret, events
- [ ] Events supported:
  - `rows:add`, `rows:update`, `rows:delete`
  - `rows:import:append`, `rows:import:replace`
  - `columns:add`, `columns:update`, `columns:delete`, `columns:clear`
  - `sheet:clear`, `sheet:delete`, `sheet:settings:update`
  - `*` (wildcard — all events)
- [ ] Webhook dispatch via BullMQ job queue
- [ ] Include HMAC signature header using webhook secret
- [ ] Retry with exponential backoff (3 attempts)
- [ ] Webhook logs: show request/response for each dispatch

**Data Sources:**
- [ ] Public URL access: generate a read-only JSON/CSV feed URL for a sheet
  - Toggle on/off per sheet
  - URL format: `https://api.yourdomain.com/sheets/:id?datetimeformat=...`
- [ ] Lookup URL: on scan, call an external URL to fetch enrichment data
  - Configure URL in sheet settings
  - Send barcode as query param
  - Merge response fields into the row
- [ ] Validation URL: on save, call an external URL to validate the row
  - Return `{ "valid": true }` or `{ "valid": false, "message": "..." }`

**Google Sheets Integration:**
- [ ] OAuth2 flow to connect Google account
- [ ] Select a Google Sheet to sync with
- [ ] Real-time push: on row change → update Google Sheet via Sheets API
- [ ] Two-way sync option

**Excel Online / Power BI:**
- [ ] Export as live OData feed URL (for Power BI / Tableau / Grafana)
- [ ] Or: scheduled export to cloud storage

---

### PHASE 5: Barcode Generation, Labels & Desktop App (Week 9–10)
> Goal: Generate barcodes, design labels, print, Electron desktop app

**Barcode Generation:**
- [ ] Generate barcode images server-side using `bwip-js` library
- [ ] Supported formats: QR, Code128, Code39, EAN-13, EAN-8, UPC-A, UPC-E, ITF, Codabar, Data Matrix, PDF417
- [ ] API endpoint: `GET /api/v1/barcode?type=qr&data=ABC123&format=png`
- [ ] Barcode image API (public, rate-limited)

**Label Designer:**
- [ ] Drag-and-drop label designer in web UI (use Fabric.js or Konva.js)
- [ ] Elements: barcode image, text fields (pull from row data), logo/image, shapes, lines
- [ ] Pre-built label templates (standard sizes: 2"x1", 3"x2", 4"x6", Avery sheets)
- [ ] Preview with live data from a selected row
- [ ] Save label templates per sheet

**Label Printing:**
- [ ] Generate PDF with labels laid out on selected paper size
- [ ] Print single label or batch (all rows / selected rows / filtered rows)
- [ ] Duplicate label option (print N copies)
- [ ] Print directly from mobile app (via AirPrint / system print)

**Desktop App:**
- [ ] Electron wrapper around the web dashboard
- [ ] System tray integration
- [ ] Native barcode scanner support (USB/Bluetooth HID scanners)
  - Listen for keyboard input events (HID scanners type like keyboards)
  - Detect barcode input by speed (characters entered faster than human typing)
  - Route scanned barcode to active sheet
- [ ] Auto-update mechanism

---

### PHASE 6: Polish, Multi-tenancy & Admin (Week 11–12)
> Goal: Organization management, branding, billing-ready, production hardening

**Organization Management:**
- [ ] Invite users by email (single + bulk with domain suggestions)
- [ ] Role management: Owner, Admin, Member
- [ ] Organization settings page
- [ ] Custom branding: logo, primary color (applied to mobile app header, web dashboard, public forms, labels)
- [ ] Custom domain support (CNAME setup)

**Multi-language Support:**
- [ ] i18n framework (next-intl for web, i18next for mobile)
- [ ] English as default
- [ ] Structure for adding translations (JSON locale files)

**Security & Production:**
- [ ] HTTPS everywhere
- [ ] CORS configuration
- [ ] Helmet.js security headers
- [ ] SQL injection protection (Prisma parameterized queries)
- [ ] XSS protection (sanitize user input)
- [ ] File upload validation (type, size limits)
- [ ] Encrypted secrets in database (API keys, webhook secrets)
- [ ] Automatic backups (database + S3)
- [ ] Health check endpoint

**Billing/Plan Enforcement (structure only):**
- [ ] Plan limits table:
  | Feature | Free | Starter | Business | Enterprise |
  |---------|------|---------|----------|------------|
  | Users | 1 | 2 (+$10/ea) | 2 (+$20/ea) | Custom |
  | Rows/sheet | 50 | 1,000 | 20,000 | Custom |
  | Sheets | 1 | 5 | 20 | Custom |
  | History | 2 weeks | 6 months | 1 year | Unlimited |
  | Triggers | ✗ | ✓ | ✓ | ✓ |
  | Integrations | ✗ | ✗ | ✓ | ✓ |
  | API access | ✗ | ✗ | ✓ | ✓ |
  | Formulas | ✗ | ✗ | ✓ | ✓ |
  | Photos | ✗ | ✗ | ✓ | ✓ |
  | Custom branding | ✗ | ✗ | ✓ | ✓ |
- [ ] Middleware to check plan limits on API calls
- [ ] Stripe integration placeholder (or actual integration)

---

## 4. API ENDPOINT REFERENCE

All endpoints are prefixed with `/api/v1`. Authentication is via `Authorization: Bearer <JWT>` for user sessions or `Authorization: Bearer <API_KEY>` for API access.

```
AUTH
POST   /auth/register          — Create account
POST   /auth/login             — Login, returns JWT
POST   /auth/refresh           — Refresh JWT
POST   /auth/forgot-password   — Send reset email
POST   /auth/reset-password    — Reset with token

ORGANIZATION
GET    /organization                    — Get current org
PUT    /organization                    — Update org settings
PUT    /organization/branding           — Update branding
POST   /organization/api-key/regenerate — New API key
GET    /organization/members            — List members
POST   /organization/members/invite     — Invite user(s)
PUT    /organization/members/:userId    — Update role
DELETE /organization/members/:userId    — Remove member

SHEETS
GET    /sheets                         — List all sheets
POST   /sheets                         — Create sheet
GET    /sheets/:sheetId                — Get sheet
GET    /sheets/:sheetId/settings       — Get settings
PUT    /sheets/:sheetId/settings       — Update settings
PUT    /sheets/:sheetId/rename         — Rename
PUT    /sheets/:sheetId/clear          — Clear all rows
DELETE /sheets/:sheetId                — Delete

FIELDS
GET    /sheets/:sheetId/fields             — List fields
POST   /sheets/:sheetId/fields             — Add field
PUT    /sheets/:sheetId/fields/:fieldKey   — Update field
PUT    /sheets/:sheetId/fields             — Batch update fields
DELETE /sheets/:sheetId/fields/:fieldKey   — Delete field

ROWS
GET    /sheets/:sheetId/rows               — List rows (?withTitles, ?partial)
GET    /sheets/:sheetId/rows/count         — Row count
GET    /sheets/:sheetId/rows/:rowId        — Get single row
POST   /sheets/:sheetId/rows               — Add row(s)
PUT    /sheets/:sheetId/rows/:rowId        — Update row
PUT    /sheets/:sheetId/rows               — Batch update rows
DELETE /sheets/:sheetId/rows/:rowId        — Delete row
DELETE /sheets/:sheetId/rows               — Batch delete rows

HISTORY
GET    /sheets/:sheetId/history            — Sheet audit log
GET    /sheets/:sheetId/rows/:rowId/history — Row audit log

SHEET USERS
GET    /sheets/:sheetId/users              — List users
POST   /sheets/:sheetId/users              — Add user
PUT    /sheets/:sheetId/users/:userId      — Update permissions
DELETE /sheets/:sheetId/users/:userId      — Remove user

WEBHOOKS
GET    /sheets/:sheetId/hook-events        — List available events
GET    /sheets/:sheetId/hooks              — List webhooks
GET    /sheets/:sheetId/hooks/:hookId      — Get webhook
POST   /sheets/:sheetId/hooks              — Create webhook
PUT    /sheets/:sheetId/hooks/:hookId      — Update webhook
DELETE /sheets/:sheetId/hooks/:hookId      — Delete webhook

TRIGGERS
GET    /sheets/:sheetId/triggers           — List triggers
POST   /sheets/:sheetId/triggers           — Create trigger
PUT    /sheets/:sheetId/triggers/:triggerId — Update trigger
DELETE /sheets/:sheetId/triggers/:triggerId — Delete trigger

IMPORT/EXPORT
POST   /sheets/:sheetId/import             — Import file (xlsx, csv)
GET    /sheets/:sheetId/export?format=xlsx  — Export
GET    /sheets/:sheetId/export?format=csv   — Export

BARCODE
GET    /barcode/generate?type=qr&data=X    — Generate barcode image
POST   /barcode/parse                      — Parse barcode data (GS1, etc.)

FILE UPLOADS
POST   /files/upload                       — Upload file (multipart or base64)
GET    /files/:fileId                      — Get file URL

DATA SOURCES
GET    /sheets/:sheetId/public-feed        — Public JSON/CSV feed (if enabled)
```

---

## 5. FOLDER STRUCTURE

```
scanvault/
├── apps/
│   ├── web/                          # Next.js web dashboard
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/           # Login, register, forgot-password
│   │   │   │   ├── (dashboard)/      # Main app layout
│   │   │   │   │   ├── sheets/       # Sheet list + sheet detail
│   │   │   │   │   ├── settings/     # Org settings, billing, API keys
│   │   │   │   │   └── integrations/ # Webhook, data source config
│   │   │   │   └── forms/[formId]/   # Public contactless form
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   ├── sheet/            # SheetGrid, ColumnHeader, CellRenderer, FieldEditor
│   │   │   │   ├── triggers/         # TriggerBuilder, ConditionRow, ActionRow
│   │   │   │   ├── labels/           # LabelDesigner, LabelPreview, PrintDialog
│   │   │   │   ├── history/          # HistoryTimeline, DiffViewer
│   │   │   │   ├── import-export/    # ImportWizard, ColumnMapper, ExportDialog
│   │   │   │   └── maps/            # AssetMap, MarkerPopup
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # API client (fetch wrapper)
│   │   │   │   ├── auth.ts           # NextAuth config
│   │   │   │   ├── socket.ts         # Socket.IO client
│   │   │   │   └── utils.ts
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   └── types/                # TypeScript types
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── mobile/                       # React Native (Expo)
│       ├── src/
│       │   ├── screens/
│       │   │   ├── auth/             # LoginScreen, RegisterScreen
│       │   │   ├── sheets/           # SheetListScreen, SheetDetailScreen
│       │   │   ├── scanner/          # ScannerScreen
│       │   │   ├── row/              # RowDetailScreen, RowFormScreen
│       │   │   └── settings/         # SettingsScreen, ProfileScreen
│       │   ├── components/
│       │   │   ├── fields/           # One component per field type
│       │   │   ├── scanner/          # CameraView, ScanOverlay, FlashToggle
│       │   │   └── common/           # Header, TabBar, SyncIndicator
│       │   ├── lib/
│       │   │   ├── api.ts            # API client
│       │   │   ├── auth.ts           # Token storage (SecureStore)
│       │   │   ├── db.ts             # Local SQLite for offline
│       │   │   ├── sync.ts           # Sync engine (local ↔ remote)
│       │   │   └── scanner.ts        # Barcode processing utilities
│       │   ├── hooks/
│       │   └── types/
│       ├── app.json
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared types, validation, utilities
│       ├── src/
│       │   ├── types/                # Shared TypeScript interfaces
│       │   ├── validation/           # Zod schemas (shared between API & clients)
│       │   ├── constants/            # Field types, permissions, plan limits
│       │   └── formulas/             # Formula parser & evaluator
│       └── package.json
│
├── server/                           # Backend API
│   ├── src/
│   │   ├── routes/                   # Express route handlers (one file per resource)
│   │   ├── middleware/               # auth, rateLimit, planCheck, errorHandler
│   │   ├── services/                 # Business logic layer
│   │   │   ├── sheet.service.ts
│   │   │   ├── row.service.ts
│   │   │   ├── field.service.ts
│   │   │   ├── trigger.service.ts
│   │   │   ├── webhook.service.ts
│   │   │   ├── import.service.ts
│   │   │   ├── export.service.ts
│   │   │   ├── barcode.service.ts
│   │   │   ├── label.service.ts
│   │   │   └── audit.service.ts
│   │   ├── jobs/                     # BullMQ job processors
│   │   │   ├── webhook.job.ts
│   │   │   ├── email.job.ts
│   │   │   ├── export.job.ts
│   │   │   └── sync.job.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts             # Prisma client
│   │   │   ├── redis.ts              # Redis client
│   │   │   ├── s3.ts                 # S3 client
│   │   │   ├── socket.ts             # Socket.IO setup
│   │   │   └── email.ts              # Email client (Resend/SendGrid)
│   │   └── index.ts                  # Express app entry point
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema
│   │   ├── migrations/
│   │   └── seed.ts                   # Default templates
│   └── package.json
│
├── docker-compose.yml                # PostgreSQL, Redis, MinIO (local dev)
├── turbo.json                        # Turborepo config
├── package.json                      # Root workspace
├── .env.example
└── CLAUDE.md                         # ← This file (or a condensed version)
```

---

## 6. INSTRUCTIONS FOR CLAUDE CODE SESSIONS

### Starting a new session

Paste this at the start of each Claude Code session:

> "I'm building ScanVault, an Orca Scan clone. See the project plan in `CLAUDE.md` (or `orca-clone-project-plan.md`). I'm working on Phase [X]. Pick up where I left off — check what files exist already, what's done, and continue with the next uncompleted task."

### Per-phase session prompts

**Phase 1 kickoff:**
> "Initialize the ScanVault monorepo. Set up Turborepo workspace with `apps/web` (Next.js 14, TypeScript, Tailwind, shadcn/ui), `apps/mobile` (Expo React Native), `server` (Express TypeScript), and `packages/shared`. Set up docker-compose with PostgreSQL and Redis. Create the Prisma schema with all tables from the project plan. Generate and run the initial migration. Implement auth (register, login, JWT) and full CRUD for sheets, fields, and rows. Do NOT build the frontend yet — just the backend API with proper error handling, Zod validation, and rate limiting."

**Phase 1 continued — web frontend:**
> "Build the Next.js web dashboard for ScanVault. Implement: auth pages (login/register), dashboard home (list sheets), and the main sheet grid view. The sheet grid should use TanStack Table, support all 21+ field types with proper cell renderers and editors, inline editing, column add/remove/reorder, and the column settings panel. Reference the field types and settings in `CLAUDE.md`."

**Phase 2 kickoff:**
> "Build the ScanVault React Native mobile app. Implement: auth screens, sheet list, barcode scanner using react-native-vision-camera, row detail/edit screen with all field type inputs, and offline support with local SQLite. The scanner should support continuous scanning mode, flashlight, and camera flip. On scan: lookup barcode in current sheet, open existing row or create new one."

**Phase 3 kickoff:**
> "Add advanced features to ScanVault web dashboard: audit history timeline with diffs, Excel/CSV import with column mapping UI, export to xlsx/csv/pdf, the trigger builder (conditions + actions including email alerts), saved views, map view for GPS data, and real-time collaboration via Socket.IO."

**Phase 4 kickoff:**
> "Build ScanVault's integration layer: complete REST API matching the endpoint reference in CLAUDE.md, webhook system with dispatch queue and retry logic, data sources (public feed URL, lookup URL, validation URL), Google Sheets sync via OAuth, and auto-generated Swagger docs."

**Phase 5 kickoff:**
> "Add barcode generation (bwip-js, all formats), the drag-and-drop label designer (Fabric.js), label printing to PDF with batch support, and the Electron desktop wrapper with USB/Bluetooth HID scanner support."

**Phase 6 kickoff:**
> "Polish ScanVault for production: organization management (invites, roles, branding), plan limit enforcement middleware, i18n setup, security hardening (CORS, Helmet, input sanitization, encrypted secrets), and the Stripe billing placeholder."

---

## 7. KEY LIBRARIES & DEPENDENCIES

### Backend (server/)
```json
{
  "express": "^4.18",
  "typescript": "^5.4",
  "@prisma/client": "^5.x",
  "prisma": "^5.x",
  "zod": "^3.22",
  "jsonwebtoken": "^9.0",
  "bcryptjs": "^2.4",
  "socket.io": "^4.7",
  "bullmq": "^5.x",
  "ioredis": "^5.3",
  "@aws-sdk/client-s3": "^3.x",
  "bwip-js": "^4.x",
  "exceljs": "^4.4",
  "csv-parse": "^5.5",
  "helmet": "^7.1",
  "cors": "^2.8",
  "express-rate-limit": "^7.1",
  "resend": "^3.x",
  "swagger-jsdoc": "^6.2",
  "swagger-ui-express": "^5.0"
}
```

### Web (apps/web/)
```json
{
  "next": "^14.x",
  "react": "^18.x",
  "typescript": "^5.4",
  "tailwindcss": "^3.4",
  "@tanstack/react-table": "^8.x",
  "socket.io-client": "^4.7",
  "next-auth": "^4.24",
  "react-hook-form": "^7.x",
  "fabric": "^6.x",
  "leaflet": "^1.9",
  "react-leaflet": "^4.2",
  "date-fns": "^3.x",
  "lucide-react": "^0.x",
  "sonner": "^1.x",
  "recharts": "^2.x"
}
```

### Mobile (apps/mobile/)
```json
{
  "expo": "~50.x",
  "react-native": "^0.73",
  "typescript": "^5.4",
  "react-native-vision-camera": "^4.x",
  "expo-sqlite": "^14.x",
  "expo-secure-store": "^13.x",
  "expo-location": "^17.x",
  "expo-image-picker": "^15.x",
  "react-native-reanimated": "^3.x",
  "@react-navigation/native": "^6.x",
  "@react-navigation/bottom-tabs": "^6.x",
  "react-native-signature-canvas": "^4.x"
}
```

---

## 8. ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/scanvault

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# S3 / File Storage
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=scanvault-files
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@scanvault.app

# Google Sheets (Phase 4)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Stripe (Phase 6)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
```

---

## 9. DEVELOPMENT COMMANDS

```bash
# Install dependencies
npm install

# Start all services (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Run database migrations
cd server && npx prisma migrate dev

# Seed database
cd server && npx prisma db seed

# Start backend
cd server && npm run dev

# Start web dashboard
cd apps/web && npm run dev

# Start mobile app
cd apps/mobile && npx expo start

# Run all (via Turborepo)
npm run dev
```
