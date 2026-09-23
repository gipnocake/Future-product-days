import type { Metadata } from "next";
import { PrivacyPolicy } from "./PrivacyPolicy";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
