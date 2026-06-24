import {
  PrototypeAssetDetailPage,
  PrototypeCollectionsDistribute,
  PrototypeLibraryPage,
  PrototypeRequestsPage,
  PrototypeReviewApprove,
  PrototypeUploadIntake
} from "./prototype/PrototypeDam";

export function AtlasLibraryPage() {
  return <PrototypeLibraryPage />;
}

export function AtlasAssetDetailPage({ id }: { id: string }) {
  return <PrototypeAssetDetailPage id={id} />;
}

export function AtlasCollectionsPage() {
  return <PrototypeCollectionsDistribute />;
}

export function AtlasRequestsPage() {
  return <PrototypeRequestsPage />;
}

export function AtlasReviewPage() {
  return <PrototypeReviewApprove />;
}

export function AtlasUploadPage() {
  return <PrototypeUploadIntake />;
}

export const EnterpriseLibraryPage = AtlasLibraryPage;
export const EnterpriseAssetDetailPage = AtlasAssetDetailPage;
export const EnterpriseCollectionsPage = AtlasCollectionsPage;
export const RequestsPage = AtlasRequestsPage;
export const EnterpriseReviewPage = AtlasReviewPage;
export const EnterpriseUploadPage = AtlasUploadPage;

type LegacyAdminProps = {
  initialModule?: string;
  adminOnly?: boolean;
};

export function EnterprisePackageBuilderPage() {
  return <AtlasCollectionsPage />;
}

export function EnterpriseBrandHubPage() {
  return <AtlasCollectionsPage />;
}

export function EnterpriseDashboardPage() {
  return <AtlasLibraryPage />;
}

export function EnterpriseHelpPage() {
  return <AtlasLibraryPage />;
}

export function EnterpriseInsightsPage() {
  return <AtlasRequestsPage />;
}

export function MyTasksPage() {
  return <AtlasRequestsPage />;
}

export function RecentUploadsPage() {
  return <AtlasUploadPage />;
}

function NonCanonicalSurface({ title }: { title: string }) {
  return (
    <section className="proto-flow-page">
      <div className="proto-flow-card">
        <h1>{title}</h1>
        <p>This surface is not canonical for Slim Atlas. Use Library, Collections, Requests, Review, or Upload.</p>
      </div>
    </section>
  );
}

export function EnterpriseAdminPage(_props: LegacyAdminProps = {}) {
  return <NonCanonicalSurface title="Admin" />;
}
