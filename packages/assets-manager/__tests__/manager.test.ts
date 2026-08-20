import { afterEach, describe, expect, test, vi } from "vitest";

import { AssetsManager } from "../src";

const API_ENDPOINT = "https://assets.example.test";

const stubFetch = () => {
  const fetchMock = vi.fn(async () => ({
    json: async () => ({ data: [] }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("version selection", () => {
  test("keeps string version behavior", async () => {
    const fetchMock = stubFetch();
    const manager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      language: "EN",
      version: "latest",
      concurrency: 0,
    });

    await manager.getData(1);
    await manager.getCategory("characters");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_ENDPOINT}/datum/latest/EN/1`,
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_ENDPOINT}/data/latest/EN/characters`,
      expect.anything(),
    );
  });

  test("uses id versions and falls back to $base, including keywords", async () => {
    const fetchMock = stubFetch();
    const manager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      language: "CHS",
      version: {
        $base: "v7.0.0",
        1: "v3.5.0",
        [-3]: "v4.2.0",
      },
      concurrency: 0,
    });

    await manager.getData(1);
    await manager.getData(2);
    await manager.getData(-3);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_ENDPOINT}/datum/v3.5.0/CHS/1`,
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_ENDPOINT}/datum/v7.0.0/CHS/2`,
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${API_ENDPOINT}/datum/v4.2.0/CHS/-3`,
      expect.anything(),
    );
  });
});

describe("category version selection", () => {
  test("uses $category for category and prepare requests", async () => {
    const fetchMock = stubFetch();
    const categoryManager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      language: "EN",
      version: { $base: "v7.0.0", $category: "mixed-s7" },
      concurrency: 0,
    });
    const prepareManager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      language: "EN",
      version: { $base: "v7.0.0", $category: "mixed-s7" },
      concurrency: 0,
    });

    await categoryManager.getCategory("entities");
    await prepareManager.prepareForSync();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_ENDPOINT}/data/mixed-s7/EN/entities`,
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_ENDPOINT}/data/mixed-s7/EN/all`,
      expect.anything(),
    );
  });

  test("disables category requests and makes prepare a no-op without $category", async () => {
    const fetchMock = stubFetch();
    const manager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      version: { $base: "v7.0.0" },
      concurrency: 0,
    });

    await manager.prepareForSync();
    await manager.prepareForSync();
    await expect(manager.getCategory("characters")).rejects.toThrow(
      "assets version map does not contain $category",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
