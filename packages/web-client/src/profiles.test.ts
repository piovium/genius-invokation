import { beforeEach, expect, test, vi } from "vitest";
import axios from "axios";
import type { ProfileDetail, ProfileSummary } from "./profiles";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

const summary: ProfileSummary = {
  id: "test/rules",
  name: "Rules",
  baseVersion: "v3.3.0",
  profileHash: "first",
  officialDeckCompatible: true,
};
const detail: ProfileDetail = {
  ...summary,
  assets: {
    version: "v3.3.0",
    customData: [],
    overrideData: [],
    officialDeckCompatible: true,
  },
};

test("concurrent room clients share a fetch by Profile hash", async () => {
  vi.mocked(axios.get).mockResolvedValue({ data: detail });
  const { fetchProfile } = await import("./profiles");
  const first = fetchProfile(summary);
  const second = fetchProfile(summary);
  expect(first).toBe(second);
  expect(await first).toEqual(detail);
  expect(axios.get).toHaveBeenCalledExactlyOnceWith("profile/test%2Frules");
});

test("mismatched and failed responses are rejected and can be retried", async () => {
  vi.mocked(axios.get).mockResolvedValueOnce({
    data: { ...detail, profileHash: "changed" },
  });
  const { fetchProfile } = await import("./profiles");
  await expect(fetchProfile(summary)).rejects.toThrow("Profile has changed");
  vi.mocked(axios.get).mockRejectedValueOnce(new Error("offline"));
  await expect(fetchProfile(summary)).rejects.toThrow("offline");
  vi.mocked(axios.get).mockResolvedValueOnce({ data: detail });
  expect(await fetchProfile(summary)).toEqual(detail);
  expect(axios.get).toHaveBeenCalledTimes(3);
});
