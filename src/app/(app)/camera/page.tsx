import type { Metadata } from "next";
import { CameraView } from "./camera-view";

export const metadata: Metadata = { title: "Camera" };

export default function CameraPage() {
  return <CameraView />;
}
