import assert from "node:assert/strict";
import { cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  addSkill,
  makeProvider,
  names,
  temporaryDirectory,
} from "./fixtures.ts";
import { startSession, wrapperPackage } from "./session-fixtures.ts";

const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

test("real session startup and reload expose only public workflows", async (t) => {
  // Why: extension resources are discovered after the initial resource-loader pass.
  const { session, errors } = await startSession(t, [packageRoot]);
  for (let i = 0; i < 3; i++) {
    const result = session.resourceLoader.getSkills();
    assert.deepEqual(
      result.skills.map((s) => s.name).sort(),
      [...names, "unrelated"].sort(),
    );
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(errors, []);
    assert.ok(session.systemPrompt.includes("dev-loop-debugging"));
    await session.reload();
  }
});

for (const order of ["public-first", "wrapper-first"]) {
  test(
    "real session " + order + " exposes wrapper paths and extra action",
    async (t) => {
      // Why: resource publication must not depend on package load order.
      const wrapper = makeProvider(t, "fixture");
      addSkill(wrapper, "dev-loop-reworking");
      const path = wrapperPackage(wrapper);
      const { session, errors } = await startSession(
        t,
        order === "public-first" ? [packageRoot, path] : [path, packageRoot],
      );
      assert.deepEqual(errors, []);
      const result = session.resourceLoader.getSkills();
      assert.deepEqual(
        result.skills.map((s) => s.name).sort(),
        [...names, "dev-loop-reworking", "unrelated"].sort(),
      );
      for (const skill of result.skills.filter((s) => s.name !== "unrelated"))
        assert.ok(skill.filePath.startsWith(path), skill.filePath);
      assert.deepEqual(result.diagnostics, []);
    },
  );
}

test("real reload removes stale wrapper listeners and restores selection", async (t) => {
  // Why: replacing the extension runtime must clear previous provider declarations.
  const path = wrapperPackage(makeProvider(t, "fixture"));
  const { session, settings, errors } = await startSession(t, [
    packageRoot,
    path,
  ]);
  for (const packages of [
    [packageRoot, path],
    [packageRoot],
    [path, packageRoot],
  ]) {
    settings.setPackages(packages);
    await session.reload();
    const skill = session.resourceLoader
      .getSkills()
      .skills.find((s) => s.name === "dev-loop-debugging")!;
    assert.ok(
      skill.filePath.startsWith(packages.length === 1 ? packageRoot : path),
    );
    assert.deepEqual(session.resourceLoader.getSkills().diagnostics, []);
  }
  assert.deepEqual(errors, []);
});

for (const problem of [
  "conflict",
  "version",
  "wrapper-skill",
  "wrapper-support",
  "base-skill",
  "base-support",
]) {
  test("real session fails closed for " + problem, async (t) => {
    // Why: broken advertised resources must not leave usable unwrapped commands.
    const wrapper = makeProvider(t, "fixture");
    if (problem === "version") Object.assign(wrapper, { version: 2 });
    if (problem === "wrapper-skill")
      rmSync(wrapper.skills["dev-loop-debugging"]);
    if (problem === "wrapper-support") rmSync(wrapper.requiredFiles[0]);
    let base = packageRoot;
    if (problem.startsWith("base-")) {
      base = join(temporaryDirectory(t), "base");
      cpSync(join(packageRoot, "pi"), join(base, "pi"), { recursive: true });
      cpSync(join(packageRoot, "package.json"), join(base, "package.json"));
      rmSync(
        join(
          base,
          "pi/dev-loop",
          problem === "base-skill"
            ? "skills/dev-loop-debugging/SKILL.md"
            : "support/pm-adapter/shortcut.md",
        ),
      );
    }
    const packages = [base, wrapperPackage(wrapper)];
    if (problem === "conflict")
      packages.push(wrapperPackage(makeProvider(t, "another")));
    const { session, errors } = await startSession(t, packages);
    assert.deepEqual(
      session.resourceLoader.getSkills().skills.map((s) => s.name),
      ["unrelated"],
    );
    assert.ok(errors.length > 0, "expected actionable discovery error");
  });
}
