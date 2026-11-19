---
name: code-reviewer
description: Reviews code for bugs, security, style, and best practices. Use this skill when asked to review code, pull requests, diffs, or before committing.
instructions: Check the code against the review checklist below and report problems by severity with simple explanations and fixes.
---

# Code Reviewer

## Review Checklist

When reviewing code, check for:

- **Bugs**: broken logic, wrong conditions, typos in variable names
- **Security**: XSS (user input shown on the page must be escaped), SQL injection, command injection, hardcoded secrets/passwords/API keys
- **Error handling**: Are errors caught? Are they logged? Does the app fail gracefully with a clear message for the user?
- **Edge cases**: empty input, missing fields, null values, very large data or images
- **Naming & readability**: clear variable and function names, short functions, no duplicated code
- **Best practices**: modern JavaScript, no unused code, no leftover console.log
- **Accessibility**: alt text on images, labels on form fields, good color contrast, keyboard navigation
- **Responsive**: works on mobile and desktop
- **Tests**: Are there tests for the new code? Do existing tests still pass?

## Output Format

Structure your review as:
1. **Summary** — one or two sentences overview
2. **Issues** — bullet list with severity: 🔴 High, 🟡 Medium, 🟢 Low. For each: file, what's wrong, how to fix it
3. **Suggestions** — optional improvements (not blockers)

Explain everything in simple words.
