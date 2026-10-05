import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { names, temporaryDirectory } from "./fixtures.ts";
import { startSession } from "./session-fixtures.ts";

const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

function checkShippedText(path: string, content: string) {
  assert.doesNotMatch(
    content,
    /\/opt\/|CLAUDE_PLUGIN_ROOT|~\/.claude\/dev-workflow\/config|gh-as-app\.sh/,
    path,
  );
  assert.doesNotMatch(
    content,
    /name:\s*(?:dev-workflow-|company-dev-workflow-)/,
    path,
  );
  assert.doesNotMatch(
    content,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    path,
  );
}

test("packed root loads complete portable resources without test fixtures", async (t) => {
  // Why: a local checkout must not conceal missing package files or accidental artifact exposure.
  const scratch = temporaryDirectory(t);
  const output = execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", scratch],
    { cwd: packageRoot, encoding: "utf8" },
  );
  const [pack] = JSON.parse(output) as {
    filename: string;
    files: { path: string }[];
  }[];
  const entries = pack.files.map((file) => file.path);
  assert.ok(entries.includes("pi/dev-loop/index.ts"));
  assert.ok(
    !entries.some((file) =>
      /(?:^|\/)(?:tests|node_modules|.scratch|.worktrees)(?:\/|$)/.test(file),
    ),
  );
  const unpack = join(scratch, "relocated package");
  mkdirSync(unpack);
  execFileSync("tar", ["-xzf", join(scratch, pack.filename), "-C", unpack]);
  const root = join(unpack, "package");
  const inventory = JSON.parse(
    readFileSync(join(root, "pi/dev-loop/resources.json"), "utf8"),
  ) as string[];
  for (const file of inventory)
    assert.ok(entries.includes("pi/dev-loop/" + file), file);
  for (const file of entries) {
    if (/\.(?:md|ts|json|html)$/.test(file))
      checkShippedText(file, readFileSync(join(root, file), "utf8"));
  }
  const { session, errors } = await startSession(t, [root]);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    session.resourceLoader
      .getSkills()
      .skills.map((skill) => skill.name)
      .sort(),
    [...names, "unrelated"].sort(),
  );
});

test("artifact guard catches leaked secrets and stale installation references", () => {
  // Why: packaging checks must reject dangerous fixture content rather than always passing.
  for (const content of [
    "/opt/old-install/support.md",
    "CLAUDE_PLUGIN_ROOT",
    "-----BEGIN PRIVATE KEY-----",
    "name: dev-workflow-developing",
  ]) {
    assert.throws(() => checkShippedText("fixture", content));
  }
});

test("loading preserves existing configuration and adapter overrides", async (t) => {
  // Why: package upgrades must not replace user-owned workflow state.
  const { session, agentDir } = await startSession(t, [packageRoot]);
  const workflow = join(agentDir, "dev-workflow");
  mkdirSync(join(workflow, "adapters/pm-adapter"), { recursive: true });
  const configPath = join(workflow, "config.json");
  const adapterPath = join(workflow, "adapters/pm-adapter/shortcut.md");
  const config = '{ "pm_adapter": "shortcut", "custom": true }\n';
  const adapter = "# Local override\nCustom workflow.\n";
  writeFileSync(configPath, config);
  writeFileSync(adapterPath, adapter);
  await session.reload();
  await session.reload();
  assert.equal(readFileSync(configPath, "utf8"), config);
  assert.equal(readFileSync(adapterPath, "utf8"), adapter);
});
