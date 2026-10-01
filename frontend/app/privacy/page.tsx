import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Ambangeg",
  description: "How Ambangeg handles your information.",
};

const sections = [
  {
    heading: "Information we use",
    paragraphs: [
      "When you sign in with Google, Ambangeg may receive basic account information such as your name and email address through Amazon Cognito. We use this information to identify your account and personalize your profile.",
      "When you use the contact form, we receive the name, email address, subject, and message you provide. Amazon Web Services processes the submission and delivers it to the Ambangeg team by email.",
    ],
  },
  {
    heading: "Authentication and storage",
    paragraphs: [
      "Google and Amazon Cognito process authentication information according to their own privacy policies. Authentication tokens may be stored in your browser to keep you signed in securely.",
    ],
  },
  {
    heading: "How information is used",
    paragraphs: [
      "We use account information to provide sign-in, display your profile, maintain your session, and improve the Ambangeg experience. Contact-form information is used to respond to your enquiry. We do not sell your personal information.",
    ],
  },
  {
    heading: "Your choices",
    paragraphs: [
      "You may sign out at any time from the account menu. You can also manage Ambangeg's access to your Google account through your Google account settings.",
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      "For privacy questions or account-related requests, email contact@ambangeg.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      introduction="This policy explains what information Ambangeg uses and how it is handled when you explore the app or sign in."
      sections={sections}
    />
  );
}
