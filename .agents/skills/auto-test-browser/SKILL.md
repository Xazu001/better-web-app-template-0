---
name: auto-test-browser
description: Test a URL or the whole app using Puppeteer/browser MCP tools, check for errors, and fix them.
---

# Auto Test (Browser)

Test provided URL or whole app through a browser (Puppeteer or browser MCP tools), verify visuals, check console, and fix errors.

## Test User (for user-feature tests)

When testing features that require a logged-in user (auth, settings, admin, etc.):

1. **Create a test user** by registering an account through the app UI
   (`/register`). Email verification can't be completed locally, so flip the
   flags directly in D1:

   ```bash
   wrangler d1 execute <db> --local --command \
     "UPDATE users SET user_verified = 1 WHERE user_namespace = '<username>'"
   ```

2. For admin features, also set `user_admin`:

   ```bash
   wrangler d1 execute <db> --local --command \
     "UPDATE user_rights SET user_admin = 1 WHERE user_id = '<user_id>'"
   ```

3. After testing, the user can be cleaned up manually or the DB can be reset.

## Steps

1. Navigate to the URL (or `http://localhost:5173` if not provided)
2. Take screenshot to verify visual state
3. Check browser console for errors
4. Check terminal output for server errors
5. Fix any errors found
