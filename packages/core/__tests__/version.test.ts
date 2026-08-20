import { test, expect, describe } from "vitest";
import {
  createOfficialVersionResolver,
  type Version,
  type WithVersionInfo,
} from "../src/base/version";
import type { VersionResolver } from "../src/data";
import { toSortedBy } from "@gi-tcg/utils";

test("find version", () => {
  const versions: any[] = [
    {
      id: 999,
      version: {
        from: "official",
        value: {
          predicate: "since",
          version: "v3.5.0",
        },
      },
    },
    {
      id: 400,
      version: {
        from: "official",
        value: {
          predicate: "until",
          version: "v4.0.0",
        },
      },
    },
    {
      id: 410,
      version: {
        from: "official",
        value: {
          predicate: "until",
          version: "v4.1.0",
        },
      },
    },
  ];
  const resolved = (base: Version) =>
    createOfficialVersionResolver(base)(versions);
  expect(resolved("v3.3.0")).toBeNull();
  expect(resolved("v3.5.0")?.id).toBe(400);
  expect(resolved("v4.0.0")?.id).toBe(400);
  expect(resolved("v4.1.0")?.id).toBe(410);
  expect(resolved("v4.2.0")?.id).toBe(999);
});

describe("resolveManuallySelectedOfficialVersion", () => {
  const resolvedVersion = (resolver: VersionResolver, id: number) => {
    const candidates: any[] = [
      {
        id,
        selectedVersion: "old",
        version: {
          from: "official",
          value: { predicate: "until", version: "v3.5.0" },
        },
      },
      {
        id,
        selectedVersion: "new",
        version: {
          from: "official",
          value: { predicate: "since", version: "v3.5.0" },
        },
      },
    ];
    return resolver(candidates)?.selectedVersion as "old" | "new" | undefined;
  };

  test("manually selected versions w/o dependencies", () => {
    const resolver = createOfficialVersionResolver("v4.2.0", { 1: "v3.5.0" });
    expect(resolver.versionMap).toEqual({
      $base: "v4.2.0",
      1: "v3.5.0",
    });
    expect(resolvedVersion(resolver, 1)).toBe("old");
    expect(resolvedVersion(resolver, 2)).toBe("new");
  });

  test("manually selected versions propagate through dependencies", () => {
    const resolver = createOfficialVersionResolver("v4.2.0", { 1: "v3.5.0" }, [
      { id: 1, dependencies: [2, 4] },
      { id: 2, dependencies: [3] },
      { id: 4, dependencies: [3] },
    ]);
    expect(resolver.versionMap).toEqual({
      $base: "v4.2.0",
      1: "v3.5.0",
      2: "v3.5.0",
      3: "v3.5.0",
      4: "v3.5.0",
    });
    expect(resolvedVersion(resolver, 2)).toBe("old");
    expect(resolvedVersion(resolver, 3)).toBe("old");
  });

  test("explicit versions override propagated versions and propagate onward", () => {
    const resolver = createOfficialVersionResolver(
      "v3.5.0",
      { 1: "v3.5.0", 2: "v4.2.0" },
      [
        { id: 1, dependencies: [2] },
        { id: 2, dependencies: [3] },
      ],
    );
    expect(resolvedVersion(resolver, 2)).toBe("new");
    expect(resolvedVersion(resolver, 3)).toBe("new");
  });

  test("conflicting propagated versions throw", () => {
    expect(() =>
      createOfficialVersionResolver("v3.5.0", { 1: "v3.5.0", 2: "v4.2.0" }, [
        { id: 1, dependencies: [3] },
        { id: 2, dependencies: [3] },
      ]),
    ).toThrow("Entity 3 has conflicting propagated versions: v3.5.0 vs v4.2.0");
  });
});

test("sortedBy", () => {
  expect(toSortedBy([3, 2, 1], (x) => x)).toEqual([1, 2, 3]);
  expect(toSortedBy([3, 2, 1], (x) => -x)).toEqual([3, 2, 1]);
  expect(
    toSortedBy(["the", "quick", "brown", "fox"], (x) => [
      x.length,
      x.charCodeAt(0),
    ]),
  ).toEqual(["fox", "the", "brown", "quick"]);
});
