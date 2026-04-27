import { protectedProcedure, publicProcedure, router } from "../index";
import { adminUsersRouter } from "./admin-users";
import { authRouter } from "./auth";
import { locationsRouter } from "./locations";
import { profileRouter } from "./profile";

export const appRouter = router({
  auth: authRouter,
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
