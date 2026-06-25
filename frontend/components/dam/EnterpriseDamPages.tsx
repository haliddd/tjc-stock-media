import {
  PrototypeAssetDetailPage,
  PrototypeCollectionsDistribute,
  PrototypeLibraryPage,
  PrototypeRequestsPage,
  PrototypeReviewApprove,
  PrototypeUploadIntake
} from "./prototype/PrototypeDam";
import {
  PrototypeAuditCompliancePage,
  PrototypeBrandKitPage,
  PrototypeDistributionSetsPage,
  PrototypeIntegrationsSettingsPage,
  PrototypeRolesAccessPage
} from "./prototype/PrototypeAdminSurfaces";

export function TjcDamLibraryPage() {
  return <PrototypeLibraryPage />;
}

export function TjcDamAssetDetailPage({ id }: { id: string }) {
  return <PrototypeAssetDetailPage id={id} />;
}

export function TjcDamCollectionsPage() {
  return <PrototypeCollectionsDistribute />;
}

export function TjcDamRequestsPage() {
  return <PrototypeRequestsPage />;
}

export function TjcDamReviewPage() {
  return <PrototypeReviewApprove />;
}

export function TjcDamUploadPage() {
  return <PrototypeUploadIntake />;
}

export const AtlasLibraryPage = TjcDamLibraryPage;
export const AtlasAssetDetailPage = TjcDamAssetDetailPage;
export const AtlasCollectionsPage = TjcDamCollectionsPage;
export const AtlasRequestsPage = TjcDamRequestsPage;
export const AtlasReviewPage = TjcDamReviewPage;
export const AtlasUploadPage = TjcDamUploadPage;

export const EnterpriseLibraryPage = TjcDamLibraryPage;
export const EnterpriseAssetDetailPage = TjcDamAssetDetailPage;
export const EnterpriseCollectionsPage = TjcDamCollectionsPage;
export const RequestsPage = TjcDamRequestsPage;
export const EnterpriseReviewPage = TjcDamReviewPage;
export const EnterpriseUploadPage = TjcDamUploadPage;

type LegacyAdminProps = {
  initialModule?: string;
  adminOnly?: boolean;
};

export function EnterprisePackageBuilderPage() {
  return <PrototypeDistributionSetsPage />;
}

export function EnterpriseBrandHubPage() {
  return <PrototypeBrandKitPage />;
}

export function EnterpriseDashboardPage() {
  return <TjcDamLibraryPage />;
}

export function EnterpriseHelpPage() {
  return <TjcDamLibraryPage />;
}

export function EnterpriseInsightsPage() {
  return <TjcDamRequestsPage />;
}

export function MyTasksPage() {
  return <TjcDamRequestsPage />;
}

export function RecentUploadsPage() {
  return <TjcDamUploadPage />;
}

function NonCanonicalSurface({ title }: { title: string }) {
  return (
    <section className="proto-flow-page">
      <div className="proto-flow-card">
        <h1>{title}</h1>
        <p>This TJC DAM cockpit is local-demo only. Use the cards below to manage library operations, review queues, governance, and integration readiness without claiming ResourceSpace writeback.</p>
        <div className="proto-action-row">
          <a href="/library">Library</a>
          <a href="/collections">Collections</a>
          <a href="/review">Review</a>
          <a href="/governance/integrations">Settings</a>
        </div>
      </div>
    </section>
  );
}

export function EnterpriseAdminPage(props: LegacyAdminProps = {}) {
  if (props.initialModule === "audit") return <PrototypeAuditCompliancePage />;
  if (props.initialModule === "integrations") return <PrototypeIntegrationsSettingsPage />;
  if (props.initialModule === "users") return <PrototypeRolesAccessPage />;
  return <PrototypeIntegrationsSettingsPage />;
}
