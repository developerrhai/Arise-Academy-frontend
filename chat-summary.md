# Chat Summary: Homework Module & Teaching Logs

This document contains a comprehensive summary of the pair-programming session and final implementation for the **Homework Assignment & Tracking** and **Teacher's Daily Teaching Log** modules in the **Arise Academy** project.

---

## 1. Database Schema Design (MySQL)
The following tables were successfully created in the MySQL database:
- **`homework`**: Stores assignment details (subject, batch string, due date, description markdown, and attachment URL) with support for soft deletion (`is_deleted`).
- **`homework_status`**: Junction table tracking student-specific homework statuses (`Pending`, `Completed`, `Late`) and feedback. Rows are only inserted when explicitly marked by a teacher; un-marked records default to `Pending` using `LEFT JOIN` and `COALESCE` in database queries.
- **`teaching_logs`**: Stores daily class teaching logs (date, subject, topic taught, and notes).
- **`teacher_batches`**: Mapping table linking teachers to their mapped standard/course batches.

---

## 2. Backend API Architecture
Routes were created and mounted under `app.js` with strict authorization checking:

### Homework Routes (`/api/homework`)
- `POST /`: Creates homework assignments. Accepts a `batches` array for instant multi-batch duplication.
- `PATCH /:id`: Edits title, description, due date, and attachments (owner check enforced).
- `GET /batch/:batch`: Retrieves active homework for a class. Restricts students to their own batch.
- `GET /teacher`: Retrieves assignments created by the logged-in teacher along with computed completion statistics.
- `PUT /:id/status`: Bulk updates student status checklist.
- `DELETE /:id`: Soft deletes the assignment.

### Teaching Log Routes (`/api/teaching-logs`)
- `POST /`: Creates a daily teaching log entry.
- `GET /batch/:batch`: Gets all chronological teaching logs for a batch.
- `GET /teacher`: Gets logs recorded by the current teacher.
- `GET /overview`: Returns stats and active alert logs for the admin dashboard.

---

## 3. Security & Code Quality Standards

### Enforced Batch Scoping (No Bypass Fallback)
To prevent security leaks, teachers with 0 mappings configured in `teacher_batches` are immediately blocked from assigning homework or posting class logs.
- Triggered response: `403 Forbidden` (`"No batch mappings configured. Contact admin to assign your batches."`).
- Admin Alert: Unmapped teachers are listed on the Admin Dashboard alert box.

### Batch-Scoped Status Updates
In `bulkUpdateStatus`, the backend verifies that each updated `studentId` belongs to the specific batch of the target homework assignment to block malicious or buggy parameter injection.

### Standardized JWT Role Normalization
Normalization is handled in exactly one location: [authMiddleware.js](file:///c:/Users/admin/Desktop/freelance/arise-academy/backend/src/middleware/authMiddleware.js). 
The role string is mapped to uppercase (`STUDENT`, `TEACHER`, `ADMIN`) at the middleware entry point, ensuring clean maintainability and standard checks across routes.

---

## 4. Frontend Interface Elements

### Student Dashboard
- Added **"My Homework Assignments"** card in the dashboard view.
- Overdue assignments are highlighted with a soft red border.
- **Details Modal** displays description markdown, download buttons, and teacher feedback.

### Teacher Dashboard
- **Homework page**: Allows creating assignments for multiple batches and features a **Bulk status tracking table** with checkboxes to mark multiple students at once.
- **Teaching Logs page**: Quick form to submit daily diary updates and view previous entries.

### Admin Dashboard (Teacher Updates Panel)
- Integrated a new **"Daily Logs & Alerts"** tab.
- Displays today's logs count and alerts for:
  - Batches with missing daily logs today.
  - Homework assigned 3+ days ago with no updates.
  - Active teachers with missing batch mappings.

---

## 5. Verification
- Checked Next.js compilation: **`npx tsc --noEmit` runs with zero compilation errors**.
- Database foreign keys verified as compatible (`INT UNSIGNED` matching).

---

## 6. Biometric SmartOffice Attendance Integration
The "Smart Office" biometric attendance system has been integrated for both **Students** and **Teachers**.

### Database Schema Expansion
- **`biometric_code`**: Added as a unique field to `students` and `teachers` to map records.
- **`student_batches` / `teacher_batch_mappings`**: Mapped users to their batch timings.
- **`attendance`**: Persists processed entries with fields: `punch_in_time`, `punch_out_time`, `status` (`Present`, `Absent`, `Late`, `On Leave`), `source` (`Smart Office` vs `Manual`), and `smart_office_reference_id`.

### Sync Service & Logic (`smartOffice.service.js`)
- Sorts and groups user batches with $\le 3$-hour gaps into continuous sessions.
- Filters and maps raw logs within a 30-minute window around sessions.
- Gracefully handles missing credentials, falling back to a manual registration state.

### Backend Endpoints (`/api/attendance`)
- `GET /`: Retrieves attendance records (filters by date, role, standard, batch). Defaults unrecorded users to `Absent`.
- `POST /sync`: Pulls live device logs and updates database.
- `POST /leave`: Marks manual leave.
- `PUT /record`: Manually updates punch times or statuses.
- `POST /notify-whatsapp`: Automatically alerts parents of absent students.

### Frontend UI (`attendance-content.tsx`)
- Integrated under the **"Attendance"** tab of the Admin Sidebar.
- Presents stats cards, custom filters, manual adjust modals, Excel import/export buttons, and a warning banner when hardware sync is pending configuration.

---

## 7. Real-Time Group Chat / Messaging
A fully functional real-time group chat system was built using Socket.io to allow communication between Admin, Teachers, and Students.

### Database Schema
- **`chat_groups`**: Stores group metadata (`name`, `description`, `created_by`, `is_deleted`).
- **`chat_group_members`**: Junction table (`group_id`, `user_id`, `user_role`) mapping users to groups. Enforces a strict `UNIQUE KEY (group_id, user_id, user_role)` to prevent ID collisions across distinct user types.
- **`chat_messages`**: Stores chat history (`group_id`, `sender_id`, `sender_role`, `message_text`, `is_deleted`).

### Backend API & Socket Integrations
- **REST APIs (`/api/chat-groups`, `/api/chat-messages`)**: Allow fetching groups, messages, and creating new groups.
- **Socket.io Configuration**: 
  - Attached to the Express server (`config/socket.js`).
  - Automatically handles cross-origin (CORS) access for local development (`http://localhost:3000`).
  - Utilizes JWT token middleware extracted during the socket handshake to securely identify `id` and `role`.
- **RBAC Security Fix**: All database checks securely query by both `user_id = ? AND user_role = ?` to resolve vulnerabilities regarding matching ID collisions between the `students`, `teachers`, and `admins` tables.

### Frontend Components (`components/chat`)
- **`ChatLayout` & `ChatStore`**: A Zustand state manager handles incoming socket events seamlessly alongside historical REST fetches.
- **`ChatGroupList`**: Left panel displaying active user assignments.
- **`ChatRoom` & `ChatMessageList`**: Right panel rendering messages with dynamic gradient styling for active users.
- **`ManageGroupMembers`**: Admins have an exclusive UI panel triggered from the `ChatHeader` to actively fetch and select students/teachers to add them into any existing group.
- **Sidebar Hooks**: Direct links added into Admin, Teacher, and Student sidebars, directing to their specific `/chat` portal routes.

---

## 8. Push Notifications System (Frontend & Backend)
A complete, end-to-end push notification system was integrated into both the Express backend and Next.js frontend, adopting the exact architecture, database tables, Firebase SDK setup, and admin matrix UI from `Vidyaaniketan2`.

### Database Schema
- **`fcm_tokens`**: Stores device FCM tokens (`id`, `public_id`, `user_id`, `user_role`, `token`, `device_type`, `last_active`, `created_at`). Indexed on `(user_id, user_role)` for fast lookups.
- **`notifications`**: Maintains audit log of sent push notifications (`id`, `public_id`, `title`, `body`, `target_type`, `target_role`, `target_criteria`, `sent_by`, `success_count`, `failure_count`, `status`, `created_at`).

### Backend Architecture
- **Firebase Admin SDK Setup (`src/config/firebase.js`)**: Initializes `firebase-admin` with fallback mock messaging logic if service account key is missing, ensuring the application runs smoothly without crashing.
- **Notification Service (`src/services/notificationService.js`)**: Handles token registration (upsert & device transfer handling), batching multicast pushes (500 limit per batch), purging failed/invalid device tokens, and logging audit entries.
- **API Routes (`src/routes/notifications.js`)**:
  - `POST /api/notifications/register-token`: Authenticated endpoint to store device token.
  - `POST /api/notifications/send-single`: Admin route to send push notification to single user.
  - `POST /api/notifications/send-bulk`: Admin route to broadcast push notification to all students or teachers.
  - `POST /api/notifications/send-filtered`: Admin route to push to filtered user arrays.
  - `GET /api/notifications/history`: Admin route to fetch past push notification logs.

### Frontend Integration
- **Service Worker (`public/firebase-messaging-sw.js`)**: Handles background push messages when browser tabs are closed or minimized.
- **Client Push Token Helper (`lib/push-notification.ts`) & API (`lib/api.ts`)**: Requests notification permissions from browser, generates/retrieves device token, and calls `/api/notifications/register-token`.
- **Admin Push Notifications Matrix UI (`components/dashboard/push-notifications-content.tsx`)**:
  - **Compose Push Form**: Target audience selection (Bulk to Students/Teachers or Single User ID), Title, Body content, and Transmit button.
  - **Push Broadcast Audit Logs Matrix Table**: Real-time delivery stats (`✓ Success` / `✗ Fail`), target role badges, status badges (`Sent` / `Failed`), sender name, and timestamp.
- **Auto Token Registration**: Automatically registers FCM device tokens when Students log into `StudentShell` or Admins access `/dashboard`.

