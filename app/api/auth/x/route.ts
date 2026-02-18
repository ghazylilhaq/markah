import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import crypto from "crypto";

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.X_CLIENT_ID;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "X integration not configured" },
      { status: 500 }
    );
  }

  // Generate PKCE code_verifier (128 random chars, URL-safe)
  const codeVerifier = base64UrlEncode(crypto.randomBytes(96));

  // Generate code_challenge using S256
  const codeChallenge = base64UrlEncode(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );

  // Generate random state for CSRF protection
  const state = base64UrlEncode(crypto.randomBytes(32));

  // Store code_verifier and state in HTTP-only cookie
  const cookieValue = JSON.stringify({ codeVerifier, state });
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  // Sign with HMAC to prevent tampering
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(cookieValue)
    .digest("hex");
  const signedCookie = `${hmac}.${Buffer.from(cookieValue).toString("base64")}`;

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "bookmark.read tweet.read users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("x_oauth_pkce", signedCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
