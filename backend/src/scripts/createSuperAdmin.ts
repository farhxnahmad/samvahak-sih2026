import { connectDB, disconnectDB } from "../config/db";
import { hashPassword } from "../modules/auth/auth.service";
import { User } from "../modules/user/user.model";

/** Creates the first super admin from SUPER_ADMIN_* values in .env. Safe to run twice. */
async function main() {
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password || password.length < 8) {
    console.error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (8+ characters) in .env first.");
    process.exit(1);
  }

  await connectDB();

  if (await User.exists({ email })) {
    console.log(`A user with ${email} already exists. Nothing to do.`);
  } else {
    await User.create({ name, email, passwordHash: await hashPassword(password), role: "super_admin" });
    console.log(`Super admin created: ${email}`);
  }

  await disconnectDB();
}

main();
