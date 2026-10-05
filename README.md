# ai-rations

Portable skills and extensions for Pi.

## Development workflows

The `pi/dev-loop` extension exposes these workflows:

- `/skill:dev-loop-developing`
- `/skill:dev-loop-debugging`
- `/skill:dev-loop-writing-specs`
- `/skill:dev-loop-creating-stories`
- `/skill:dev-loop-reviewing-prs`
- `/skill:dev-loop-testing-prs`
- `/skill:dev-loop-addressing-pr-comments`

Debugging accepts no arguments for investigation, a story ID for development, or a story ID plus `--rework` for review-driven rework. Public reworking is a debugging mode, not a separate skill.

Work executes inline. Full-cycle, epic, role sessions, subagents, and orchestration telemetry are not included.

## Installation

The repository root is a Pi package. Load the package root, not its skills directory:

```sh
pi install /absolute/path/to/ai-rations
```

The manifest registers `pi/dev-loop/index.ts`. Do not separately register `pi/dev-loop/skills`; the extension selects the visible provider during resource discovery.

Host requirements: Node 22.19.0 or newer and Pi 1.0.2. Development uses TypeScript and Pi's SDK. Methodology skills and workflow external tools are prerequisites; this package does not install or replace them. See [runtime prerequisites](pi/dev-loop/support/shared/runtime.md).

## Configuration

Keep `~/.pi/agent/dev-workflow/config.json` and `~/.pi/agent/dev-workflow/adapters/`. `PI_CODING_AGENT_DIR` changes the agent directory; the extension supplies its resolved paths to workflows.

For a new configuration, create the file yourself with the adapter choices you use:

```json
{
  "pm_adapter": "shortcut",
  "notes_adapter": "local",
  "adapters": {
    "shortcut": { "story_id_prefix": "sc-" },
    "local": { "specs_path": "docs/specs" }
  }
}
```

Existing files are never overwritten. Local notes also accept absolute directories or a full filename template with `{story-id}` and `{repo}`. User adapter overrides are read before bundled adapters. Only missing or empty overrides permit fallback; other errors stop the workflow.

## Development

```sh
npm ci
npm run check
```

Tests use disposable directories under `.scratch/tmp`. They do not create stories, submit reviews, or perform GitHub mutations.

See [migration inventory](pi/dev-loop/MIGRATION.md) for provenance and retained behavior.
