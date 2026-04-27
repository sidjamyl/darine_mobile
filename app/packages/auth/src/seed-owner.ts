import { db } from "@app/db";
import { user } from "@app/db/schema/auth";
import { env } from "@app/env/server";
import { eq } from "drizzle-orm";

import { auth } from "./index";

const ownerEmail = env.SEED_OWNER_EMAIL;
const ownerPassword = env.SEED_OWNER_PASSWORD;
const ownerName = env.SEED_OWNER_NAME;

if (!ownerEmail || !ownerPassword || !ownerName) {
  console.log("Skipping owner seed. Set SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, and SEED_OWNER_NAME.");
  process.exit(0);
}

const existingUser = await db.query.user.findFirst({
  where: eq(user.email, ownerEmail),
});

if (!existingUser) {
  await auth.api.signUpEmail({
    body: {
      name: ownerName,
      email: ownerEmail,
      password: ownerPassword,
    },
  });
}

const [seededOwner] = await db
  .update(user)
  .set({
    name: ownerName,
    role: "owner",
    isDisabled: false,
    isSeedOwner: true,
    emailVerified: true,
  })
  .where(eq(user.email, ownerEmail))
  .returning({ id: user.id });

if (!seededOwner) {
  throw new Error("Failed to seed owner account.");
}

console.log(`Seeded owner account: ${ownerEmail}`);
