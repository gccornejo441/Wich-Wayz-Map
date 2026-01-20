import bcrypt from "bcryptjs";
import { executeQuery } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  const { tokenFromEmail, password } = req.body || {};

  if (!tokenFromEmail || !password) {
    res.status(400).json({ message: "Token and password are required." });
    return;
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);

    await executeQuery(
      "UPDATE users SET hashed_password = $hashed_password WHERE verification_token = $tokenFromEmail",
      { hashed_password: hashedPassword, tokenFromEmail },
    );

    res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res
      .status(500)
      .json({ success: false, message: "An unexpected error occurred." });
  }
}
