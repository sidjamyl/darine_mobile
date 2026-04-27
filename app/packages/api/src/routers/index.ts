import { protectedProcedure, publicProcedure, router } from "../index";
import { adminUsersRouter } from "./admin-users";
import { adminCatalogRouter } from "./admin-catalog";
import { assetsRouter } from "./assets";
import { authRouter } from "./auth";
import { favoritesRouter } from "./favorites";
import { homeContentRouter } from "./home-content";
import { locationsRouter } from "./locations";
import { profileRouter } from "./profile";

export const appRouter = router({
  adminCatalog: adminCatalogRouter,
  assets: assetsRouter,
  auth: authRouter,
  favorites: favoritesRouter,
  homeContent: homeContentRouter,
  locations: locationsRouter,
  profile: profileRouter,
  adminUsers: adminUsersRouter,
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
});
export type AppRouter = typeof appRouter;
