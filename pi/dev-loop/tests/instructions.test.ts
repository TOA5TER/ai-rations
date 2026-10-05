import assert from "node:assert/strict";
import { cpSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { loadSkills } from "@earendil-works/pi-coding-agent";
import { publicProvider, selectProvider } from "../provider-selection.ts";
import { names, temporaryDirectory } from "./fixtures.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

test("the shipped skill tree loads with the public action catalog", (t) => {
  // Why: missing resources or invalid metadata must fail before workflow exposure.
  const provider = selectProvider(publicProvider(root), []).provider;
  const result = loadSkills({
    cwd: temporaryDirectory(t),
    agentDir: temporaryDirectory(t),
    skillPaths: Object.values(provider.skills),
    includeDefaults: false,
  });
  assert.deepEqual(
    result.skills.map((skill) => skill.name).sort(),
    [...names].sort(),
  );
  assert.deepEqual(result.diagnostics, []);
});

test("relocated instructions can resolve bundled file references", (t) => {
  // Why: internal reads must work without a source checkout or fixed install path.
  const copy = resolve(temporaryDirectory(t), "package with spaces");
  cpSync(root, copy, { recursive: true });
  const provider = selectProvider(publicProvider(copy), []).provider;
  for (const file of provider.requiredFiles) {
    if (!file.endsWith(".md")) continue;
    const content = readFileSync(file, "utf8");
    const paths = [
      ...content.matchAll(
        /(?:\x60|\]\()((?:\.\.\/|\.\/)[^\s\x60)]+\.(?:md|html))(?:\x60|\))/g,
      ),
    ];
    for (const match of paths) {
      if (match[1].startsWith("./.scratch/")) continue;
      const target = match[1]
        .replace("{pm_adapter}", "shortcut")
        .replace("{notes_adapter}", "local");
      assert.ok(
        statSync(resolve(dirname(file), target)).isFile(),
        file + ": " + target,
      );
    }
    assert.doesNotMatch(
      content,
      /\/opt\/|CLAUDE_PLUGIN_ROOT|dev-workflow:(?:developing|debugging|writing-specs)|gh-as-app\.sh/,
    );
  }
});

test("a removed bundled adapter prevents a superficially valid install", (t) => {
  // Why: skill files alone are insufficient for a working standalone package.
  const copy = resolve(temporaryDirectory(t), "damaged");
  cpSync(root, copy, { recursive: true });
  rmSync(resolve(copy, "support/pm-adapter/shortcut.md"));
  assert.throws(() => selectProvider(publicProvider(copy), []), /shortcut\.md/);
});
