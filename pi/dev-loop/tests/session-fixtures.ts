import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestContext } from "node:test";
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
  type InlineExtension,
} from "@earendil-works/pi-coding-agent";
import type { Provider } from "../provider-contract.ts";
import { temporaryDirectory } from "./fixtures.ts";

export function wrapperPackage(provider: Provider): string {
  writeFileSync(
    join(provider.root, "package.json"),
    JSON.stringify({
      name: "fixture-wrapper",
      type: "module",
      pi: { extensions: ["index.ts"], skills: [] },
    }),
  );
  writeFileSync(
    join(provider.root, "index.ts"),
    `export default function(pi) {
    pi.events.on("dev-loop:providers", request => request.register(${JSON.stringify(provider)}));
  }`,
  );
  return provider.root;
}

export async function startSession(
  t: TestContext,
  packages: string[],
  extensionFactories: InlineExtension[] = [],
) {
  const cwd = temporaryDirectory(t);
  const agentDir = temporaryDirectory(t);
  const unrelated = join(cwd, "unrelated", "SKILL.md");
  mkdirSync(join(cwd, "unrelated"));
  writeFileSync(
    unrelated,
    "---\nname: unrelated\ndescription: Other resource\n---\nOther instructions.",
  );
  const settings = SettingsManager.inMemory({
    packages,
    defaultProjectTrust: "always",
    compaction: { enabled: false },
    retry: { enabled: false },
    cacheWarming: "off",
  });
  const loader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager: settings,
    additionalSkillPaths: [unrelated],
    extensionFactories,
    noContextFiles: true,
    noThemes: true,
    noPromptTemplates: true,
  });
  await loader.reload();
  const result = await createAgentSession({
    cwd,
    agentDir,
    settingsManager: settings,
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
    tools: ["read"],
  });
  t.after(() => result.session.dispose());
  const errors: unknown[] = [...result.extensionsResult.errors];
  await result.session.bindExtensions({
    onError: (error) => errors.push(error),
  });
  return { session: result.session, settings, errors, agentDir };
}
