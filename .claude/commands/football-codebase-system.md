---
name: football-codebase-system
description: "A specialized framework for building, reading, debugging, and shipping Next.js/React applications using football analogies. Use when working on the SideQuest app or similar full-stack projects involving Convex, Clerk, Tailwind, and Vite."
---

# ⚽ THE FOOTBALL CODEBASE SYSTEM

This skill transforms complex software engineering tasks into football-themed workflows. Use these instructions to maintain consistency with the SideQuest architecture.

## 🏟️ THE SQUAD: CORE ARCHITECTURE
| Role | Tool | Instruction |
|------|------|-------------|
| **THE CLUB** | Next.js/Vite | Govern the entire organization. Manage routing and rendering strategy. |
| **THE KIT** | Tailwind CSS | Handle what the fans see. Focus on colors, spacing, and layout (UI/UX). |
| **THE PITCH** | React Components | Every component is a zone. Pages are full matches. |
| **THE BALL** | Data (Props/State) | Follow the ball when something breaks. Data moves between components. |
| **BACK OFFICE** | Convex (Backend) | Handle real-time sync, server functions, mutations, and queries. |
| **SECURITY** | Clerk (Auth) | Control access to stadium areas (authentication and roles). |
| **TACTICS BOARD**| Hooks/Logic | Logic decides things—it doesn't display or store. |

## 📋 MATCH DAY PIPELINE: WORKFLOW
1. **IDEATION (Claude)**: Flesh out the architecture before writing code.
2. **DESIGN REFERENCE**: Scout the aesthetic on Dribbble/Behance.
3. **UI GENERATION**: Use references to create component designs.
4. **PROTOTYPE**: Build a basic working demo fast to de-risk.
5. **FULL BUILD**: Transition prototype into production-quality code.
6. **DEBUGGING (VAR)**: Follow the 6-step VAR process for all bugs.
7. **DEPLOYMENT (Vercel)**: Push to production and verify live URLs.

## 🕵️ THE SCOUTING REPORT: READING CODE
*Do not dive into single files. Start from the outside and zoom in.*
- **Step 1: Read the Badge**: Check README/package.json for the app's identity.
- **Step 2: Study Formation**: Map the top-level folder structure.
- **Step 3: Find the Ball**: Trace data from Convex source to the screen.
- **Step 4: Watch the Match**: Trace one full user flow (e.g., Sign up -> Render).
- **Step 5: Identify Stars**: Find the 5-10 files imported most often.

## 📺 THE VAR SYSTEM: DEBUGGING
1. **STOP PLAY**: Read the error message exactly (file and line number).
2. **IDENTIFY FOUL**: Determine error type (TypeError, 404, Auth, Hydration).
3. **TRACE THE BALL**: Find where data was last correct using `console.log`.
4. **IDENTIFY PLAYER**: Pinpoint the specific file/function causing the foul.
5. **CHECK TACTICS**: Verify if the logic itself is flawed (even if code runs).
6. **MAKE THE CALL**: Fix the root cause, test, and document in the "match report".

## 📜 THE CLUB RULES
1. **Understand the role before writing code.**
2. **Follow the ball.** Data always leaves a trail.
3. **Read the full error.** Don't guess.
4. **One change at a time.**
5. **If you don't understand it, don't ship it.**
