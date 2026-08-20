# `@gi-tcg/assets-manager` Assets manager of GI-TCG for Web App

This package will fetch assets from an API endpoint hosting `@gi-tcg/assets` and manage them using Web API<sup>*</sup>.

> \* `fetch` and `Blob` API must be presented in the running environment.

## Per-ID versions

`version` may be a version string, or a per-ID version map. A map must contain
`$base`, which is used by datum requests whose ID has no explicit entry.
`$category` is optional and is used only for category requests:

```ts
import { AssetsManager } from "@gi-tcg/assets-manager";
import { createOfficialVersionResolver } from "@gi-tcg/core";

const resolver = createOfficialVersionResolver("v7.0.0", {
  1101: "v4.2.0",
});

const assets = new AssetsManager({
  version: {
    ...resolver.versionMap,
    $category: "mixed-version-code",
  },
});
```

Without `$category`, category requests use `$base` as long as no per-ID version
or `overrideData` is configured. In those cases `getCategory` throws to avoid
returning inconsistent aggregate data. Pass `{ force: true }` to explicitly use
`$base` anyway.

## Data overrides

Use `overrideData` to shallowly replace properties of data with matching IDs.
Overrides apply to individual datum requests.

```ts
const assets = new AssetsManager({
  overrideData: [{ id: 1101, name: "Custom name", hp: 12 }],
});
```

Data overrides do not apply to `customData` and data returned from `getCategory`.

The `skills` field of characters and entities won't be override by an individual Skill-`id` `overrideData`.
