// arktype reference these things. Make them happy!
// https://github.com/arktypeio/arktype/issues/1555
globalThis.Blob ??= function Blob() {};
globalThis.FormData ??= function FormData() {};
globalThis.Headers ??= function Headers() {};
globalThis.Request ??= function Request() {};
globalThis.Response ??= function Response() {};
globalThis.URL ??= function URL() {};
