import { createDb } from "@app/db";
import * as schema from "@app/db/schema/auth";
import { env } from "@app/env/server";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { eq, or } from "drizzle-orm";

import { normalizeAlgerianPhone } from "./phone";

function getTrustedOrigins() {
  return env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
}

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema: schema,
    }),
    trustedOrigins: [
      ...getTrustedOrigins(),
      "app://",
      ...(env.NODE_ENV === "development"
        ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "http://localhost:8081"]
        : []),
    ],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      autoSignIn: false,
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email" && typeof ctx.body?.email === "string") {
          const signingInUser = await db.query.user.findFirst({
            where: eq(schema.user.email, ctx.body.email),
          });

          if (signingInUser?.isDisabled) {
            throw new APIError("UNAUTHORIZED", { message: "Account is disabled" });
          }
        }

        if (ctx.path === "/sign-in/phone-number" && typeof ctx.body?.phoneNumber === "string") {
          const normalizedPhone = normalizeAlgerianPhone(ctx.body.phoneNumber);

          if (!normalizedPhone) {
            return;
          }

          const signingInUser = await db.query.user.findFirst({
            where: or(
              eq(schema.user.phoneNumber, normalizedPhone.international),
              eq(schema.user.phoneNumberLocal, normalizedPhone.local),
            ),
          });

          if (signingInUser?.isDisabled) {
            throw new APIError("UNAUTHORIZED", { message: "Account is disabled" });
          }
        }
      }),
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    plugins: [
      expo(),
      phoneNumber({
        sendOTP: () => {
          // Phone OTP is intentionally disabled in V1; clients use phone + password.
        },
        phoneNumberValidator: (phone) => normalizeAlgerianPhone(phone) !== null,
        requireVerification: false,
      }),
    ],
  });
}

export const auth = createAuth();
