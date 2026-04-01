import LegalPageLayout from "./LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      effectiveDate="March 27, 2026"
      summary="This Privacy Policy describes how Aztec Assess collects, uses, stores, and protects information when you access our application and related services."
      sections={[
        {
          heading: "Scope and definitions",
          body: "This policy applies to all users of Aztec Assess, including students, instructors, and administrators, and covers data processed through our web application.",
        },
        {
          heading: "Information we collect",
          body: "We collect account, profile, and platform usage data required to provide assessment workflows and maintain service reliability.",
          bullets: [
            "Account data: name, email address, role, authentication metadata.",
            "Course and quiz data: enrollment context, assessments, attempts, and outcomes.",
            "Technical data: device/browser details, timestamps, logs, and error diagnostics.",
          ],
        },
        {
          heading: "How we use information",
          body: "We process information to operate the product, enforce security controls, and improve the quality of user workflows.",
          bullets: [
            "Provide account access, authorization, and in-app functionality.",
            "Deliver core assessment workflows for students and instructors.",
            "Monitor, troubleshoot, and improve performance and stability.",
            "Communicate service notices and policy or security updates.",
          ],
        },
        {
          heading: "Sharing and processors",
          body: "We limit data sharing to authorized internal personnel and vetted service providers supporting infrastructure, analytics, and operations.",
        },
        {
          heading: "Retention and security",
          body: "We retain data for as long as required for legitimate operational purposes and apply administrative, technical, and organizational safeguards to reduce unauthorized access risks.",
        },
        {
          heading: "User rights",
          body: "Depending on your jurisdiction, you may request access, correction, deletion, or restriction of certain personal data we maintain.",
        },
        {
          heading: "Children and educational context",
          body: "Aztec Assess is intended for institutional educational environments and is not directed at children under the age required by applicable law without proper authorization.",
        },
        {
          heading: "Policy updates and contact",
          body: "We may update this policy periodically. Material updates will be reflected on this page with a revised effective date. For privacy inquiries, contact legal@aztecassess.app.",
        },
      ]}
    />
  );
}
