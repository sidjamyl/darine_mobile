import { protectedProcedure, publicProcedure, router } from "../index";
import { adminUsersRouter } from "./admin-users";
import { adminCatalogRouter } from "./admin-catalog";
import { assetsRouter } from "./assets";
import { authRouter } from "./auth";
import { catalogRouter } from "./catalog";
import { deliveryNotesRouter } from "./delivery-notes";
import { favoritesRouter } from "./favorites";
import { homeContentRouter } from "./home-content";
import { locationsRouter } from "./locations";
import { notificationsRouter } from "./notifications";
import { ordersRouter } from "./orders";
import { profileRouter } from "./profile";

export const appRouter = router({
  adminCatalog: adminCatalogRouter,
  assets: assetsRouter,
  auth: authRouter,
  catalog: catalogRouter,
  deliveryNotes: deliveryNotesRouter,
  favorites: favoritesRouter,
  homeContent: homeContentRouter,
  locations: locationsRouter,
  notifications: notificationsRouter,
  orders: ordersRouter,
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
