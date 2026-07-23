import type { Metadata } from "next";
import WorkspaceExperience from "@/components/WorkspaceExperience";

export const metadata: Metadata = {
  title: "Your workspace · Fiscal",
  description:
    "Upload Bank of America CSV exports. Statements are processed in the cloud for a lasting spending ledger.",
};

export default function WorkspacePage() {
  return <WorkspaceExperience />;
}
