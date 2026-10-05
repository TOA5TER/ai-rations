import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createEventBus,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import extension from "../index.ts";
import {
  BASE_REQUEST,
  PROVIDER_REQUEST,
  type BaseRequest,
  type ProviderRequest,
} from "../provider-contract.ts";
import { makeProvider, names, temporaryDirectory } from "./fixtures.ts";

function setup() {
  const events = createEventBus();
  const handlers = new Map<string, (event: unknown) => unknown>();
  const pi = {
    events,
    on(name: string, handler: (event: unknown) => unknown) {
      handlers.set(name, handler);
    },
  } as unknown as ExtensionAPI;
  return {
    pi,
    events,
    handlers,
    discover: () =>
      handlers.get("resources_discover")!({ type: "resources_discover" }) as {
        skillPaths: string[];
      },
    prompt: () =>
      handlers.get("before_agent_start")!({
        systemPrompt: "unrelated prompt",
      }) as { systemPrompt: string },
  };
}

for (const order of ["public-first", "wrapper-first"]) {
  test(order + " selects wrapper paths with readable internal bases", (t) => {
    // Why: extension load ordering must not change which policy is exposed.
    const fixture = setup();
    const wrapper = makeProvider(t, "fixture");
    if (order === "public-first") extension(fixture.pi);
    fixture.events.on(PROVIDER_REQUEST, (r) =>
      (r as ProviderRequest).register(wrapper),
    );
    if (order === "wrapper-first") extension(fixture.pi);
    assert.deepEqual(
      fixture.discover().skillPaths.sort(),
      Object.values(wrapper.skills).sort(),
    );
    let basePath: string | undefined;
    fixture.events.emit(BASE_REQUEST, {
      accept(base) {
        basePath = base.skills["dev-loop-debugging"];
      },
    } satisfies BaseRequest);
    assert.ok(basePath);
    assert.ok(
      readFileSync(basePath, "utf8").includes("name: dev-loop-debugging"),
    );
    assert.notEqual(basePath, wrapper.skills["dev-loop-debugging"]);
    assert.ok(fixture.prompt().systemPrompt.startsWith("unrelated prompt"));
    assert.ok(
      fixture
        .prompt()
        .systemPrompt.includes(wrapper.skills["dev-loop-debugging"]),
    );
  });
}

test("removal and reinstall replace previous discovery state", (t) => {
  // Why: stale provider paths must not survive the next discovery.
  const fixture = setup();
  extension(fixture.pi);
  const publicPaths = fixture.discover().skillPaths;
  assert.equal(publicPaths.length, 7);
  const wrapper = makeProvider(t, "fixture");
  const off = fixture.events.on(PROVIDER_REQUEST, (r) =>
    (r as ProviderRequest).register(wrapper),
  );
  assert.deepEqual(
    fixture.discover().skillPaths.sort(),
    Object.values(wrapper.skills).sort(),
  );
  off();
  assert.deepEqual(fixture.discover().skillPaths, publicPaths);
  assert.ok(!fixture.prompt().systemPrompt.includes(wrapper.root));
  fixture.events.on(PROVIDER_REQUEST, (r) =>
    (r as ProviderRequest).register(wrapper),
  );
  assert.deepEqual(
    fixture.discover().skillPaths.sort(),
    Object.values(wrapper.skills).sort(),
  );
});

test("malformed declaration invalidates previous successful selection", () => {
  // Why: event-bus error swallowing must not conceal invalid advertised policy.
  const fixture = setup();
  extension(fixture.pi);
  fixture.discover();
  fixture.events.on(PROVIDER_REQUEST, (r) =>
    (r as ProviderRequest).register(null),
  );
  assert.throws(fixture.discover, /declaration/);
  const prompt = fixture.prompt().systemPrompt;
  assert.match(prompt, /unavailable/);
  assert.ok(!prompt.includes("base"));
});

test("runtime paths respect the active agent directory without creating config", (t) => {
  // Why: custom agent directories must retain user configuration ownership.
  const dir = join(temporaryDirectory(t), "custom agent");
  const previous = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = dir;
  t.after(() => {
    if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previous;
  });
  const fixture = setup();
  extension(fixture.pi);
  fixture.discover();
  const prompt = fixture.prompt().systemPrompt;
  assert.ok(prompt.includes(join(dir, "dev-workflow/config.json")));
  assert.ok(prompt.includes(join(dir, "dev-workflow/adapters")));
  assert.throws(
    () => readFileSync(join(dir, "dev-workflow/config.json")),
    /ENOENT/,
  );
  for (const name of names) assert.ok(prompt.includes(name));
});

test("late declarations are refused by the synchronous protocol", () => {
  // Why: delayed replies must not mutate a selection after resource publication.
  const fixture = setup();
  extension(fixture.pi);
  let request: ProviderRequest | undefined;
  fixture.events.on(PROVIDER_REQUEST, (r) => {
    request = r as ProviderRequest;
  });
  fixture.discover();
  assert.ok(request);
  assert.throws(() => request!.register(null), /synchronous/);
});
