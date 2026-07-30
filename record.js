const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setupLogging(page, name) {
  page.on('console', msg => {
    const text = msg.text();
    // Ignore vercel analytics debug logs to keep stdout clean
    if (!text.includes('[Vercel Web Analytics]')) {
      console.log(`[${name} CONSOLE]`, text);
    }
  });
  page.on('pageerror', err => console.error(`[${name} PAGE ERROR]`, err.message));
}

async function injectOverlayBypasser(page) {
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      try {
        if (document.getElementById('nextjs-overlay-bypass-style')) return;
        const style = document.createElement('style');
        style.id = 'nextjs-overlay-bypass-style';
        style.innerHTML = `
          nextjs-portal { display: none !important; }
          #nextjs-fullscreen-overlay-boundary { display: none !important; }
          body { pointer-events: auto !important; }
        `;
        (document.head || document.documentElement).appendChild(style);
      } catch (e) {
        console.error("Failed to inject overlay style:", e);
      }
    });
  });
}

async function recordStudent(tempDir, finalDir) {
  console.log("🎬 Starting Student walkthrough...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: tempDir,
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  await injectOverlayBypasser(page);
  setupLogging(page, "Student");

  try {
    // 1. Go to student login page
    console.log("Navigating to student login page...");
    await page.goto('http://localhost:3000/student-login');
    await page.waitForSelector('#student-login-btn', { timeout: 60000 });
    await delay(1000);

    // 2. Fill credentials
    console.log("Filling student credentials...");
    await page.fill('input#email', 'rahul@example.com');
    await page.fill('input#password', 'student123');
    await delay(500);

    // 3. Click login
    console.log("Clicking Sign in...");
    await page.click('#student-login-btn');

    // 4. Wait for redirect
    console.log("Waiting for student dashboard redirect...");
    await page.waitForSelector('aside:visible nav', { timeout: 60000 });
    console.log("Successfully logged into Student Dashboard!");
    await delay(3000);

    // 5. Navigate through links in student sidebar
    const links = [
      { text: 'My Homework', url: '/student/homework' },
      { text: 'My Marks', url: '/student/marks' },
      { text: 'My Attendance', url: '/student/attendance' },
      { text: 'Fee Status', url: '/student/fees' },
      { text: 'Class Logs', url: '/student/class-logs' },
      { text: 'Security', url: '/student/change-password' },
      { text: 'Dashboard', url: '/student/dashboard' }
    ];

    for (const link of links) {
      if (link.text === 'Dashboard') {
        console.log("Navigating back to student dashboard...");
        await page.goto('http://localhost:3000/student/dashboard');
        await delay(4000);
      } else {
        console.log(`Clicking student link: ${link.text}...`);
        await page.click(`aside:visible nav a:has-text("${link.text}")`);
        await delay(4000); // Spend 4 seconds on each section
      }
    }

    // 6. Logout
    console.log("Logging out student...");
    await page.click('aside:visible button:has-text("Logout")');
    await page.waitForSelector('#student-login-btn', { timeout: 30000 });
    await delay(2000);

  } catch (err) {
    console.error("Student walkthrough failed:", err);
  } finally {
    await context.close();
    await browser.close();
  }

  // Find the video and rename it
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    const webmFiles = files.filter(f => f.endsWith('.webm'));
    if (webmFiles.length > 0) {
      webmFiles.sort((a, b) => {
        return fs.statSync(path.join(tempDir, b)).mtimeMs - fs.statSync(path.join(tempDir, a)).mtimeMs;
      });
      const videoFile = webmFiles[0];
      if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir);
      const targetPath = path.join(finalDir, 'student_walkthrough.webm');
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      fs.renameSync(path.join(tempDir, videoFile), targetPath);
      console.log("✅ Student walkthrough saved to recordings/student_walkthrough.webm");
    }
  }
}

async function recordAdmin(tempDir, finalDir) {
  console.log("🎬 Starting Admin walkthrough...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: tempDir,
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  await injectOverlayBypasser(page);
  setupLogging(page, "Admin");

  try {
    // 1. Go to homepage
    console.log("Navigating to home page...");
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('nav button:has-text("Login")', { timeout: 60000 });
    await delay(1000);

    // 2. Click Login in Navbar
    console.log("Opening login modal...");
    await page.click('nav button:has-text("Login")');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await delay(500);

    // 3. Fill AuthModal credentials
    console.log("Filling admin credentials...");
    await page.fill('input[name="email"]', 'admin@ariseacademy.com');
    await page.fill('input[name="password"]', 'admin123');
    await delay(500);

    // 4. Click Submit
    console.log("Submitting login form...");
    await page.click('button[type="submit"]');

    // 5. Wait for dashboard
    console.log("Waiting for dashboard redirect...");
    await page.waitForSelector('aside:visible', { timeout: 60000 });
    console.log("Successfully logged into Admin Dashboard!");
    await delay(3000);

    // 6. Hover over sidebar to expand it
    console.log("Hovering over sidebar...");
    await page.hover('aside:visible');
    await delay(1000);

    // Walk through sections
    const sections = [
      { text: 'Admin Profile', id: 'profile' },
      { text: 'Register User', id: 'registerUser' },
      { text: 'Students', dropdown: true, subitems: ['Student Management', 'Inquiry Students', 'Student Marks'] },
      { text: 'Teachers', dropdown: true, subitems: ['Teacher Management', 'Teacher Updates', 'Teacher Homework'] },
      { text: 'Attendance', id: 'attendance' },
      { text: 'Invoices', id: 'invoices' },
      { text: 'New Inquiry', id: 'inquiry' },
      { text: 'Appointments', id: 'appointments' },
      { text: 'Finance', id: 'finance' },
      { text: 'Dashboard', id: 'dashboard' }
    ];

    for (const sec of sections) {
      if (sec.dropdown) {
        console.log(`Expanding dropdown: ${sec.text}...`);
        await page.click(`aside:visible button:has-text("${sec.text}")`);
        await delay(1000);
        for (const sub of sec.subitems) {
          console.log(`Clicking sub-section: ${sub}...`);
          await page.click(`aside:visible button:has-text("${sub}")`);
          await delay(4000);
        }
      } else {
        console.log(`Clicking section: ${sec.text}...`);
        await page.click(`aside:visible button:has-text("${sec.text}")`);
        await delay(4000);
      }
    }

    // Logout
    console.log("Logging out admin...");
    await page.click('aside:visible button:has-text("Logout")');
    await page.waitForSelector('nav button:has-text("Login")', { timeout: 30000 });
    await delay(2000);

  } catch (err) {
    console.error("Admin walkthrough failed:", err);
  } finally {
    await context.close();
    await browser.close();
  }

  // Find the video and rename it
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    const webmFiles = files.filter(f => f.endsWith('.webm'));
    if (webmFiles.length > 0) {
      webmFiles.sort((a, b) => {
        return fs.statSync(path.join(tempDir, b)).mtimeMs - fs.statSync(path.join(tempDir, a)).mtimeMs;
      });
      const videoFile = webmFiles[0];
      if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir);
      const targetPath = path.join(finalDir, 'admin_walkthrough.webm');
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      fs.renameSync(path.join(tempDir, videoFile), targetPath);
      console.log("✅ Admin walkthrough saved to recordings/admin_walkthrough.webm");
    }
  }
}

async function recordTeacher(tempDir, finalDir) {
  console.log("🎬 Starting Teacher walkthrough...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: tempDir,
      size: { width: 1280, height: 720 }
    },
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  await injectOverlayBypasser(page);
  setupLogging(page, "Teacher");

  try {
    // 1. Go to homepage
    console.log("Navigating to home page...");
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('nav button:has-text("Login")', { timeout: 60000 });
    await delay(1000);

    // 2. Click Login in Navbar
    console.log("Opening login modal...");
    await page.click('nav button:has-text("Login")');
    await page.waitForSelector('input[name="email"]', { timeout: 30000 });
    await delay(500);

    // 3. Fill AuthModal credentials (using Mrs. Sunita Rao who has email sunita@ariseacademy.com)
    console.log("Filling teacher credentials...");
    await page.fill('input[name="email"]', 'sunita@ariseacademy.com');
    await page.fill('input[name="password"]', 'teacher123');
    await delay(500);

    // 4. Click Submit
    console.log("Submitting login form...");
    await page.click('button[type="submit"]');

    // 5. Wait for dashboard
    console.log("Waiting for teacher dashboard redirect...");
    await page.waitForSelector('aside:visible', { timeout: 60000 });
    console.log("Successfully logged into Teacher Dashboard!");
    await delay(3000);

    // Walk through teacher sidebar links
    const links = [
      { text: 'Teacher (Wizard)', url: '/teacherdashboard/notes' },
      { text: 'Notes (Dropdown)', url: '/teacherdashboard/notes-dropdown' },
      { text: 'Student Management', url: '/teacherdashboard/subjects' },
      { text: 'Homework', url: '/teacherdashboard/homework' },
      { text: 'Teaching Logs', url: '/teacherdashboard/teaching-logs' },
      { text: 'Settings', url: '/teacherdashboard/settings' },
      { text: 'Dashboard', url: '/teacherdashboard' }
    ];

    for (const link of links) {
      console.log(`Clicking teacher link: ${link.text}...`);
      await page.click(`aside:visible nav a:has-text("${link.text}")`);
      await delay(4000);
    }

    // Logout
    console.log("Logging out teacher...");
    await page.click('aside:visible button:has-text("Logout")');
    await page.waitForSelector('nav button:has-text("Login")', { timeout: 30000 });
    await delay(2000);

  } catch (err) {
    console.error("Teacher walkthrough failed:", err);
  } finally {
    await context.close();
    await browser.close();
  }

  // Find the video and rename it
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    const webmFiles = files.filter(f => f.endsWith('.webm'));
    if (webmFiles.length > 0) {
      webmFiles.sort((a, b) => {
        return fs.statSync(path.join(tempDir, b)).mtimeMs - fs.statSync(path.join(tempDir, a)).mtimeMs;
      });
      const videoFile = webmFiles[0];
      if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir);
      const targetPath = path.join(finalDir, 'teacher_walkthrough.webm');
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      fs.renameSync(path.join(tempDir, videoFile), targetPath);
      console.log("✅ Teacher walkthrough saved to recordings/teacher_walkthrough.webm");
    }
  }
}

async function run() {
  const systemTempDir = os.tmpdir();
  const tempDir = path.join(systemTempDir, 'arise_recordings_temp');
  const finalDir = path.join(__dirname, 'recordings');

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir);
  console.log(`Using safe temporary directory for recordings (outside Next.js watch path): ${tempDir}`);

  await recordStudent(tempDir, finalDir);
  await recordAdmin(tempDir, finalDir);
  await recordTeacher(tempDir, finalDir);

  // Clean up temp dir
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  console.log("🎉 All walkthrough recordings completed successfully!");
}

run();
