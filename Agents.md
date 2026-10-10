# AGENTS.md

## 1. Project Context

This is an **existing production-style project** called **RMKStockMate**.

You are working on an existing codebase, not starting a new project.

Your primary responsibility is to make the **smallest correct change necessary** to satisfy the user's explicit request while preserving all existing functionality.

Do not treat existing code as something that should be freely refactored, reorganized, modernized, or rewritten.

---

# 2. HIGHEST-PRIORITY RULE: DO NOT MODIFY WITHOUT PERMISSION

## NEVER modify files simply because you think they should be changed.

Before modifying any file:

1. Understand the user's requested feature/change.
2. Inspect the existing implementation.
3. Identify exactly which files are relevant.
4. Explain which files you intend to modify and why.
5. **Wait for explicit user approval before editing files.**

The user must explicitly approve the proposed changes before you modify the codebase.

Examples of approval:

- "Go ahead"
- "Implement it"
- "Do it"
- "Make those changes"
- "Proceed"

Do NOT interpret vague statements, questions, or discussions as permission to edit.

For example:

> "How can I fix this?"

is NOT permission to edit.

> "What files need to change?"

is NOT permission to edit.

> "Implement this."

IS permission to edit the files necessary for that specific task.

---

# 3. NEVER BLINDLY EDIT FILES

Before making any change, inspect the relevant code.

Do not assume:

- how the backend works
- how the frontend works
- what an API returns
- what a database table contains
- what a component does
- what a route does
- what a function does
- what dependencies are installed
- what files are safe to modify

Read the existing implementation first.

If the requested behavior already partially exists, modify the existing implementation instead of creating a duplicate implementation.

---

# 4. STRICT SCOPE CONTROL

Only modify files that are directly related to the user's current request.

If the user asks:

> "Add multi-item comparison."

Do not modify:

- authentication
- dashboard
- unrelated reports
- purchase logic
- inventory logic
- styling unrelated to the feature
- database schema unrelated to the feature
- package versions
- configuration files
- unrelated components

unless they are genuinely required for the requested feature.

## No opportunistic changes

Do NOT:

- refactor unrelated code
- rename unrelated variables
- reorganize folders
- improve unrelated UI
- fix unrelated warnings
- update dependencies
- change formatting across unrelated files
- rewrite working functions
- "clean up" old code
- change architecture because you prefer another approach

Even if you notice something that could be improved, leave it alone unless:

1. it directly prevents the requested feature from working, or
2. the user explicitly asks you to fix it.

---

# 5. BEFORE CODING: ANALYZE FIRST

For every requested change, follow this process.

## Step 1 — Understand the request

Determine:

- What exactly is the user asking for?
- What behavior currently exists?
- What behavior should change?
- What behavior must remain unchanged?

If the request is ambiguous, ask a clarification question instead of guessing.

Do not silently invent requirements.

---

## Step 2 — Inspect the codebase

Search the repository for the relevant:

- components
- routes
- controllers
- services
- database queries
- API calls
- utilities
- styles
- configuration
- tests

Trace the actual data flow.

For example:

```text
Frontend component
        ↓
API request
        ↓
Express route
        ↓
Database query
        ↓
Response
        ↓
Frontend rendering
```

Understand this flow before changing it.

---

## Step 3 — Identify the minimum file set

Produce a short plan such as:

```text
Files I intend to modify:

1. FrontEnd/src/ItemReport.jsx
   Reason: Add multi-item selection.

2. BackEnd/Routes/ItemWise.js
   Reason: Accept multiple item IDs.

3. FrontEnd/src/PrintComparisonReport.jsx
   Reason: Include all selected items in print output.
```

Also explicitly state:

```text
Files I will NOT modify:
- Dashboard
- Purchase
- Dispatch
- Authentication
- Database schema
```

unless they become necessary.

---

# 6. ASK BEFORE EDITING

After analysis, stop and ask for approval if permission has not already been given.

Use a concise format:

```text
I inspected the existing implementation.

To implement this, I need to modify:

- file1 — reason
- file2 — reason
- file3 — reason

I will not modify unrelated files.

Should I proceed?
```

Do not begin editing until the user approves.

---

# 7. USER REQUEST TAKES PRIORITY OVER YOUR PREFERRED DESIGN

Do not replace the user's requested implementation with your own idea merely because you think another approach is better.

If the requested approach has a technical problem, explain it.

Example:

```text
Your requested approach can work, but there is one issue:
X.

I recommend Y because Z.

If you still want X, I can implement X.
```

Do not silently implement Y instead.

---

# 8. PRESERVE EXISTING BUSINESS LOGIC

This project contains existing business logic.

Do not change calculations unless the user explicitly requests a calculation change.

Examples of logic that must be preserved unless specifically requested:

- inventory calculations
- dispatch calculations
- purchase calculations
- closing stock calculations
- report calculations
- date-range behavior
- authentication
- database relationships
- existing API contracts

If a new feature needs to reuse existing logic, reuse it.

Do not duplicate business logic unnecessarily.

---

# 9. DATABASE SAFETY

Treat the database as sensitive.

NEVER:

- drop a database
- drop a table
- truncate a table
- delete production data
- modify existing records
- change schemas
- rename tables
- change column types

unless the user explicitly requests it.

Before proposing database modifications, inspect the existing schema and explain the consequences.

Never run destructive SQL automatically.

For any destructive operation, obtain explicit confirmation immediately before executing it.

---

# 10. ENVIRONMENT AND SECRETS

Never expose or hardcode:

- database passwords
- API keys
- SMTP passwords
- JWT secrets
- private tokens
- credentials

Never commit secrets into source code.

Do not modify `.env` files unless the user explicitly asks for configuration changes.

If a configuration change is required, tell the user exactly what variable needs to be added or changed.

Example:

```env
MANAGEMENT_EMAIL=...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASSWORD=...
```

Never invent credentials.

---

# 11. DEPENDENCIES

Do NOT install a new npm package just because it is convenient.

Before adding a dependency:

1. Check `package.json`.
2. Check whether an existing dependency can solve the problem.
3. Determine whether the new dependency is genuinely necessary.
4. Tell the user before adding it.

Do not silently modify:

```text
package.json
package-lock.json
```

unless the requested implementation requires it and the user has approved the change.

If a new dependency is necessary, explicitly state:

```text
This requires adding <package> because ...
```

---

# 12. DO NOT CHANGE ARCHITECTURE UNNECESSARILY

This is an existing project.

Do not migrate:

- JavaScript → TypeScript
- CommonJS → ES Modules
- MySQL → PostgreSQL
- Express → another backend framework
- React → another frontend framework
- Vite → another bundler

unless explicitly requested.

Do not introduce:

- Redux
- Zustand
- new API layers
- new service architecture
- new ORM
- new database
- new framework

just because you prefer them.

Work within the architecture that already exists.

---

# 13. MINIMAL PATCH PRINCIPLE

Prefer:

```text
small targeted change
```

over:

```text
large rewrite
```

If a feature can be implemented by modifying 2–3 existing files, do not modify 10 files.

If an existing component can be reused, reuse it.

If an existing function can be extended safely, extend it.

Do not duplicate existing functionality.

---

# 14. DO NOT REWRITE WORKING CODE

If a function already works, do not rewrite it simply to make it "cleaner".

Example:

```js
function calculateStock() {
    ...
}
```

If the requested feature only needs its result, use it.

Do not rewrite the entire function.

---

# 15. ERROR HANDLING

The goal is not merely to make the code run.

The implementation must be robust.

For every new feature:

- validate user input
- handle empty states
- handle API failures
- handle database failures
- handle invalid dates
- handle missing data
- prevent duplicate submissions where appropriate
- provide meaningful error messages

Do not hide errors with:

```js
catch (error) {}
```

Do not suppress errors merely to make the application appear successful.

---

# 16. DO NOT CLAIM SUCCESS WITHOUT VERIFYING

Never say:

> "Done."

unless you actually performed the requested change and verified it.

After modifications:

1. Check the changed files.
2. Check for syntax errors.
3. Run the relevant build/test/lint command if available.
4. Test the affected functionality.
5. Check that unrelated functionality was not accidentally modified.

If you cannot run something, explicitly say:

```text
I could not verify X because ...
```

Do not pretend that it works.

---

# 17. TESTING REQUIREMENT

For every feature, identify the relevant test cases.

For example, for multi-item comparison:

```text
1. One item selected.
2. Multiple items selected.
3. No items selected.
4. Invalid date range.
5. Same item selected twice.
6. Item with no transactions.
7. Print report.
8. Export report.
9. Email report.
```

Test the affected behavior.

Do not create an enormous test suite for a small feature unless requested.

---

# 18. DATE AND REPORTING SAFETY

Reports are particularly sensitive to date filtering.

When modifying reports:

- preserve existing date semantics
- verify inclusive/exclusive boundaries
- verify both start and end dates
- ensure selected dates are actually sent to the backend
- ensure backend queries use the intended dates
- ensure exported reports use the same data shown on screen
- ensure printed reports use the same data shown on screen
- ensure emailed reports use the same data shown on screen

Do not introduce different date logic between:

```text
Screen
Print
Excel
Email
```

They must represent the same report.

---

# 19. REPORT DATA CONSISTENCY

If a report displays:

```text
Period 1
Period 2
```

then:

```text
Screen data
=
Print data
=
Excel data
=
Email attachment data
```

Do not calculate the same report independently using four different formulas.

Prefer one source of truth.

---

# 20. FRONTEND CHANGES

When modifying UI:

- preserve the existing design language
- reuse existing components
- preserve responsive behavior
- do not redesign unrelated screens
- do not introduce unnecessary animations
- do not change colors/fonts globally unless requested

Do not make visual changes outside the requested component/page.

---

# 21. BACKEND CHANGES

When modifying backend:

- inspect the existing routes first
- preserve existing API behavior
- avoid breaking existing clients
- reuse existing database connection logic
- reuse existing query patterns where appropriate
- validate inputs
- handle database errors properly

If an API response must change, determine whether existing frontend components depend on the old response.

---

# 22. FILE CREATION

Do not create new files unless necessary.

Before creating a new file, check whether an existing file already serves the same purpose.

If a new file is necessary, explain why.

Do not create:

```text
test2.js
newComponent.jsx
finalComponent.jsx
finalComponent2.jsx
backup.js
old.js
```

as temporary workarounds.

Keep the repository clean.

---

# 23. NO FAKE IMPLEMENTATION

Do not create UI that only looks functional.

For example, do not create:

```text
[Send to Management]
```

that merely displays:

```text
Email sent successfully
```

without actually sending the email.

Do not create:

```text
Export Excel
```

that downloads a renamed CSV file and calls it `.xlsx`.

Do not create fake API responses.

Functionality must actually work.

---

# 24. WHEN SOMETHING IS UNCLEAR

Do not guess when the ambiguity could materially affect the implementation.

Ask.

Examples:

```text
Should "quantity used" mean dispatch quantity or consumption calculated from stock movement?
```

```text
Should the email contain Excel, PDF, or both?
```

```text
Should this apply only to Item Comparison or all reports?
```

However, do not ask unnecessary questions when the existing code and user's request clearly answer them.

---

# 25. WHEN YOU FIND AN UNRELATED BUG

Do not automatically fix it.

Report it separately:

```text
While inspecting the requested feature, I noticed an unrelated issue in X.

I did not modify it because it is outside the requested scope.
```

Only fix it if the user asks.

---

# 26. WHEN A REQUEST REQUIRES UNRELATED FILE CHANGES

Sometimes a requested feature genuinely requires changes outside the initially identified files.

If that happens:

STOP before modifying the additional file.

Explain:

```text
The requested feature also requires changing X because Y.

This file was not part of the original scope.

Do you want me to include it?
```

Do not silently expand scope.

---

# 27. GIT SAFETY

Never run destructive Git commands automatically.

NEVER run:

```bash
git reset --hard
git clean -fd
git checkout .
git restore .
```

unless explicitly instructed by the user.

Never overwrite the user's uncommitted work.

Before major modifications, inspect:

```bash
git status
```

If there are existing uncommitted changes, do not assume they belong to you.

Do not discard them.

---

# 28. PRESERVE USER CHANGES

This is especially important.

The repository may contain changes made by the user before you started working.

Before editing:

```text
Determine what is already changed.
```

Do not overwrite user modifications simply because they differ from the original repository.

If an existing uncommitted change conflicts with the requested feature:

STOP and explain the conflict.

---

# 29. NO MASS FORMATTING

Do not run formatters across the entire repository unless explicitly requested.

Avoid creating giant diffs caused by:

- indentation changes
- quote changes
- line-ending changes
- import sorting
- prettier formatting
- automatic lint fixes

Keep the diff focused.

---

# 30. COMMENTING

Do not add comments everywhere.

Add comments only when they explain:

- non-obvious business logic
- important constraints
- unusual workarounds
- security-sensitive behavior

Do not add comments such as:

```js
// Set variable
const variable = ...
```

---

# 31. RESPONSE FORMAT AFTER IMPLEMENTATION

After making an approved change, report:

## Changed

List only the files actually modified.

Example:

```text
BackEnd/Routes/ItemWise.js
- Added support for multiple item IDs.

FrontEnd/src/ItemReport.jsx
- Added multi-item selection.
- Rendered comparison results for each item.
```

## Not Changed

Mention important unrelated areas that were intentionally left untouched.

## Verification

Explain what was tested.

Example:

```text
✓ Single item comparison
✓ Multiple item comparison
✓ Empty selection validation
✓ Print report
✓ Excel export
```

## Known limitations

If anything could not be verified, state it honestly.

---

# 32. GENERAL OPERATING PRINCIPLE

The default behavior should be:

```text
USER REQUEST
     ↓
UNDERSTAND
     ↓
INSPECT EXISTING CODE
     ↓
TRACE DATA FLOW
     ↓
IDENTIFY MINIMUM FILES
     ↓
EXPLAIN PLAN
     ↓
ASK FOR APPROVAL
     ↓
MAKE MINIMAL CHANGES
     ↓
VERIFY
     ↓
REPORT EXACTLY WHAT CHANGED
```

Never:

```text
USER REQUEST
     ↓
GUESS
     ↓
EDIT EVERYTHING
     ↓
REFACTOR RANDOM CODE
     ↓
BREAK EXISTING FEATURES
```

---

# 33. FINAL RULE

**Preserve first. Modify second.**

The existing project is the source of truth.

The user's current request defines the scope.

Make the smallest change that correctly implements the requested behavior.

If you do not understand something, inspect it.

If inspection is insufficient, ask.

If a change is outside scope, do not make it.

If permission has not been given, do not edit.

If you cannot verify something, say so.

Never trade existing functionality for unnecessary improvements.