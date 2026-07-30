# HOMEWORK & TEACHING LOG MODULE - IMPLEMENTATION PLAN

## PROJECT CONTEXT & CONSTRAINTS (Adapted for Arise Academy)
- **Stack:** Node.js, Express, **MySQL**, React.js/Next.js (Frontend).
- **Architecture:** Standard MVC (Routes, Controllers, Services).
- **Security:** Strict Role-Based Access Control (RBAC) using existing JWT middleware.
- **Note:** The "Teaching Log" feature is already partially implemented via the existing `teacher_updates` table. This plan outlines how to integrate Homework and expand upon the existing logs.

---

## SECTION 1: DATABASE SCHEMA DESIGN (MySQL)

### 1. Homework Tables
We will create two tables: one for the homework assignment itself, and a junction table to track each student's status.

```sql
-- Homework Assignments Table
CREATE TABLE homework (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL, -- Will store Markdown/Rich Text for better formatting
    subject VARCHAR(100) NOT NULL,
    batch VARCHAR(100) NOT NULL, -- The class/standard mapped to the teacher
    teacher_id INT NOT NULL,
    due_date DATETIME NOT NULL,
    attachment_url VARCHAR(255) NULL,
    is_deleted BOOLEAN DEFAULT FALSE, -- Soft deletion for Recycle Bin integration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- Index for fast lookups by batch (ignoring deleted items)
CREATE INDEX idx_homework_batch ON homework(batch, due_date, is_deleted);
CREATE INDEX idx_homework_teacher ON homework(teacher_id, is_deleted);


-- Homework Status Table (Tracking each student's progress)
-- NOTE: Rows are ONLY created here when a teacher explicitly marks a student's homework.
-- If no row exists, the status is implicitly "Pending".
CREATE TABLE homework_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    homework_id INT NOT NULL,
    student_id INT NOT NULL,
    status ENUM('Pending', 'Completed', 'Late') DEFAULT 'Completed', -- Removed "Submitted" as teachers check physically
    feedback TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (homework_id) REFERENCES homework(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_homework (homework_id, student_id)
);

-- Index for quick queries on a student's completed/late work
CREATE INDEX idx_homework_status_student ON homework_status(student_id, status);
```

### 2. Teaching Log (Daily Diary) Table
*(Note: We already use `teacher_updates` in Arise Academy, but here is the expanded ideal schema to match requirements)*

```sql
CREATE TABLE teaching_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_date DATE NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    batch VARCHAR(100) NOT NULL,
    teacher_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    
    -- Prevent a teacher from accidentally logging the exact same class twice on the same day
    UNIQUE KEY unique_daily_log (class_date, batch, subject, teacher_id)
);

CREATE INDEX idx_teaching_logs_batch ON teaching_logs(batch, class_date);
```

---

## SECTION 2: API ENDPOINT ARCHITECTURE

Ensure routes are protected using existing authentication and RBAC middlewares (e.g., `verifyToken`).

### Homework Endpoints
| Method | Route | Auth/Role | Description | Request Body |
|--------|-------|-----------|-------------|--------------|
| `POST` | `/api/homework` | Teacher, Admin | Assign new homework. **Accepts multiple batches** for quick duplication. | `{ title, description, subject, batches: [], dueDate, attachmentUrl }` |
| `PATCH`| `/api/homework/:id` | Teacher (Owner), Admin | Edit homework details (typo fixes, extending due date). | `{ title, description, dueDate }` |
| `GET` | `/api/homework/batch/:batch` | Admin, Teacher, Student | Get active homework for a specific class. | N/A |
| `GET` | `/api/homework/teacher` | Teacher | Get all active homework assigned by the logged-in teacher. Includes computed completion stats (e.g., 15/30 completed). | N/A |
| `PUT` | `/api/homework/:id/status` | Teacher, Admin | Bulk update student homework statuses. | `{ statuses: [{studentId, status, feedback}] }` |
| `DELETE` | `/api/homework/:id` | Teacher (Owner), Admin | **Soft delete** an assignment (Sets `is_deleted = TRUE`). | N/A |

### Teaching Log Endpoints
| Method | Route | Auth/Role | Description | Request Body |
|--------|-------|-----------|-------------|--------------|
| `POST` | `/api/teaching-logs` | Teacher, Admin | Create a daily teaching log. (Restricted to teacher's batches) | `{ date, subject, topicCovered, batch, notes }` |
| `GET` | `/api/teaching-logs/batch/:batch` | Admin, Teacher, Student | Get teaching logs for a class (Chronological). | N/A |
| `GET` | `/api/teaching-logs/teacher` | Teacher | Get teaching logs logged by the current teacher. | N/A |
| `GET` | `/api/teaching-logs/overview` | Admin | Get system-wide teaching logs summary. | N/A |

---

## SECTION 3: UI/UX FLOW & PAGE LAYOUTS

**Crucial Directive:** Completely reuse existing Next.js UI components to maintain 100% design consistency.

### 1. Teacher: "Assign Homework" Form
- **Layout:** Standard `Card` component containing a form grid.
- **Fields:** 
  - `Title` (Input)
  - `Batches/Classes` (**Multi-Select Dropdown** populated **only** with teacher's assigned classes to allow assigning the same homework to multiple sections instantly).
  - `Subject` (Select dropdown)
  - `Due Date` (Date Picker)
  - `Description` (**Rich Text / Markdown Editor** for bullet points and bold text).
  - `Attachment` (File upload drag-and-drop zone)
- **Actions:** Submit button (primary color), Cancel button (outline).

### 2. Teacher: "Homework Tracking" Table
- **Layout:** Use the existing Data Table styling. 
- **Quick Progress Bars:** The main table displays a progress badge (e.g., "15/30 Checked" or "80% Completed") using backend `COUNT` aggregations, so teachers don't have to open every assignment to see progress.
- **Detail View:** Clicking an assignment opens a detail view querying all students in the `batch` and `LEFT JOIN`s the `homework_status` table. If no row exists, display as `Pending`.
- **Bulk Update UX:** Teachers physically check notebooks and then enter the app to update. Provide a **Bulk Update** capability (e.g., checkboxes to select 10 students, and mark them all "Completed" at once) to avoid a painful row-by-row workflow.

### 3. Student: "My Homework" Dashboard
- **Layout:** Kanban-style or clean list view in the `StudentShell`.
- **UX:** 
  - Overdue items highlighted with a soft red background border (`border-red-300 bg-red-50`).
  - Due soon (within 24h) highlighted in yellow.
  - Completed items grayed out.
- **Details:** Clicking a row opens a modal that parses the Markdown description cleanly, showing instructions and the attachment download link.

### 4. Admin: "Homework & Logs Overview"
- **Layout:** Standard Admin dashboard with tabs (Homework | Teaching Logs).
- **UX:** Filterable tables by Batch and Date Range. Admin can also access the **Recycle Bin** to restore soft-deleted homework assignments.

---

## SECTION 4: STEP-BY-STEP IMPLEMENTATION GUIDE

### Step 1: Database Setup
- Run the SQL `CREATE TABLE` commands in MySQL to set up `homework` and `homework_status`.

### Step 2: Controller Logic & Middleware (RBAC)
- Implement `homeworkController.js`. Use `mysql2/promise` to execute SQL queries.
- **Multi-Batch Creation:** In `POST /api/homework`, verify that the teacher teaches all requested batches, then loop through `req.body.batches` to insert multiple rows into the `homework` table.
- **Implicit Pending Status:** When fetching students for a teacher's view, use `SELECT s.id, s.name, COALESCE(hs.status, 'Pending') as status ... LEFT JOIN homework_status hs`.
- **Student Auth Check:** In GET endpoints, verify that if `req.user.role === 'STUDENT'`, the requested `batch` matches their profile batch (`standard` + `course`).
- **Soft Deletion Check:** Always append `WHERE is_deleted = FALSE` to all homework fetching queries (unless querying from the Admin Recycle Bin).

### Step 3: Frontend API Integration
- Add API service functions in the frontend (e.g., `lib/homeworkApi.ts`).
- Wire up the Next.js frontend to interact with the Express backend using `axios`.

### Step 4: UI Rendering & State Management
- Build the Teacher views (prioritizing the Multi-Select for batches and Bulk status updates).
- Update the Student views to safely render the Rich Text Markdown descriptions.

---

## SECTION 5: EDGE CASES & ERROR HANDLING

1. **Student Moved to Different Class:** 
   - *Handling:* Because homework is assigned to a *batch* directly, a student querying their dashboard will only see their *current* batch's active assignments. 
2. **Admin "Action Required" Alerts:**
   - *Issue 1:* Teacher forgets to log the day.
   - *Issue 2:* Teacher assigns homework but forgets to check notebooks and update statuses.
   - *Handling:* Admin dashboard will run queries checking:
     1. Which active batches have no teaching log for `CURDATE()`.
     2. Which homework is > 3 days past the assignment date and has 0 status updates (no rows in `homework_status`).
3. **File Upload Limits:**
   - *Handling:* Enforce strict multer middleware limits in Express (e.g., `limits: { fileSize: 5 * 1024 * 1024 }` for 5MB). Handle `LIMIT_FILE_SIZE` errors gracefully and show standard UI toast notifications.
4. **Dynamic Overdue Calculation:**
   - *Handling:* Calculate overdue status dynamically in the SQL query: 
     `CASE WHEN h.due_date < NOW() AND COALESCE(hs.status, 'Pending') = 'Pending' THEN 'Overdue' ELSE COALESCE(hs.status, 'Pending') END AS computed_status`

---

## SECTION 6: TESTING CHECKLIST

**1. Role & Access Verification (RBAC):**
- [ ] Student attempting to access `/api/homework/batch/OTHER_BATCH` gets `403 Forbidden`.
- [ ] Teacher attempting to assign homework to an unmapped batch gets `403 Forbidden`.

**2. Teacher Flow:**
- [ ] Teacher can successfully create homework for **multiple batches** at once using Rich Text.
- [ ] Teacher can view the list of students for that homework (via SQL `LEFT JOIN`) and perform bulk status updates.
- [ ] Teacher sees the mini progress bar indicating completion stats without opening the assignment.

**3. Student Flow:**
- [ ] Student sees their specific class homework on their dashboard, with Rich Text descriptions formatted correctly.
- [ ] Student sees overdue homework highlighted correctly.

**4. Admin Flow:**
- [ ] Admin sees "Action Required" alerts for missing daily logs and unchecked homework (>3 days old).
- [ ] Admin can view and restore soft-deleted homework assignments from the Recycle Bin.
