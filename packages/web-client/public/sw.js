/* eslint-disable */
// @ts-check

const sw = /** @type {ServiceWorkerGlobalScope & typeof globalThis} */ (self);

const FEATURE_NO_THUMB = true;

/** @type {string | undefined} */
let backendBaseUrl;

/** @type {string | undefined}  */
let version;

const setupVersion = async () => {
  if (!backendBaseUrl) {
    console.error(`Backend URL not set`);
    return;
  }
  try {
    const { currentGameVersion, coreVersion } = await fetch(
      `${backendBaseUrl}/version`,
    ).then((r) => r.json());
    version = `${coreVersion}-gi_${currentGameVersion}`;
    console.log("Service Worker version set to:", version);
  } catch (error) {
    console.error("Error fetching version:", error);
  }
};

sw.addEventListener("activate", (event) => {
  event.waitUntil(enableNavigationPreload());
});

sw.addEventListener("message", (event) => {
  if (event.data && event.data.type === "config") {
    const payload = event.data.payload;
    backendBaseUrl = payload.backendBaseUrl;
    event.waitUntil(
      (async () => {
        try {
          await setupVersion();
          if (version) {
            await deleteOldCaches();
          }
        } catch (error) {
          console.error("Error handling config message:", error);
        }
      })(),
    );
  }
});

sw.addEventListener("fetch", (event) => {
  if (
    event.request.method === "GET" &&
    event.request.headers.get("X-Gi-Tcg-Assets-Manager")
  ) {
    /** @type {Request | URL} */
    const url = new URL(event.request.url);
    const search = new URLSearchParams(url.search);
    if (FEATURE_NO_THUMB && search.get("thumbnail")) {
      search.delete("thumbnail");
      url.search = "?" + search.toString();
    }
    event.respondWith(cacheFirst(url, event.preloadResponse, event));
  } else {
    event.respondWith(
      event.preloadResponse.then(
        (preloaded) => preloaded ?? fetch(event.request),
      ),
    );
  }
});

const deleteCache = async (/** @type {string} */ key) => {
  await caches.delete(key);
};

const deleteOldCaches = async () => {
  const keyList = await caches.keys();
  const cachesToDelete = keyList.filter((key) => key !== version);
  await Promise.all(cachesToDelete.map(deleteCache));
};

/**
 *
 * @param {string} key
 * @param {RequestInfo[]} resources
 * @returns {Promise<void>}
 */
const addResourcesToCache = async (key, resources) => {
  const cache = await caches.open(key);
  await cache.addAll(resources);
};

/**
 *
 * @param {string} key
 * @param {Request | URL} request
 * @param {Response} response
 * @returns {Promise<void>}
 */
const putInCache = async (key, request, response) => {
  const cache = await caches.open(key);
  await cache.put(request, response);
};

/**
 *
 * @param {Request | URL} request
 * @param {Promise<Response>} preloadResponsePromise
 * @param {FetchEvent} event
 * @returns {Promise<Response>}
 */
const cacheFirst = async (request, preloadResponsePromise, event) => {
  // First try to get the resource from the cache
  const responseFromCache = await caches.match(request, {
    // Backend by Elysia has a hardcoded Vary: *, ignore that to make cache work
    ignoreVary: true,
  });
  if (responseFromCache) {
    console.log(`Cache hit for ${request}`);
    return responseFromCache;
  }

  // Next try to use (and cache) the preloaded response, if it's there
  const preloadResponse = await preloadResponsePromise.catch(() => {});
  if (version && preloadResponse) {
    console.info("using preload response", preloadResponse);
    event.waitUntil(putInCache(version, request, preloadResponse.clone()));
    return preloadResponse;
  }

  // Next try to get the resource from the network
  try {
    const responseFromNetwork = await fetch(request);
    // response may be used only once
    // we need to save clone to put one copy in cache
    // and serve second one
    if (version && responseFromNetwork.ok) {
      event.waitUntil(
        putInCache(version, request, responseFromNetwork.clone()),
      );
    }
    return responseFromNetwork;
  } catch (error) {
    // when even the fallback response is not available,
    // there is nothing we can do, but we must always
    // return a Response object
    return new Response("Network error happened", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

// Enable navigation preload
const enableNavigationPreload = async () => {
  if (sw.registration.navigationPreload) {
    await sw.registration.navigationPreload.enable();
  }
};
