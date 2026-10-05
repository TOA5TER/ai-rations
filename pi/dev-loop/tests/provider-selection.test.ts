import assert from "node:assert/strict";
import { rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { selectProvider, publicProvider } from "../provider-selection.ts";
import {
  addSkill,
  makeProvider,
  names,
  temporaryDirectory,
} from "./fixtures.ts";
import type { Provider } from "../provider-contract.ts";

test("standalone selects public files and retains the base map", (t) => {
  // Why: a standalone install must expose usable public workflow paths.
  const base = makeProvider(t);
  const result = selectProvider(base, []);
  assert.equal(result.provider.id, "public");
  assert.deepEqual(
    Object.keys(result.provider.skills).sort(),
    [...names].sort(),
  );
  assert.equal(
    result.base.skills["dev-loop-debugging"],
    base.skills["dev-loop-debugging"],
  );
});

test("a complete wrapper replaces exposure and can add an action", (t) => {
  // Why: wrapper-specific workflows must coexist with internal public delegation.
  const base = makeProvider(t);
  const wrapper = makeProvider(t, "fixture");
  addSkill(wrapper, "dev-loop-reworking");
  const result = selectProvider(base, [wrapper]);
  assert.deepEqual(
    Object.keys(result.provider.skills).sort(),
    [...names, "dev-loop-reworking"].sort(),
  );
  assert.equal(
    result.provider.skills["dev-loop-debugging"],
    wrapper.skills["dev-loop-debugging"],
  );
  assert.equal(
    result.base.skills["dev-loop-debugging"],
    base.skills["dev-loop-debugging"],
  );
  assert.ok(
    Object.values(result.provider.skills).every((path) =>
      path.startsWith(wrapper.root),
    ),
  );
});

const invalid: [string, (p: Provider) => unknown, RegExp][] = [
  ["wrong version", (p) => ({ ...p, version: 99 }), /version/i],
  ["null declaration", () => null, /declaration/i],
  ["empty identifier", (p) => ({ ...p, id: "" }), /id/i],
  ["reserved identifier", (p) => ({ ...p, id: "public" }), /reserved/i],
  [
    "missing core action",
    (p) => {
      delete p.skills["dev-loop-debugging"];
      return p;
    },
    /debugging/i,
  ],
  ["relative root", (p) => ({ ...p, root: "." }), /absolute/i],
  [
    "relative skill path",
    (p) => {
      p.skills["dev-loop-debugging"] = "SKILL.md";
      return p;
    },
    /absolute/i,
  ],
  ["malformed skills", (p) => ({ ...p, skills: [] }), /skills/i],
  [
    "malformed support list",
    (p) => ({ ...p, requiredFiles: null }),
    /requiredFiles/i,
  ],
  [
    "non-string path",
    (p) => ({ ...p, skills: { ...p.skills, "dev-loop-debugging": 2 } }),
    /path/i,
  ],
  [
    "missing skill",
    (p) => {
      rmSync(p.skills["dev-loop-debugging"]);
      return p;
    },
    /debugging/i,
  ],
  [
    "missing support",
    (p) => {
      rmSync(p.requiredFiles[0]);
      return p;
    },
    /standards/i,
  ],
  [
    "wrong frontmatter name",
    (p) => {
      writeFileSync(
        p.skills["dev-loop-debugging"],
        "---\nname: other\ndescription: Fine\n---\nBody",
      );
      return p;
    },
    /name/i,
  ],
  [
    "missing description",
    (p) => {
      writeFileSync(
        p.skills["dev-loop-debugging"],
        "---\nname: dev-loop-debugging\n---\nBody",
      );
      return p;
    },
    /description/i,
  ],
  [
    "duplicate paths",
    (p) => {
      p.skills["dev-loop-debugging"] = p.skills["dev-loop-developing"];
      return p;
    },
    /duplicate|name/i,
  ],
  [
    "excluded epic",
    (p) => {
      addSkill(p, "dev-loop-epic");
      return p;
    },
    /unsupported/i,
  ],
  [
    "excluded full-cycle",
    (p) => {
      addSkill(p, "dev-loop-full-cycle");
      return p;
    },
    /unsupported/i,
  ],
  [
    "wrong prefix",
    (p) => ({
      ...p,
      skills: { ...p.skills, other: p.skills["dev-loop-debugging"] },
    }),
    /name/i,
  ],
];
for (const [name, mutate, error] of invalid) {
  test("rejects " + name + " without public fallback", (t) => {
    // Why: invalid declarations must not bypass wrapper policy through public fallback.
    const base = makeProvider(t);
    const wrapper = makeProvider(t, "fixture");
    assert.throws(() => selectProvider(base, [mutate(wrapper)]), error);
  });
}

test("competing providers conflict even when IDs match", (t) => {
  // Why: discovery ordering must never arbitrate between advertised policies.
  const base = makeProvider(t);
  for (const id of ["same", "different"]) {
    assert.throws(
      () =>
        selectProvider(base, [makeProvider(t, "same"), makeProvider(t, id)]),
      /conflict/i,
    );
  }
});

test("valid wrapper cannot conceal a missing base resource", (t) => {
  // Why: direct base delegation must remain usable in a wrapped installation.
  const base = makeProvider(t);
  rmSync(base.skills["dev-loop-debugging"]);
  assert.throws(
    () => selectProvider(base, [makeProvider(t, "fixture")]),
    /debugging/i,
  );
});

test("symlinks outside the declared root are rejected", (t) => {
  // Why: provider validation must check actual targets rather than lexical containment.
  const base = makeProvider(t);
  const wrapper = makeProvider(t, "fixture");
  rmSync(wrapper.skills["dev-loop-debugging"]);
  symlinkSync(
    base.skills["dev-loop-debugging"],
    wrapper.skills["dev-loop-debugging"],
  );
  assert.throws(() => selectProvider(base, [wrapper]), /outside/i);
});

test("public inventory resolves support and workflow paths from its install root", (t) => {
  // Why: relocating a package must not retain source-checkout paths.
  const root = temporaryDirectory(t);
  writeFileSync(
    join(root, "resources.json"),
    JSON.stringify(["support/shared/runtime.md"]),
  );
  const provider = publicProvider(root);
  assert.equal(
    provider.skills["dev-loop-debugging"],
    resolve(root, "skills/dev-loop-debugging/SKILL.md"),
  );
  assert.deepEqual(provider.requiredFiles, [
    resolve(root, "support/shared/runtime.md"),
  ]);
});

test("malformed public inventories fail rather than hiding absent resources", (t) => {
  // Why: damaged package metadata must not silently weaken resource validation.
  const root = temporaryDirectory(t);
  for (const inventory of [{}, [], ["../escape.md"], [2]]) {
    writeFileSync(join(root, "resources.json"), JSON.stringify(inventory));
    assert.throws(() => publicProvider(root), /inventory|resources/i);
  }
});
