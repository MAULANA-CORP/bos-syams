import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  nama?: string;
  isLoggedIn?: boolean;
  // Role SENGAJA tidak disimpan di sini.
  // Role dan permission selalu dibaca fresh dari DB (lihat api-helpers.ts)
  // supaya pencabutan hak berlaku seketika, bukan menunggu session kedaluwarsa.
}

const secret = process.env.SESSION_SECRET;

export const sessionOptions: SessionOptions = {
  password: secret || "dev_only_password_at_least_32_characters_long",
  cookieName: process.env.SESSION_COOKIE_NAME || "bos_syams_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 jam — satu hari kerja
  },
};

export async function getSession() {
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("SESSION_SECRET wajib diisi minimal 32 karakter di produksi");
  }
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Generate secret:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
