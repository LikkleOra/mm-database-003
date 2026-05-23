# Security Hardening: Implement Applicable Rules from Kedasha's "Vibe Coding 101: Security Part 2"

## Context

The 10 rules from the TikTok were audited against the codebase. Here's the honest status of each:

| # | Rule | Status |
|---|------|--------|
| 1 | Don't Leave CORS Wide Open | ✅ Not applicable — our HTTP endpoints are server-to-server (Google Apps Script, Discord bot), not browser APIs. CORS is a browser-only mechanism. |
| 2 | Validate Your Redirects | ✅ Not applicable — no manual redirects in our code. Clerk handles auth redirects. |
| 3 | Lock Down Your Storage | ✅ Not applicable — no file storage buckets. CSV is processed in-memory. |
| 4 | Remove Debug Statements | ✅ Already clean — zero console.log calls in React or Convex code that expose user data. |
| 5 | Always Verify Webhooks | ✅ Already done — `x-bot-secret` and `x-forms-secret` headers validate all HTTP endpoints. |
| 6 | Check Permissions Server-Side | ✅ Already done — every Convex mutation checks `user.role` on the server before executing. |
| 7 | Update Your Dependencies | ⚠️ **ACTION NEEDED** — 5 npm vulnerabilities found (see below). |
| 8 | Add Rate Limiting | ⏭️ Skipped — Convex HTTP actions have no built-in rate limiting mechanism. Complex to add without risk of breaking endpoints. |
| 9 | Never Show Raw Errors | ✅ Already done — HTTP endpoints return controlled JSON error messages, no stack traces exposed. |
| 10 | Set Session Expiration | ✅ Not applicable — Clerk manages JWT expiration automatically. |

## What Needs Fixing

### Vulnerability #1: xlsx package — HIGH severity, no fix available

`npm audit` found 3 HIGH vulnerabilities in the `xlsx` (SheetJS) package:
- **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6)
- **ReDoS** (GHSA-5pgg-2g8v-p4x9)

No patch exists from the vendor. The fix: **remove xlsx entirely**. We already use PapaParse for CSV, which covers the main use case. Google Sheets and Excel both export to CSV. Nothing is lost in practice.

**Files to change:**
- `package.json` — remove `xlsx` from dependencies
- `src/components/dashboard/ImportView.tsx` — remove Excel parsing branch, update UI to CSV-only, remove `import * as XLSX from 'xlsx'`

### Vulnerability #2: js-cookie (HIGH) and ws (MODERATE)

Both are fixable with a single command: `npm audit fix`
- **js-cookie** ≤3.0.5: cookie-attribute injection via `@clerk/shared` — upgrades automatically
- **ws** 8.0.0–8.20.0: uninitialized memory disclosure — upgrades automatically

No code changes needed, just the command.

## Changes Required

### 1. `src/components/dashboard/ImportView.tsx`
- Remove `import * as XLSX from 'xlsx'`
- Remove the Excel file parsing branch (the `else if` block that handles `.xlsx`/`.xls`)
- Update the file `accept` attribute on the `<input>` from `".csv,.xlsx,.xls"` to `".csv"`
- Update the UI hint text to say "CSV files only" instead of "CSV or Excel"

### 2. `package.json`
- Remove `"xlsx": "..."` from `dependencies`
- Run `npm uninstall xlsx` to clean `node_modules` and `package-lock.json`

### 3. Run `npm audit fix` (no code changes)
- Fixes js-cookie HIGH and ws MODERATE vulnerabilities automatically

## What This Achieves

- Eliminates 3 HIGH vulnerabilities (xlsx removed entirely)
- Fixes 1 HIGH + 1 MODERATE vulnerability (npm audit fix)
- Zero risk of breaking existing functionality — CSV import works identically
- Discord bot stays at 0 vulnerabilities (already clean)

## Verification

1. After `npm uninstall xlsx` and `npm audit fix`: run `npm audit` — should show 0 vulnerabilities
2. Test Import Creators with a CSV file → still works
3. File input no longer shows `.xlsx` option
4. Run `npx convex deploy` (no backend changes needed)
