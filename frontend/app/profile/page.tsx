import type { Metadata } from "next";

import { ProfileView } from "@/components/profile-view";

export const metadata: Metadata = {
  title: "Profile | Ambangeg",
  description: "View your Ambangeg profile.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
