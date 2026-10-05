import { fileURLToPath } from "node:url";
import {
  getAgentDir,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import {
  BASE_REQUEST,
  PROVIDER_REQUEST,
  type BaseRequest,
  type ProviderRequest,
  type Selection,
} from "./provider-contract.ts";
import { publicProvider, selectProvider } from "./provider-selection.ts";
import { renderRuntimeContext } from "./runtime-context.ts";

export default function devLoop(pi: ExtensionAPI) {
  const root = fileURLToPath(new URL(".", import.meta.url));
  let selection: Selection | undefined;
  let failure: string | undefined;

  pi.events.on(BASE_REQUEST, (data) => {
    (data as BaseRequest).accept(selectProvider(publicProvider(root), []).base);
  });

  pi.on("resources_discover", () => {
    selection = undefined;
    failure = undefined;
    const declarations: unknown[] = [];
    let accepting = true;
    const request: ProviderRequest = {
      register(declaration) {
        if (!accepting)
          throw new Error("dev-loop provider registration must be synchronous");
        declarations.push(declaration);
      },
    };
    try {
      pi.events.emit(PROVIDER_REQUEST, request);
      accepting = false;
      selection = selectProvider(publicProvider(root), declarations);
      return { skillPaths: Object.values(selection.provider.skills) };
    } catch (error) {
      accepting = false;
      failure = error instanceof Error ? error.message : String(error);
      throw error;
    }
  });

  pi.on("before_agent_start", (event) => {
    const context = selection
      ? renderRuntimeContext(selection, getAgentDir())
      : `dev-loop workflows unavailable: ${failure ?? "resource discovery has not completed"}. Do not run these workflows until repaired.`;
    return { systemPrompt: `${event.systemPrompt}\n\n${context}` };
  });
}
