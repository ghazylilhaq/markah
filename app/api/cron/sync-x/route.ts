import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshXToken } from "@/lib/services/x-auth";
import { performXSync } from "@/lib/services/x-sync-core";

export async function POST(request: NextRequest) {
  // Validate Authorization header
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Query all enabled integrations
  const integrations = await prisma.xIntegration.findMany({
    where: { syncEnabled: true },
  });

  let synced = 0;
  let failed = 0;
  const skipped = 0;

  // Process users sequentially to respect rate limits
  for (const integration of integrations) {
    try {
      // Refresh token if expired
      if (integration.expiresAt < new Date()) {
        try {
          await refreshXToken(integration);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Token refresh failed";
          console.log(`[cron/sync-x] Token refresh failed for user ${integration.userId}: ${message}`);
          await prisma.xIntegration.update({
            where: { id: integration.id },
            data: { lastError: message },
          });
          failed++;
          continue;
        }
      }

      const result = await performXSync(integration.userId);

      if (result.success) {
        console.log(
          `[cron/sync-x] Synced user ${integration.userId}: imported=${result.imported}, merged=${result.merged}, skipped=${result.skipped}`
        );
        synced++;
      } else {
        console.log(`[cron/sync-x] Sync failed for user ${integration.userId}: ${result.error}`);
        await prisma.xIntegration.update({
          where: { id: integration.id },
          data: { lastError: result.error ?? "Sync failed" },
        });
        failed++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.log(`[cron/sync-x] Error for user ${integration.userId}: ${message}`);
      await prisma.xIntegration.update({
        where: { id: integration.id },
        data: { lastError: message },
      });
      failed++;
    }
  }

  return NextResponse.json({ synced, failed, skipped });
}
