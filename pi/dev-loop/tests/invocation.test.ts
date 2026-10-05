import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  createAssistantMessageEventStream,
  type AssistantMessage,
} from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { startSession, wrapperPackage } from "./session-fixtures.ts";
import { makeProvider } from "./fixtures.ts";

const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

for (const wrapped of [false, true]) {
  test(
    "skill expansion retains arguments and selected instructions " +
      (wrapped ? "wrapped" : "standalone"),
    async (t) => {
      // Why: visible skill commands must carry the selected body and original arguments into real requests.
      const requests: string[] = [];
      const capture = (pi: ExtensionAPI) => {
        pi.registerProvider("fixture", {
          api: "fixture-api",
          apiKey: "fixture-not-a-secret",
          baseUrl: "http://invalid.local",
          models: [
            {
              id: "capture",
              name: "Capture",
              reasoning: false,
              input: ["text"],
              contextWindow: 1000000,
              maxTokens: 16,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            },
          ],
          streamSimple(model, context) {
            requests.push(JSON.stringify(context));
            const stream = createAssistantMessageEventStream();
            const message: AssistantMessage = {
              role: "assistant",
              api: model.api,
              provider: model.provider,
              model: model.id,
              timestamp: Date.now(),
              content: [],
              stopReason: "stop",
              usage: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                totalTokens: 0,
                cost: {
                  input: 0,
                  output: 0,
                  cacheRead: 0,
                  cacheWrite: 0,
                  total: 0,
                },
              },
            };
            stream.push({ type: "start", partial: message });
            stream.push({ type: "done", reason: "stop", message });
            stream.end();
            return stream;
          },
        });
      };
      const packages = [packageRoot];
      if (wrapped) packages.push(wrapperPackage(makeProvider(t, "fixture")));
      const { session, errors } = await startSession(t, packages, [capture]);
      const model = session.modelRuntime.getModel("fixture", "capture");
      assert.ok(model);
      await session.setModel(model);
      await session.prompt("/skill:dev-loop-debugging sc-fixture --rework");
      assert.deepEqual(errors, []);
      assert.equal(requests.length, 1);
      assert.ok(requests[0].includes("sc-fixture --rework"));
      assert.ok(
        requests[0].includes(
          wrapped
            ? "Follow fixture instructions."
            : "Debugging (Debug / Development / Rework)",
        ),
      );
      assert.ok(requests[0].includes("dev-loop runtime context"));
      assert.ok(
        requests[0].includes("Transitions to other workflows use the selected"),
      );
      requests.length = 0;
      await session.prompt("/skill:dev-loop-writing-specs");
      assert.equal(requests.length, 1);
      assert.ok(
        requests[0].includes(
          wrapped ? "Follow fixture instructions." : "Writing Specs",
        ),
      );
    },
  );
}
