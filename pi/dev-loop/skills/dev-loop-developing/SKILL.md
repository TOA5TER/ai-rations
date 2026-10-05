---
name: dev-loop-developing
description: >-
  Full-stack development workflow with story context loading, TDD, automated planning, inline
  execution, and PR creation. Use this skill whenever implementing features, fixing bugs, or any
  hands-on coding task. Always use this when a user says 'implement', 'build', 'code up', 'add
  feature', 'start dev', or provides a story ID to work from. Works with or without a PM story.
---

Read [runtime rules](../../support/shared/runtime.md) before continuing. Wrapper rules already loaded remain in force.

# Developing

**Role:** Developer — implement features, fix bugs, and maintain code quality

**SCOPE BOUNDARY:** This skill **never** creates PM stories, tickets, issues, or subtasks — the Story Creation Gate in `../../support/shared/standards.md` applies. Necessary extra work discovered mid-pipeline is governed by "Necessary Extra Work — No Follow-On Tickets" in `../../support/shared/standards.md`: fold it into the current branch/PR by default; only a huge scope increase warrants stopping to ask — never a follow-on ticket.

Read `../../support/shared/standards.md` — these mandatory rules govern this entire session.

Read `../../support/shared/adapter-loading.md` — adapter loading procedures referenced in PM Context.

Read `../../support/shared/repo-discovery.md` — repo discovery procedure referenced in Repo Discovery.

Read the CLAUDE.md file in this repository before starting.

---

## Branch Management

- **ALWAYS** start by creating a new branch with prefix `feature/`, `fix/`, or `chore/`. On the story-ID path ("Implementation Planning" below), that branch is created inside the isolated worktree required by `../../support/shared/standards.md` → "Workspace Isolation" — never checked out in the primary checkout first. The No Story ID path (no PM story, ad hoc interactive work) checks it out directly, as today.
- Branch names should be descriptive: `feature/slack-monitoring`, `fix/docker-permissions`, `chore/update-dependencies`
- Check which branch you're on first. If not on `main`, you may already be on the correct branch — check if a PR is already open.

---

## No Story ID Path

If **no story ID** was provided, work directly with the user to define and scope the task:

1. **Understand the task** — If the request is vague or missing, use a question to the user to clarify what needs to be built or changed.
2. **Brainstorm requirements** — Before writing any code, invoke brainstorming to clarify scope boundaries and identify risks within the stated requirements:
   > Invoke Skill: `brainstorming`
   >
   > OVERRIDE: After brainstorming completes, do NOT invoke `writing-plans` yet.
   > Return here and proceed to step 3.
3. **Plan implementation** — Invoke the planning skill:
   > Invoke Skill: `writing-plans`
   >
   > OVERRIDE: The plan is a human-readable artifact saved to a local file — render it as a
   > standalone HTML document per the Output Format rules in `../../support/shared/standards.md`, and
   > save to `./.scratch/tmp/YYYY-MM-DD-plan.html`.
   > NEVER save to `docs/` or any subdirectory (including `docs/superpowers/plans/`).
   > `.scratch/` is gitignored — this file must never be committed.
   > Use the brainstorming output and user's description as the feature description input.
4. **Implement** — Use the Development Standards below. Apply TDD for each distinct behavior.
5. **Commit and PR** — Follow the Commit and PR Process below. Include a clear description of what was built and why.

After planning, skip the "PM Context" and "Implementation Planning" sections — continue from **Development Standards**.

---

## PM Context (if story ID provided)

If you have a story ID:

1. Read `{agentDir}/dev-workflow/config.json` to determine `pm_adapter` and `notes_adapter`
2. Load PM adapter per procedure in `../../support/shared/adapter-loading.md` → fetch story via PM adapter instructions
3. Load notes adapter per procedure in `../../support/shared/adapter-loading.md`
4. Read the **"Repos to modify"** field from the story (a comma-joined list of repo/service names), then load the Claude Instructions spec(s) via the notes adapter:
   - **Single repo (or field absent):** follow today's single-repo flow unchanged — load one spec and continue as before.
   - **Multiple repos:** load the spec for EACH named repo. If any spec is missing, STOP and ask the user to run `dev-loop-writing-specs` for the story first.
5. **If a required spec is not found:** STOP and ask user to invoke the Writer skill (`dev-loop-writing-specs`) with this story ID first. Never create a story, ticket, or issue to fill the gap
6. Use spec(s) as the primary implementation guide

### Repo Discovery

If the dispatch prompt supplied an explicit repo path (a `Repo path:` field), use it directly
as the resolved single repo root and skip re-running `../../support/shared/repo-discovery.md`'s
two-path detection — the caller already resolved it. Only fall back to running the full
procedure below (including its multi-repo per-repo loop) when no repo path was supplied.

Otherwise, determine which checkout(s) to operate on per `../../support/shared/repo-discovery.md` (two-path detection, the "Repos to modify" precedence rules, per-item repo tags, and the single-repo shortcut). Each Path-2 repo is its own checkout in its own sibling folder with its own feature branch.

**The worktree root supersedes the repo root once a worktree exists.** Whichever of the above
resolved the "repo root" (a supplied `Repo path:`, or this section's own discovery), that value
is only the starting point — per `../../support/shared/standards.md` → "Workspace Isolation", the next
step in "Implementation Planning" below creates or verifies an isolated worktree for that repo,
and from that point forward the **worktree root**, not the plain repo root, is "the resolved repo
root" for every remaining step (implementation, commits, PR creation). Before creating a new
worktree, always check live for an existing one: run `git -C <repo root> worktree list
--porcelain` and match the entry whose branch equals this story's feature branch name — per
`../../support/shared/standards.md` → "Workspace Isolation". If found, treat it as authoritative immediately and `cd` there — do not create a second
worktree. If not found, create one. The multi-repo path below performs this same lookup
independently per repo, in its own per-repo pass, as described in "Multi-repo path" → Step 3.

---

## Implementation Planning (when story ID and spec are loaded)

### Single-repo path (one repo named or field absent)

After loading the Claude Instructions spec, invoke the planning skill:

> Invoke Skill: `writing-plans`
>
> OVERRIDE: The plan is a human-readable artifact saved to a local file — render it as a
> standalone HTML document per the Output Format rules in `../../support/shared/standards.md`, and
> save to `./.scratch/tmp/YYYY-MM-DD-<story-id>-plan.html`.
> NEVER save to `docs/` or any subdirectory (including `docs/superpowers/plans/`).
> `.scratch/` is gitignored — this file must never be committed.
> Use the Claude Instructions spec as the feature description input.

After the plan is written, execute it inline in this session — there are no subagents:

> Invoke Skill: `executing-plans`
>
> REQUIRED: Set up workspace isolation before implementation starts, per
> `../../support/shared/standards.md` → "Workspace Isolation" — the worktree carries the feature
> branch (see "Repo Discovery" above and "Branch Management" for why it is never checked
> out in the primary checkout first). Worktree isolation is required for this task —
> proceed without asking; if baseline tests fail, report the failure and stop rather than
> asking whether to proceed. When this reaches a nested `finishing-a-development-branch`
> invocation, pass it the cleanup instruction that skill needs (preserve the worktree; a
> human iterates on PR feedback there), not the creation requirement above — that skill
> only tears down, it never creates a workspace.
>
> Work through the plan task by task: for each task write a failing test, make it pass,
> refactor, and commit. After each task, re-read the task's requirements and verify the
> change against them before moving on.

### Multi-repo path (two or more repos named in "Repos to modify")

Move the story to **"In Development" exactly once** — at the start of the entire run, before any per-repo work begins. Do NOT repeat this transition per repo.

**State ownership:** developing owns the "In Development" transition; writing-specs owns "Ready for Dev". Each skill fires only its own transition — never the other's.

#### Step 1 — Infer the cross-repo dependency graph

Examine each repo's Claude Instructions spec for inter-repo dependencies. A dependency exists when one repo's spec consumes an artifact that another repo's spec introduces — for example: an HTTP endpoint, a shared data contract, a published package, an event schema, or an output file. Identify all such producer → consumer edges.

Topologically sort the repos into **dependency levels**:

- **Level 0:** repos with no dependency on any other repo in the set (they can start immediately).
- **Level 1:** repos whose only dependencies are on Level 0 repos.
- **Level N:** repos whose dependencies are fully satisfied by levels 0 … N-1.
- Repos with no detected dependency between them sit at the same level and are processed one after another.

Display the computed dependency graph and level groupings to the user before proceeding.

#### Step 2 — Order the per-repo work

Process the repos **one at a time** in the order produced by Step 1 (Level 0 first, then
Level 1, and so on). Repos at the same level have no dependency between them, so any order
among them is fine. Keep a visible checklist of the repos in order, for example:

```
1. repo-a (Level 0)
2. repo-b (Level 0)
3. repo-c (Level 1, after 1 and 2)
```

#### Step 3 — Execute repo by repo

There are no subagents: you implement every repo yourself, in this session, finishing one
repo completely before starting the next. For each repo in order:

1. Invoke `writing-plans` for that repo (using that repo's spec) and save the plan to
   `./.scratch/tmp/YYYY-MM-DD-<story-id>-<repo-name>-plan.html`.
2. Establish workspace isolation per `../../support/shared/standards.md` → "Workspace Isolation":
   check live for an existing worktree for this repo — `git -C <repo root> worktree list
--porcelain`, matching the entry whose branch equals this story's feature branch — and
   work there if found; otherwise create one. Worktree isolation is required for this task —
   proceed without asking; if baseline tests fail, report the failure and stop rather than
   asking whether to proceed. When this reaches a nested `finishing-a-development-branch`
   invocation, pass it the cleanup instruction that skill needs (preserve the worktree for
   PR-feedback iteration), not the creation requirement — that skill only tears down.
3. Implement the plan directly, following the full Development Standards below (TDD, no
   placeholder code, and so on): for each task write a failing test, make it pass,
   refactor, and commit. Invoke `executing-plans` only if it helps; do not use any skill
   that spawns subagents.
4. Run the Internal Code Review and the Code Comment Compliance Check
   (`../../support/shared/code-comment-check.md`) for this repo, then open this repo's PR from
   inside its worktree (Step 4).
5. Only after this repo's PR is open and attached to the story, start the next repo. If a
   repo fails, stop, diagnose, fix, and retry it before advancing — a later repo never
   starts on top of a failed dependency.

#### Step 4 — Open one PR per repo

For each repo, once it passes its internal code review, open its PR yourself from inside
its own worktree — this keeps `gh pr create` running in the same workspace that has the
implementation checked out. Every PR must:

- Reference the single shared story using the PM adapter's "Story Reference in PRs" format.
- Follow all PR Creation Requirements below.

Attach each PR to the story as an external link via the PM adapter right after creating it.
Nothing about the worktree path is recorded — a later reader resolves each repo's worktree
live, per `../../support/shared/standards.md` → "Workspace Isolation".

---

## Development Standards

1. **Test Driven Development** — Write failing tests first. Tests should fail until implementation is correct, then pass.

   Apply the full RED-GREEN-REFACTOR cycle:

   > Invoke Skill: `test-driven-development`
   > Use this for each distinct behavior being implemented.

   **Process Fidelity applies here (see `../../support/shared/standards.md` → "Process Fidelity").** Skipping RED-GREEN-REFACTOR for a given behavior, or deviating from the per-repo implementation plan, requires asking the user for explicit permission first — it is never a silent judgment call.

2. **Respect existing architecture patterns** — Study the codebase structure before making changes
3. **No placeholder code** — Always implement full functionality. If unable, stop and ask for help
4. **For database changes** — Update appropriate DAO, Entity classes, and Migrations
5. **Test before completion** — Run tests and fix all errors before considering work done

---

## Debugging and Problem Solving

- Never give up when debugging. If stuck, ask for help — see `../../support/shared/standards.md` → "Problem Solving" for the full principles (goal vs. mechanical exit condition, investigate before accepting a gap, verify reported claims)
- If unable to access a screenshot, mockup, or attachment referenced in requirements — STOP and ask the user. Do not proceed with incomplete data.
- Use `gh api` instead of `gh pr` when reading PR comments and file comments
- Always run `git status` after committing to ensure nothing was missed

---

## Commit and PR Process

- **Commit frequently** with descriptive messages explaining what was accomplished
- **NEVER** commit to main
- **NEVER** skip commit hooks
- **NO boilerplate** — Never include "Co-Authored by Claude", "Generated with Claude Code", or any AI attribution in commits or PRs
- **ALWAYS commit and push** after completing work — never leave work uncommitted
- **MANDATORY: Create PR after successful implementation** using `gh pr create`
- **Clean PR descriptions** — focus on what was changed and why

---

## PR Creation Requirements

When creating the PR:

- Title should be concise and descriptive
- Body must include:
  - **Summary**: Brief description of changes
  - **Story Reference**: Link using PM adapter's "Story Reference in PRs" format (omit this section if there is no story ID)
  - **How to Test**: Testing steps from Claude Instructions if available, otherwise based on changes made
- NO AI-generated boilerplate or mentions of AI tools

---

## Internal Code Review (when story ID provided)

After the implementation for a repo is complete, review it yourself before creating that repo's PR:

> Invoke Skill: `requesting-code-review`
>
> There is no code-reviewer subagent. Perform the review in this session as a deliberate,
> separate pass: set aside your implementation reasoning and review the diff as if you had
> not written it, using:
>
> - The Claude Instructions spec for this repo as the expected-functionality reference
> - The story acceptance criteria
> - The diff of all changes made during implementation in this repo
>
> Address any required changes before proceeding to PR creation.

**Multi-repo note:** this review runs once per repo, as part of that repo's pass, before its PR is opened (Step 4) — do not wait for all repos to finish before reviewing each one.

This step is the whole-implementation review before the PR is opened; run it for every repo.

---

## Pre-Completion Verification

Before declaring work complete, run the steps below in order.

### Code Comment Compliance Check

Read and follow `../../support/shared/code-comment-check.md` in full — the base-ref resolution, diff
commands, comment-marker table, regex patterns, blocking policy, and multi-repo execution scope
all live there (shared with `addressing-pr-comments/SKILL.md`, which runs the identical check).

### Terraform Plan Check (if applicable)

Detect whether terraform files were changed in this branch. First, fetch the remote to ensure the default branch ref is up to date:

```bash
git fetch origin
```

Then diff against the remote default branch:

```bash
git diff origin/HEAD --name-only
```

Look for any files ending in `.tf` or located inside a `tf/` path.

**If no terraform files changed:** Skip this section and proceed to the verification skill below.

**If terraform files changed:** Check whether a CI terraform plan workflow ran for this branch. First get the current branch name:

```bash
git branch --show-current
```

Then check CI runs:

```bash
gh run list --branch <current-branch> --json conclusion,status,name,createdAt,workflowName --limit 25
```

Look for any workflow whose name contains "terraform" (case-insensitive).

- **CI terraform run found and passed:** No additional action needed — CI has already validated the plan. Continue to the verification skill below.
- **CI terraform run found and failed:** The CI terraform plan failed. Do not declare work complete — fix the plan failure and re-run CI before proceeding.
- **CI terraform workflow is still `in_progress`:** Wait for it to complete. Re-run the `gh run list` command every 2 minutes until the run reaches a terminal conclusion (success, failure, or cancelled). Cap the wait at 30 minutes total. If the run has not completed after 30 minutes, note a warning and continue to the verification skill below.
- **No CI terraform run found:** Run `terraform plan` directly. Use the same directory detection as reviewing-prs Phase 3: check for `tf/` first, then `terraform/`, then fall back to the directory of the changed `.tf` files. For example, if `tf/` exists:

  ```bash
  terraform -chdir=tf/ plan
  ```

  - **`terraform` is not installed on the machine:** Note that terraform validation was not possible due to the missing CLI. Continue to the verification skill below with a warning.
  - **Plan exits with a non-zero exit code:** Do not declare work complete — fix the plan failure before proceeding.
  - **Plan exits with exit code 0:**

    Capture the full plan output. Before including it in the PR description, consider omitting any sensitive attribute values (ARNs, account IDs, IP ranges, secret resource references) from the output.

    If a PR already exists for this branch, append the plan output to the PR description using `--body-file` to avoid shell injection from plan output that may contain backticks or `$()`:

    1. Read the current PR body:

       ```bash
       gh pr view --json body -q .body
       ```

    2. Write the combined body (existing content + the Terraform Plan section) to `.scratch/pr-body-updated.txt` using the Write tool.

    3. Update the PR description:

       ```bash
       gh pr edit --body-file .scratch/pr-body-updated.txt
       ```

    4. Delete the scratch file:

       ```bash
       rm .scratch/pr-body-updated.txt
       ```

    If no PR exists yet, save the plan output to `.scratch/terraform-plan.txt` — you will include it in the PR description when you create the PR.

  Then continue to the verification skill below.

### Final Verification

> Invoke Skill: `verification-before-completion`
>
> Verify with fresh command execution (not memory of previous runs):
>
> - All tests pass (run the full test suite now)
> - Code is pushed to remote
> - PR exists and is not draft

---

## Adversarial Review (when story ID provided)

If the "No Story ID Path" was used (no PM story), skip this section — there is no independent story/spec to form expectations against.

Read and follow the adversarial review procedure in `../../support/shared/adversarial-review.md` with these context variables:

- `story_id`: the story ID from PM Context
- `review_target`: "code changes on branch"
- `review_context`: the Claude Instructions spec loaded during PM Context

---

## Completion Criteria

- All changes are committed with clean messages
- All tests pass
- Code is pushed to remote branch
- PR is created with clean, professional description linking the story
- **Worktree cleanup is manual when this skill runs standalone.** A human invoking `developing <story-id>` directly has no such reclamation point — nothing here removes the worktree this run created. Look it up live via `git -C <repo root> worktree list --porcelain` (matching the entry whose branch is this story's feature branch), note the path, and once the PR is merged the human should run `git -C <repo root> worktree remove <path>` followed by `git -C <repo root> worktree prune` (or delegate to `finishing-a-development-branch`).

---

## Debugging and Problem Solving

- Never give up when debugging. If stuck, ask for help — see `../../support/shared/standards.md` → "Problem Solving" for the full principles (goal vs. mechanical exit condition, investigate before accepting a gap, verify reported claims)
- If unable to access a screenshot, mockup, or attachment referenced in requirements — STOP and ask the user. Do not proceed with incomplete data.
- Use `gh api` instead of `gh pr` when reading PR comments and file comments
- Always run `git status` after committing to ensure nothing was missed
