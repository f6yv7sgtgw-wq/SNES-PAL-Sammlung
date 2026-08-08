import assert from "node:assert/strict";
import test from "node:test";

import {
  isRetryableHttpStatus,
  ParserRequestError,
  withTransientParserRetries,
} from "../app/search-recovery.ts";

const noWait = async () => {};

test("retries Safari Load failed and keeps the same work packet", async () => {
  let calls = 0;
  const result = await withTransientParserRetries(
    async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("Load failed");
      return "Zelda packet completed";
    },
    { delays: [0, 0], sleep: noWait },
  );

  assert.equal(result, "Zelda packet completed");
  assert.equal(calls, 2);
});

test("stops after three attempts when a transient failure persists", async () => {
  let calls = 0;
  await assert.rejects(
    withTransientParserRetries(
      async () => {
        calls += 1;
        throw new TypeError("Load failed");
      },
      { delays: [0, 0], sleep: noWait },
    ),
    /Load failed/,
  );
  assert.equal(calls, 3);
});

test("does not retry a contract or source violation", async () => {
  let calls = 0;
  await assert.rejects(
    withTransientParserRetries(
      async () => {
        calls += 1;
        throw new ParserRequestError("Fremdquelle im Arbeitspaket", {
          retryable: false,
        });
      },
      { delays: [0, 0], sleep: noWait },
    ),
    /Fremdquelle/,
  );
  assert.equal(calls, 1);
});

test("classifies timeout, throttling and server responses as retryable", () => {
  assert.equal(isRetryableHttpStatus(408), true);
  assert.equal(isRetryableHttpStatus(429), true);
  assert.equal(isRetryableHttpStatus(503), true);
  assert.equal(isRetryableHttpStatus(400), false);
});
