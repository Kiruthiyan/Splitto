# Splitto — Personal Shared-Expense Tracker

**Splitto** is a modern, mobile-first personal shared-expense tracker supporting two or more friends with no artificial member limit.

A single operator ("Me") manages the ledger: adding friends, recording expenses paid by any member, choosing how each expense is shared, and seeing exactly who should pay whom in **LKR** (`Rs. 1,500.00`).

---

## 🎯 Architecture & Scope

- **Frontend Only**: Built with React 19, TypeScript, Vite, Tailwind CSS, and Lucide icons.
- **Zero Backend / Zero Online Database**: No Supabase, no Express server, no user accounts, no login passwords, and no online syncing.
- **100% Local Persistence**: All data is securely persisted in `localStorage` under schema version 1 with revision tracking.
- **Offline & PWA Ready**: Installable as a Progressive Web App (PWA) with a service worker caching the application shell. Works seamlessly offline.
- **Single Flexible Ledger**: No complicated multi-group navigation. One shared ledger with flexible member participation.
- **Starts Clean & Empty**: No fake demo data, no sample transactions, no prefilled names.

---

## 💰 Accurate Money & Calculation Rules

- **Integer Minor Units (Cents)**: All amounts are stored as integer minor units (`Rs. 10.25 = 1025 cents`). No floating-point math is used.
- **Deterministic Equal Split Distribution**: When an amount in cents doesn't divide evenly among participants, leftover remainder cents are distributed deterministically (1 extra cent each) in stable member creation order.
- **Net Balance Formula**:
  $$\text{net balance} = \text{expenses paid} - \text{assigned expense shares} + \text{settlement payments sent} - \text{settlement payments received}$$
  - **Positive balance**: The member should receive money.
  - **Negative balance**: The member owes money.
  - **Zero**: The member is settled up.
  - All member net balances mathematically sum to zero.
- **Total Expenses**: Sum of saved expenses only. Settlement payments never inflate total expenses.
- **Suggested Settlements**: Debtor-to-creditor matching algorithm matches negative-balance members with positive-balance members to produce clear, actionable settlement steps.

---

## 📱 Features & Workflows

1. **First-Use Onboarding**:
   - Prompts once for your display name and creates a stable member ID marked as `"Me"`.
   - Guides you to add your initial friends by name.
   - Prevents duplicate display names.
2. **Home Summary**:
   - Prominent personal position banner: *"You should receive Rs. X"*, *"You owe Rs. X"*, or *"You are settled"*.
   - Displays *"Everyone is settled"* only when all balances reach zero.
   - Suggested settlements with actual names (*"Niro pays you Rs. 500.00"*, *"Arun pays Niro Rs. 200.00"*).
   - Quick "Add Expense" and "Record Payment" buttons.
3. **Fast Expense Entry**:
   - Fields: Description, amount in LKR, paid by (default: Me), date (default: today), category, note.
   - Split methods:
     - **Equal**: Split equally among selected participants.
     - **Custom amounts**: Enter custom shares with live unallocated remainder calculation. If two participants, entering either automatically calculates the other's remainder.
     - **One person**: Assign the entire cost to one selected member.
   - Continuous live preview of exact shares before saving.
4. **Record Payments (Settlements)**:
   - Record an external payment between any two members (cash, bank transfer).
   - Pre-fills from suggested settlement items.
   - Resulting balance preview shown before saving.
   - Overpayment or reverse payment warning check.
5. **History & Editing**:
   - Date-grouped transaction history (newest first).
   - Filters: All / Expenses / Payments.
   - Search by description, member name, or category.
   - Edit and delete transactions with confirmation.
6. **Member Management**:
   - List with name, initials, "You" badge, and current net balance.
   - Member financial detail modal (expenses paid, assigned shares, settlements).
   - Rename member without altering financial references.
   - Inactivate member only when balance is zero.
   - Permanent delete allowed only if member is completely unreferenced.
7. **Backups & Recovery**:
   - Export full JSON backup (`splitto-backup-YYYY-MM-DD.json`).
   - Import JSON backup with full structural validation (unique IDs, valid references, matching split sums).
   - Danger zone: reset all records with confirmation.

---

## 🧪 Verification & Unit Tests

The test suite in `src/lib/money.test.ts` verifies:
- **Two-person acceptance scenario**:
  - I pay Rs. 600 for breakfast, split equally.
  - Niro pays Rs. 1,000 for dinner (my share Rs. 400, Niro's share Rs. 600).
  - Total expenses: Rs. 1,600.
  - Initial balances: I owe Niro Rs. 100.
  - After I pay Niro Rs. 40, I owe Rs. 60.
  - After another Rs. 60 payment, both balances become zero. Total expenses remain Rs. 1,600.
- **Three-person scenario**:
  - I pay Rs. 900, split equally among all three.
  - Niro pays Rs. 600, split equally between Niro and Arun (I am excluded).
  - Expected: My balance: +Rs. 600, Niro: Rs. 0, Arun: -Rs. 600.
  - Settlement suggestion: Arun pays me Rs. 600.
- **Remainder cents**: Rs. 100 divided among 3 produces Rs. 33.34, Rs. 33.33, and Rs. 33.33 in stable member creation order.
- **One-person allocation & payer excluded**.
- **Backup validation & rejection of malformed backups**.

Run the tests:

```bash
npm test
```

---

## 🚀 Local Development & Build

### Install dependencies
```bash
npm install
```

### Start development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

---

## 🌐 Vercel Deployment Guide

Splitto is configured as a static Vite frontend with client-side SPA routing and PWA caching via `vercel.json`.

### Step-by-Step Deployment Steps:

1. **Push the project to a Git repository**:
   Push your local code to GitHub, GitLab, or Bitbucket:
   ```bash
   git add .
   git commit -m "Prepare Splitto for Vercel deployment"
   git push origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com/) and click **Add New...** → **Project**.
   - Select your Git repository.

3. **Select Framework Preset & Root Directory**:
   - **Framework Preset**: Select **Vite** (automatically detected).
   - **Root Directory**: Leave as `./` (project root).

4. **Confirm Build and Output Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   *(No environment variables, server functions, or database connection strings are required).*

5. **Deploy & Verify**:
   - Click **Deploy**.
   - Once completed, visit your production URL (e.g. `https://your-splitto-project.vercel.app`).
   - Verify that refreshing nested routes works, the PWA manifest loads, the header logo renders without repetition, and favicons are visible.

---

## 🔒 Local Storage & Origin Isolation

> [!IMPORTANT]
> **Storage belongs strictly to each browser and website origin:**
> - **Localhost data is isolated**: Records created on `http://localhost:5173` will **not** automatically appear on your deployed Vercel domain (`https://*.vercel.app`).
> - **Domain isolation**: Different preview URLs, staging branches, and custom domains each maintain their own independent local storage sandboxes.
> - **Moving data**: To migrate existing records from localhost to your deployed Vercel URL:
>   1. Open Splitto on `localhost` → Click the **Settings** gear icon.
>   2. Click **Export JSON Backup** to save `splitto-backup-YYYY-MM-DD.json`.
>   3. Open your live Vercel domain → Click **Settings** → **Import JSON Backup** and select your file.
> - **Future deployments**: Subsequent deployments and updates to the same domain origin preserve your saved records without loss. Records are only removed if you manually clear your browser's site data.
> - **Frontend-only**: Vercel hosts the static HTML, JavaScript, CSS, and brand assets. Vercel is **not** cloud storage or a cross-device synchronization backend.

---

## 🎨 Brand Identity & Theme Tokens

- **Brand Assets (`public/`)**:
  - Full wordmark logo: `public/splitto-logo.png` & `public/splitto-logo-header.png`
  - Symbol icon: `public/splitto-symbol.png`
  - Favicons: `public/favicon.ico`, `public/favicon-16x16.png`, `public/favicon-32x32.png`
  - Apple Touch Icon: `public/apple-touch-icon.png` (180×180)
  - PWA Icons: `public/pwa-192x192.png`, `public/pwa-512x512.png`
  - PWA Maskable Icon: `public/pwa-maskable-512x512.png` (safe padding on `#F0F9FF`)

- **Official Sky-Blue Palette**:
  - Primary: `#0284C7` (Sky 600)
  - Primary hover: `#0369A1` (Sky 700)
  - Accent: `#38BDF8` (Sky 400)
  - Background: `#F0F9FF` (Sky 50)
  - Surface: `#FFFFFF`
  - Selected state: `#E0F2FE` (Sky 100)
  - Border: `#BAE6FD` (Sky 200)
  - Text: `#0F172A` (Slate 900)
  - Muted text: `#475569` (Slate 600)
  - Financial Status: Emerald (`#047857`) for receivable / lent; Rose (`#BE123C`) for owed / debt.

