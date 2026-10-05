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

## Wrapper contract

A wrapper package registers its extension, with no static skills. Both packages must load; the public extension is the sole publisher of selected skill paths.

Listen on `dev-loop:providers` and synchronously call the request's `register(declaration)` once. Declare even broken installations; the publisher validates resources before exposure. Do not await I/O before registration.

```ts
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  ACTIONS,
  type ProviderRequest,
} from "@toa5ter/ai-rations/pi/dev-loop/provider-contract.ts";

export default function wrapper(pi: ExtensionAPI) {
  const root = dirname(fileURLToPath(import.meta.url));
  pi.events.on("dev-loop:providers", (data) => {
    (data as ProviderRequest).register({
      version: 1,
      id: "example-policy",
      root,
      skills: Object.fromEntries(
        ACTIONS.map((action) => [
          `dev-loop-${action}`,
          join(root, "skills", `dev-loop-${action}`, "SKILL.md"),
        ]),
      ),
      requiredFiles: [join(root, "standards.md")],
    });
  });
}
```

All public actions are required. Wrappers can add other `dev-loop-*` actions, except excluded orchestration actions. Resource paths must be absolute regular files inside the provider's real root. Skill names and descriptions must be valid, and selected skills must remain model-visible. Include all required support files in `requiredFiles`.

The unversioned event channel makes unsupported payload versions observable. The public publisher rejects incompatible versions, incomplete declarations, absent resources, and competing wrappers. It exposes no workflows on failure and reports a repair-and-reload diagnostic. Unrelated resources remain available.

For internal base lookup, emit `dev-loop:base` with an `accept(base)` callback. A healthy public extension synchronously replies with `{version: 1, skills}`, mapping public action names to absolute paths. No reply means base resolution failed or the public extension is absent; stop rather than guessing an installation path.

Wrapper instructions apply policy first, then read their action's exact public base path from runtime context, retaining arguments. Cross-workflow transitions use the selected skill catalog, so policy applies again. Direct base reads are not separate slash commands or a security boundary.

Remove a wrapper package and use `/reload` to restore public discovery; reinstall and reload to select it again. Extension-load failures before a wrapper advertises itself cannot be detected by this protocol. Managed installations must check that their expected wrapper loaded successfully.

## Verification and removal

Automated checks exercise Pi session startup and reload, command expansion with a local deterministic model, provider failures, configuration preservation, and an extracted npm archive. The deterministic model checks request transport; it does not prove an LLM follows workflow instructions.

For interactive verification in an isolated agent directory:

1. Load the package root and required methodology skills.
2. Inspect `/skill:` completion for the supported names, each once.
3. Invoke `/skill:dev-loop-writing-specs` without an ID. It should ask for the ID without creating a story or spec.
4. Invoke debugging's safe intake with a test argument and stop before external mutations.
5. Load a generic wrapper in either package order; inspect completion and selected resource paths.
6. Reload twice, remove/reinstall the wrapper, and verify the visible selection changes.
7. Break a declared fixture resource and confirm the diagnostic and unavailable workflows.

SDK callers using a custom agentDir should set `PI_CODING_AGENT_DIR` to the same directory for extension configuration resolution.

To uninstall, remove the package using Pi's package settings or `pi remove /absolute/path/to/ai-rations`, then reload. Configuration and adapter overrides remain user-owned.

## Development

```sh
npm ci
npm run check
```

Tests use disposable directories under `.scratch/tmp`. They do not create stories, submit reviews, or perform GitHub mutations.

See [migration inventory](pi/dev-loop/MIGRATION.md) for provenance and retained behavior.
