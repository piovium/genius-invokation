import { Elysia, t } from "elysia";
import type { Auth } from "./session";

/**
 * The OAuth popup page. It posts the token back to the opener and closes itself;
 * a script error would otherwise leave the popup silently blank, so it is shown.
 */
const loginPage = (accessToken: string) =>
  "<!DOCTYPE html>" +
  "<title>Login Success</title>" +
  "<p>Redirecting back...</p>" +
  "<script>" +
  'window.addEventListener("error", event => { document.body.append(document.createTextNode(event.type + ": " + event.message)); });' +
  'window.opener.postMessage({type:"login",token:' +
  JSON.stringify(accessToken) +
  '},"*");' +
  "window.close();" +
  "</script>";

export const createAuthRoutes = (auth: Auth) =>
  new Elysia({ prefix: "/auth" }).get(
    "/github/callback",
    async ({ query }) => {
      const { accessToken } = await auth.login(query.code);
      return new Response(loginPage(accessToken), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    },
    { query: t.Object({ code: t.String({ minLength: 1 }) }) },
  );
