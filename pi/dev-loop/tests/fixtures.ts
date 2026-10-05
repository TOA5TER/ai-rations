import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import type { TestContext } from "node:test";
import type { Provider } from "../provider-contract.ts";

export const names = [
  "dev-loop-developing",
  "dev-loop-debugging",
  "dev-loop-writing-specs",
  "dev-loop-creating-stories",
  "dev-loop-reviewing-prs",
  "dev-loop-testing-prs",
  "dev-loop-addressing-pr-comments",
] as const;

export function temporaryDirectory(t: TestContext): string {
  mkdirSync(".scratch/tmp", { recursive: true });
  const root = mkdtempSync(resolve(".scratch/tmp/provider-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

export function addSkill(
  provider: Provider,
  name: `dev-loop-${string}`,
): string {
  const path = join(provider.root, name, "SKILL.md");
  mkdirSync(join(provider.root, name), { recursive: true });
  writeFileSync(
    path,
    `---\nname: ${name}\ndescription: Fixture workflow\n---\nFollow ${provider.id} instructions.\n`,
  );
  provider.skills[name] = path;
  return path;
}

export function makeProvider(t: TestContext, id = "public"): Provider {
  const root = temporaryDirectory(t);
  const support = join(root, "standards.md");
  writeFileSync(support, "Approval and verification gates.\n");
  const provider: Provider = {
    version: 1,
    id,
    root,
    skills: {},
    requiredFiles: [support],
  };
  for (const name of names) addSkill(provider, name);
  return provider;
}
