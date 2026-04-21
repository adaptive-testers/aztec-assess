import LegalPageLayout from "./LegalPageLayout";

export default function CookiesPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      effectiveDate="March 27, 2026"
      summary="This Cookie Policy explains how Aztec Assess uses cookies and similar technologies to operate and improve our services."
      sections={[
        {
          heading: "What cookies are",
          body: "Cookies are small data files stored on your device. We also use similar storage technologies for authentication and user-experience continuity.",
        },
        {
          heading: "Cookie categories we use",
          body: "Aztec Assess currently relies on the following categories to support the web application:",
          bullets: [
            "Essential: authentication and session management required for secure access.",
            "Functional: preferences that improve interface consistency and usability.",
            "Analytics/diagnostics: technical telemetry to monitor reliability and performance.",
          ],
        },
        {
          heading: "Third-party technologies",
          body: "Some infrastructure and integrations may place or read technical identifiers necessary for security, identity flows, or service health monitoring.",
        },
        {
          heading: "Managing cookies",
          body: "You can manage cookie preferences through browser controls. Blocking essential cookies may impact authentication and application functionality.",
        },
        {
          heading: "Policy updates and contact",
          body: "We may revise this policy as technologies and legal requirements evolve. Questions about cookie usage can be directed to legal@aztecassess.app.",
        },
      ]}
    />
  );
}
