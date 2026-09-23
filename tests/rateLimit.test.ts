import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { MemoryStore } from "@/lib/store";

describe("rateLimit", () => {
  it("allows up to the limit per window, then blocks", async () => {
    const store = new MemoryStore();
    const now = 1_000_000_000;
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(store, "1.2.3.4", 3, 60, now));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    // New window resets the counter; other IPs are independent.
    expect((await rateLimit(store, "1.2.3.4", 3, 60, now + 60_000)).allowed).toBe(true);
    expect((await rateLimit(store, "5.6.7.8", 3, 60, now)).allowed).toBe(true);
  });

  it("reads the first forwarded IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
