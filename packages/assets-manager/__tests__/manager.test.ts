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

  test("falls back to $base when no custom resolution is configured", async () => {
    const fetchMock = stubFetch();
    const categoryManager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      language: "EN",
      version: { $base: "v7.0.0" },
      concurrency: 0,
    });
    const prepareManager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      language: "EN",
      version: { $base: "v7.0.0" },
      concurrency: 0,
    });

    await categoryManager.getCategory("characters");
    await prepareManager.prepareForSync();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${API_ENDPOINT}/data/v7.0.0/EN/characters`,
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${API_ENDPOINT}/data/v7.0.0/EN/all`,
      expect.anything(),
    );
  });

  test("rejects unsafe $base fallback unless force is true", async () => {
    const fetchMock = stubFetch();
    const overrideManager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      language: "EN",
      version: { $base: "v7.0.0" },
      overrideData: [{ id: 1, name: "overridden" }],
      concurrency: 0,
    });
    const versionManager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      language: "EN",
      version: { $base: "v7.0.0", 1: "v3.5.0" },
      concurrency: 0,
    });

    await expect(overrideManager.getCategory("characters")).rejects.toThrow(
      "requires $category",
    );
    await expect(versionManager.getCategory("characters")).rejects.toThrow(
      "requires $category",
    );
    await versionManager.getCategory("all", { force: true });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_ENDPOINT}/data/v7.0.0/EN/all`,
      expect.anything(),
    );
  });

  test("makes prepare a no-op when safe category resolution is unavailable", async () => {
    const fetchMock = stubFetch();
    const manager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      version: { $base: "v7.0.0" },
      overrideData: [{ id: 1, name: "overridden" }],
      concurrency: 0,
    });

    await manager.prepareForSync();
    await manager.prepareForSync();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("does not hide fetch failures during prepare", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network failure");
      }),
    );
    const manager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      concurrency: 0,
    });

    await expect(manager.prepareForSync()).rejects.toThrow("network failure");
  });
});

describe("data overrides", () => {
  test("uses override names synchronously before fetching data", () => {
    const manager = new AssetsManager({
      concurrency: 0,
      overrideData: [{ id: 1, name: "overridden" }],
    });

    expect(manager.getNameSync(1)).toBe("overridden");
  });

  test("shallowly overrides datum and keyword responses by id", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => ({
      json: async () => {
        const id = Number(String(url).split("/").at(-1));
        return {
          id,
          name: `original ${id}`,
          metadata: { original: true, replaced: false },
        };
      },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const manager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      concurrency: 0,
      overrideData: [
        { id: 1, name: "overridden", metadata: { replaced: true } },
        { id: -3, name: "overridden keyword" },
      ],
    });

    const datum = await manager.getData(1);
    expect(datum).toMatchObject({
      id: 1,
      name: "overridden",
      metadata: { replaced: true },
    });
    expect((datum as unknown as { metadata: object }).metadata).toEqual({
      replaced: true,
    });
    await expect(manager.getData(-3)).resolves.toMatchObject({
      id: -3,
      name: "overridden keyword",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("leaves category responses unchanged", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        data: [
          { id: 1, name: "original", hp: 10 },
          { id: 2, name: "unchanged", hp: 10 },
        ],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const manager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      concurrency: 0,
      overrideData: [{ id: 1, name: "overridden", hp: 12 }],
    });

    await expect(manager.getCategory("characters")).resolves.toEqual([
      { id: 1, name: "original", hp: 10 },
      { id: 2, name: "unchanged", hp: 10 },
    ]);
  });

  test("stores overridden data when preparing synchronous access", async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({ data: [{ id: 1, name: "original" }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const manager = new AssetsManager({
      apiEndpoint: API_ENDPOINT,
      concurrency: 0,
      overrideData: [{ id: 1, name: "overridden" }],
    });

    await manager.prepareForSync();

    expect(manager.getDataSync(1)).toMatchObject({
      id: 1,
      name: "overridden",
    });
  });
});
