import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function verifyCookie(signedCookie: string): { codeVerifier: string; state: string } | null {
  const dotIndex = signedCookie.indexOf(".");
  if (dotIndex === -1) return null;

  const hmac = signedCookie.slice(0, dotIndex);
  const payload = signedCookie.slice(dotIndex + 1);

  try {
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(decoded)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return null;
    }

    return JSON.parse(decoded) as { codeVerifier: string; state: string };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !stateParam) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  // Validate PKCE cookie
  const signedCookie = request.cookies.get("x_oauth_pkce")?.value;
  if (!signedCookie) {
    return NextResponse.json({ error: "Missing PKCE cookie" }, { status: 400 });
  }

  const cookieData = verifyCookie(signedCookie);
  if (!cookieData) {
    return NextResponse.json({ error: "Invalid PKCE cookie" }, { status: 400 });
  }

  // CSRF: validate state matches
  if (cookieData.state !== stateParam) {
    return NextResponse.json({ error: "State mismatch" }, { status: 400 });
  }

  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const redirectUri = process.env.X_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "X integration not configured" }, { status: 500 });
  }

  // Exchange authorization code for tokens
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: cookieData.codeVerifier,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    console.error("Token exchange failed:", errText);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 502 });
  }

  const tokenData = await tokenResponse.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Fetch X user info
  const userResponse = await fetch("https://api.twitter.com/2/users/me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userResponse.ok) {
    const errText = await userResponse.text();
    console.error("User info fetch failed:", errText);
    return NextResponse.json({ error: "Failed to fetch X user info" }, { status: 502 });
  }

  const userData = await userResponse.json() as {
    data: { id: string; username: string };
  };

  const { id: xUserId, username: xHandle } = userData.data;
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  // Upsert XIntegration record
  await prisma.xIntegration.upsert({
    where: { userId: session.user.id },
    update: {
      xUserId,
      xHandle,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
    },
    create: {
      userId: session.user.id,
      xUserId,
      xHandle,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
    },
  });

  // Clear PKCE cookie and redirect
  const redirectResponse = NextResponse.redirect(
    new URL("/dashboard/settings?connected=true", request.url)
  );
  redirectResponse.cookies.set("x_oauth_pkce", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return redirectResponse;
}
