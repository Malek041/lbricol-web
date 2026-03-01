# SOP: Opening and Previewing Lbricol.ma Website on Localhost

**Document Version:** 1.0  
**Last Updated:** February 10, 2026  
**Author:** xProject Development Team  
**Purpose:** This Standard Operating Procedure (SOP) provides step-by-step instructions for setting up and previewing the Lbricol.ma website on a local development environment.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup (First Time Only)](#initial-setup-first-time-only)
3. [Daily Development Workflow](#daily-development-workflow)
4. [Troubleshooting](#troubleshooting)
5. [Additional Resources](#additional-resources)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (Version 18.x or higher recommended)
  - Check version: `node --version`
  - Download from: [https://nodejs.org/](https://nodejs.org/)

- **npm** (Node Package Manager - comes with Node.js)
  - Check version: `npm --version`

- **Git** (for version control)
  - Check version: `git --version`
  - Download from: [https://git-scm.com/](https://git-scm.com/)

- **Code Editor** (Recommended: VS Code)
  - Download from: [https://code.visualstudio.com/](https://code.visualstudio.com/)

- **Terminal/Command Line Access**
  - macOS: Terminal (pre-installed)
  - Windows: Command Prompt, PowerShell, or Git Bash

---

## Initial Setup (First Time Only)

Follow these steps the **first time** you set up the project on your machine:

### Step 1: Navigate to Project Directory

Open your terminal and navigate to the Lbricol.ma project folder:

```bash
cd "/Users/xProject/Desktop/Startups/Dev Stuff (Startups)/Lbricol.ma"
```

### Step 2: Install Dependencies

Install all required npm packages listed in `package.json`:

```bash
npm install
```

**What this does:** Downloads and installs all necessary dependencies including Next.js, React, TypeScript, Tailwind CSS, and other libraries.

**Expected outcome:** You should see a progress bar and a message indicating successful installation. A `node_modules` folder will be created (if it doesn't already exist).

**Time estimate:** 2-5 minutes depending on your internet connection.

### Step 3: Verify Installation

Check that the installation was successful:

```bash
npm list --depth=0
```

This should display all installed top-level packages.

---

## Daily Development Workflow

Use these steps **every time** you want to preview or work on the website:

### Step 1: Navigate to Project Directory

```bash
cd "/Users/xProject/Desktop/Startups/Dev Stuff (Startups)/Lbricol.ma"
```

### Step 2: Start the Development Server

Run the development server:

```bash
npm run dev
```

**What this does:** Starts the Next.js development server with hot-reload enabled.

**Expected output:**
```
  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in [X]s
```

### Step 3: Open in Browser

Once you see the "Ready" message:

1. Open your web browser (Chrome, Safari, Firefox, etc.)
2. Navigate to: **[http://localhost:3000](http://localhost:3000)**

**Note:** The port number (3000) is the default. If port 3000 is already in use, Next.js will automatically use a different port (e.g., 3001, 3002). Check the terminal output for the actual URL.

### Step 4: Development Mode Features

While the development server is running, you can:

- **Auto-reload:** Any changes you make to files will automatically refresh the browser
- **Error reporting:** Syntax errors and runtime errors will display in the browser overlay
- **Fast refresh:** Component state is preserved during most code changes

### Step 5: Stopping the Server

When you're done working:

1. Return to the terminal window
2. Press **`Ctrl + C`** (or **`Cmd + C`** on Mac)
3. Confirm the shutdown if prompted

---

## Troubleshooting

### Problem: Port 3000 Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

**Option A:** Use a different port
```bash
npm run dev -- -p 3001
```
Then open: [http://localhost:3001](http://localhost:3001)

**Option B:** Kill the process using port 3000
```bash
# On macOS/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### Problem: Module Not Found Errors

**Symptom:**
```
Error: Cannot find module 'react' or similar
```

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Problem: TypeScript Errors

**Symptom:**
```
Type error: Cannot find name 'X'
```

**Solution:**
```bash
# Clear Next.js cache and rebuild
rm -rf .next
npm run dev
```

### Problem: Browser Shows "This Site Can't Be Reached"

**Symptom:** Browser cannot connect to localhost:3000

**Solutions:**
1. Verify the dev server is actually running (check terminal for "Ready" message)
2. Check for typos in the URL (should be `http://localhost:3000`)
3. Try a different browser
4. Check firewall settings aren't blocking localhost connections

### Problem: Changes Not Reflecting in Browser

**Symptom:** Code changes don't appear after saving

**Solutions:**
1. Do a hard refresh in browser: **`Ctrl + Shift + R`** (Windows/Linux) or **`Cmd + Shift + R`** (Mac)
2. Clear browser cache
3. Restart the development server
4. Check if the file you're editing is actually being imported/used

---

## Additional Resources

### Project Structure
```
Lbricol.ma/
├── src/                    # Source code
│   ├── app/               # Next.js app directory (pages/routes)
│   ├── components/        # React components
│   └── ...
├── public/                # Static assets (images, fonts, etc.)
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── next.config.ts         # Next.js configuration
└── README.md              # Project overview
```

### Available NPM Scripts

From `package.json`, you can run:

- **`npm run dev`** - Start development server (with hot-reload)
- **`npm run build`** - Create production build
- **`npm run start`** - Start production server (requires build first)
- **`npm run lint`** - Run ESLint to check code quality

### Technology Stack

- **Framework:** Next.js 16.1.6 (React framework)
- **UI Library:** React 19.2.3
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion
- **Icons:** Lucide React

### Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Contact & Support

For questions or issues not covered in this SOP:
- Check project README.md
- Review Next.js documentation
- Consult with the development team

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-10 | xProject Team | Initial SOP creation |

---

**End of Document**
