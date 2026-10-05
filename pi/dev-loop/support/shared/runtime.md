# Pi runtime rules

These rules apply to every bundled workflow and support file.

- Run every stage inline and sequentially in this session. No subagents, background dispatch, model selection, role sessions, or orchestration telemetry.
- An instruction to invoke a skill means load its SKILL.md from Pi's selected skill catalog and follow it. Ask approval questions in a normal reply and wait for the answer. Keep a short progress checklist.
- Resolve bundled support-file references against the file containing the reference, including paths in backticks. Read referenced support before applying its rules. Repository investigation paths, shell commands, and output paths such as `./.scratch/tmp/` remain relative to the target repository or isolated worktree, not this package.
- The extension supplies current dev-loop runtime context. `{agentDir}` means Pi's active agent directory, resolved with `PI_CODING_AGENT_DIR` support. Its default is `~/.pi/agent`. Use the supplied absolute config and adapters paths; never interpret braces as literal directory names.
- Read the existing `dev-workflow/config.json` under that directory. Do not seed, rewrite, migrate, or overwrite configuration while loading a workflow. If absent or invalid, ask the user to configure it and stop before external mutations. Supported built-ins are Shortcut PM and local notes.
- Read the configured adapter override before the bundled fallback. Missing or empty overrides permit fallback. Other failures stop the workflow. Missing methodology skills or external tools require setup guidance, never silent installation.
- Wrapper standards already loaded remain in force. A wrapper delegates by reading its action's exact public base file from runtime context, with all original arguments and role rules unchanged. That direct read is internal; do not invoke the same named command recursively.
- For transitions to other workflows, load the active `dev-loop-*` skill from Pi's catalog. Do not bypass wrapper rules by choosing a base path for another stage.
- Public base files are readable implementation resources, not an access-control boundary. Failed provider selection makes these workflows unavailable until repaired; never bypass it with a direct read.
- Use installed native MCP tools for adapter operations. Discover available Shortcut tool names rather than assuming a separator or obsolete tool alias. No runtime code here sends PM or GitHub mutations.
- If a tool or workflow conflicts with these execution rules, follow these rules and preserve the workflow's approval and verification gates.

## Methodology prerequisites

Install compatible Pi skills for brainstorming, writing-plans, executing-plans, using-git-worktrees, test-driven-development, systematic-debugging, requesting-code-review, receiving-code-review, verification-before-completion, and finishing-a-development-branch. Reviews run as separate inline passes in this session. External policy enforcement and authentication remain installation responsibilities.
