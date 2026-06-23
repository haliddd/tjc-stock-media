import { EnterpriseAdminPage } from "@/components/dam/EnterpriseDamPages";
import { publicSnapshotBrowseEnabled } from "@/lib/env";

export default function Page() {
  return <EnterpriseAdminPage adminOnly publicPreviewAdmin={publicSnapshotBrowseEnabled()} />;
}
