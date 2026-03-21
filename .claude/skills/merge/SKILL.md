---
name: merge
description: Push code to GitHub. Use when user says "merge", "push my changes", "push to GitHub", or wants to commit and push code.
disable-model-invocation: true
---

# Merge / Push to GitHub

## Steps

1. Run `git branch --show-current` to get the current branch
2. Run `git status` to check for uncommitted changes
3. If there are changes, run `git add -A` then `git commit -m "<concise message summarizing changes>"`
4. **If on `main`**: run `git push origin main`
5. **If on any other branch**: run `git push origin <branch>`, then run `gh pr create --fill` to open a PR

## After completing
Confirm the branch name, what was committed, and what action was taken (push or PR).
