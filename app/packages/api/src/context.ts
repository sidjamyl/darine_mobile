import { auth } from "@app/auth";
import { db } from "@app/db";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(opts: CreateExpressContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });
  return {
    auth,
    db,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
