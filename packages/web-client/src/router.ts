import { createRouter } from "@solidjs/router";
import { lazy } from "solid-js";

const Home = lazy(() => import("./pages/Home"));
const User = lazy(() => import("./pages/User"));
const Decks = lazy(() => import("./pages/Decks"));
const EditDeck = lazy(() => import("./pages/EditDeck"));
const Room = lazy(() => import("./pages/Room"));
const NotFound = lazy(() => import("./pages/NotFound"));

export const Router = createRouter({
  base: import.meta.env.BASE_URL.replace(/\/$/, ""),
  routes: [
    { path: "/", component: Home },
    { path: "/user/:id", component: User },
    { path: "/decks/:id", component: EditDeck },
    { path: "/decks", component: Decks },
    { path: "/rooms/:code", component: Room },
    { path: "*404", component: NotFound },
  ],
});

export const { paths } = Router;
