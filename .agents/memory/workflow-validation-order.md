---
name: Workflow validation order
description: State-machine checks transition validity before role — affects expected HTTP status codes in tests.
---

The `validateTransition()` function in `workflow.ts` checks:
1. Is the `fromStatus` in the TRANSITIONS table? (400 if not)
2. Is the specific `toStatus` an allowed transition? (400 if not)
3. Does the actor's role match the required role? (403 if not)
4. Is a comment present when required? (400 if not)

**Why:** Role is checked at step 3, so if the transition itself doesn't exist in the table, you get 400 before ever reaching the 403.

**How to apply:** In tests, "wrong role on an invalid-transition" returns 400, not 403. For a clean 403 test, put the application in a state where the transition IS valid (e.g. UNDER_REVIEW→APPROVE is valid for REVIEWER; test APPLICANT doing it from UNDER_REVIEW to get 403). Alternatively, accept `>= 400` as "action rejected" for these cases.
