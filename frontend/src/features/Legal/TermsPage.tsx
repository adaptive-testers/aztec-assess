import LegalPageLayout from "./LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms and Conditions"
      effectiveDate="March 27, 2026"
      summary="These Terms and Conditions govern access to and use of Aztec Assess. By using the service, you agree to these terms."
      sections={[
        {
          heading: "Acceptance and eligibility",
          body: "You may use Aztec Assess only if you are authorized by your institution or organization and can enter into binding agreements under applicable law.",
        },
        {
          heading: "Accounts and security",
          body: "You are responsible for maintaining credential confidentiality and for activity occurring under your account. Notify us immediately of suspected unauthorized access.",
        },
        {
          heading: "Permitted and prohibited use",
          body: "You agree to use Aztec Assess only for legitimate educational and administrative purposes and must not interfere with service integrity.",
          bullets: [
            "Do not attempt unauthorized access, reverse engineering, or system disruption.",
            "Do not submit malicious code, abusive content, or fraudulent information.",
            "Do not use the service in violation of law or institutional policy.",
          ],
        },
        {
          heading: "Intellectual property",
          body: "Aztec Assess software, branding, and related materials remain the property of Aztec Assess or its licensors. User-submitted content remains owned by its original owner.",
        },
        {
          heading: "Availability and changes",
          body: "We may modify, suspend, or discontinue features to improve the service, satisfy legal obligations, or protect users and platform integrity.",
        },
        {
          heading: "Disclaimers and limitation of liability",
          body: "The service is provided on an \"as is\" and \"as available\" basis to the fullest extent permitted by law. We disclaim implied warranties and limit liability for indirect, incidental, or consequential damages.",
        },
        {
          heading: "Termination",
          body: "We may suspend or terminate access for breach of these terms, legal requirements, or security concerns.",
        },
        {
          heading: "Governing law and updates",
          body: "These terms are governed by applicable law in the jurisdiction specified in your institutional agreement or future commercial agreement. We may update terms over time with revised effective dates.",
        },
        {
          heading: "Contact",
          body: "For legal questions about these terms, contact legal@aztecassess.app.",
        },
      ]}
    />
  );
}
