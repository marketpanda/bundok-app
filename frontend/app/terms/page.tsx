import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms | Ambangeg",
  description: "Terms for using Ambangeg.",
};

const sections = [
  {
    heading: "Using Ambangeg",
    paragraphs: [
      "You may use Ambangeg to explore hiking-related content and manage your profile. You agree not to misuse the service, interfere with its operation, or attempt to access accounts or systems without authorization.",
    ],
  },
  {
    heading: "Outdoor safety",
    paragraphs: [
      "Trail, mountain, distance, timing, and difficulty information may be incomplete or change over time. Ambangeg is not a substitute for current local guidance, qualified guides, weather reports, permits, or your own judgment. You are responsible for evaluating conditions and preparing safely.",
    ],
  },
  {
    heading: "Accounts",
    paragraphs: [
      "You are responsible for activity performed through your account and for keeping access to your Google account secure. We may restrict access when necessary to protect users or the service.",
    ],
  },
  {
    heading: "Service availability",
    paragraphs: [
      "Ambangeg is provided on an as-available basis. Features may change, be interrupted, or be discontinued as the service develops.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      "Questions about these terms can be sent to contact@ambangeg.com.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      introduction="These terms describe the basic rules for using Ambangeg. By using the service, you agree to follow them."
      sections={sections}
    />
  );
}
