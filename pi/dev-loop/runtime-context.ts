import { join } from "node:path";
import type { Selection } from "./provider-contract.ts";

export function renderRuntimeContext(
  selection: Selection,
  agentDir: string,
): string {
  return [
    "dev-loop runtime context (current discovery):",
    JSON.stringify(
      {
        provider: selection.provider.id,
        agentDir,
        config: join(agentDir, "dev-workflow/config.json"),
        adapters: join(agentDir, "dev-workflow/adapters"),
        selected: selection.provider.skills,
        base: selection.base.skills,
      },
      null,
      2,
    ),
    "Wrapper delegation reads its exact base file with the original arguments and wrapper rules intact.",
    "Transitions to other workflows use the selected dev-loop skill, never a direct base read.",
  ].join("\n");
}
