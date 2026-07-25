import type { Metadata } from "next";
import { IntegrationsGrid } from "./integrations-grid";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsSettingsPage() {
  return <IntegrationsGrid />;
}
