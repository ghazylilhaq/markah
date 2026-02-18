import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { IntegrationCard } from "@/components/integration-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ConnectedToast } from "./connected-toast";
import { XIntegrationControls } from "./x-integration-controls";

// X logo glyph as SVG
function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const showConnectedToast = params.connected === "true";

  const xIntegration = await prisma.xIntegration.findUnique({
    where: { userId: user.id },
  });

  return (
    <div className="mx-auto max-w-2xl">
      {showConnectedToast && <ConnectedToast />}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your integrations and preferences.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          Integrations
        </h2>

        <IntegrationCard
          name="X (Twitter)"
          icon={<XLogo />}
          description="Sync your X bookmarks automatically"
          connected={!!xIntegration}
        >
          {!xIntegration ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/api/auth/x">Connect X Account</Link>
            </Button>
          ) : (
            <XIntegrationControls
              xHandle={xIntegration.xHandle}
              syncEnabled={xIntegration.syncEnabled}
              lastSyncedAt={
                xIntegration.lastSyncedAt
                  ? xIntegration.lastSyncedAt.toISOString()
                  : null
              }
              lastError={xIntegration.lastError}
            />
          )}
        </IntegrationCard>
      </div>
    </div>
  );
}
