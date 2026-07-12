export type LegalSection = {
  id: string
  heading: string
  paragraphs: string[]
}

export type LegalDoc = {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

export const TERMS: LegalDoc = {
  title: "Terms of Service",
  updated: "July 1, 2026",
  intro:
    "These Terms of Service govern your access to and use of ChatGRP, a graph-based AI conversation workspace. By creating an account or using the service, you agree to these terms.",
  sections: [
    {
      id: "acceptance",
      heading: "1. Acceptance of Terms",
      paragraphs: [
        "By accessing or using ChatGRP (the “Service”), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you may not use the Service.",
        "We may update these terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the revised terms.",
      ],
    },
    {
      id: "accounts",
      heading: "2. Accounts and Registration",
      paragraphs: [
        "You must provide accurate and complete information when creating an account and keep that information up to date. You are responsible for safeguarding your credentials and for all activity that occurs under your account.",
        "You must be at least 13 years old, or the minimum age of digital consent in your jurisdiction, to use the Service.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "3. Acceptable Use",
      paragraphs: [
        "You agree not to misuse the Service, including by attempting to access it using a method other than the interface and instructions we provide, or by using it to generate unlawful, harmful, or abusive content.",
        "You may not reverse engineer, resell, or use the Service to build a competing product without our written permission.",
      ],
    },
    {
      id: "content",
      heading: "4. Your Content",
      paragraphs: [
        "You retain ownership of the prompts, conversations, and graphs you create (“Your Content”). You grant ChatGRP a limited license to process Your Content solely to provide and improve the Service.",
        "You are responsible for Your Content and for ensuring you have the rights necessary to submit it to the Service.",
      ],
    },
    {
      id: "billing",
      heading: "5. Plans and Billing",
      paragraphs: [
        "Paid plans are billed in advance on a recurring basis. Credits included with a plan reset at the start of each billing cycle and do not roll over unless stated otherwise.",
        "You may cancel at any time; access to paid features continues until the end of the current billing period. Fees are non-refundable except where required by law.",
      ],
    },
    {
      id: "termination",
      heading: "6. Termination",
      paragraphs: [
        "You may stop using the Service and delete your account at any time. We may suspend or terminate your access if you violate these terms or use the Service in a way that could cause harm.",
        "Upon termination, your right to use the Service ceases immediately. Sections that by their nature should survive termination will remain in effect.",
      ],
    },
    {
      id: "disclaimers",
      heading: "7. Disclaimers and Liability",
      paragraphs: [
        "The Service is provided “as is” without warranties of any kind. AI-generated output may be inaccurate; you are responsible for reviewing it before relying on it.",
        "To the maximum extent permitted by law, ChatGRP is not liable for indirect, incidental, or consequential damages arising from your use of the Service.",
      ],
    },
    {
      id: "contact",
      heading: "8. Contact",
      paragraphs: [
        "Questions about these terms can be sent to legal@chatgrp.example. We will do our best to respond promptly.",
      ],
    },
  ],
}

export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  updated: "July 1, 2026",
  intro:
    "This Privacy Policy explains what information ChatGRP collects, how we use it, and the choices you have. We aim to collect only what we need to run the Service well.",
  sections: [
    {
      id: "overview",
      heading: "1. Overview",
      paragraphs: [
        "ChatGRP provides a graph-based AI conversation workspace. This policy applies to information we process when you use the Service, visit our website, or contact us.",
      ],
    },
    {
      id: "information-we-collect",
      heading: "2. Information We Collect",
      paragraphs: [
        "Account information such as your name and email address when you register. Content you create, including prompts, conversations, and graphs. Usage data such as feature interactions and device or browser information.",
        "If you sign in with Google, we receive basic profile information from your Google account as permitted by your Google settings.",
      ],
    },
    {
      id: "how-we-use",
      heading: "3. How We Use Information",
      paragraphs: [
        "We use information to provide, maintain, and improve the Service, to process AI requests, to communicate with you, and to keep the Service secure.",
        "We do not sell your personal information. We do not use the content of your private conversations to train third-party models without your consent.",
      ],
    },
    {
      id: "sharing",
      heading: "4. How We Share Information",
      paragraphs: [
        "We share information with service providers who process data on our behalf (such as hosting and AI model providers), subject to appropriate confidentiality obligations.",
        "We may disclose information if required by law or to protect the rights, property, or safety of ChatGRP, our users, or the public.",
      ],
    },
    {
      id: "retention",
      heading: "5. Data Retention",
      paragraphs: [
        "We retain your information for as long as your account is active or as needed to provide the Service. You can delete conversations and your account at any time from your settings.",
      ],
    },
    {
      id: "security",
      heading: "6. Security",
      paragraphs: [
        "We use technical and organizational measures to protect your information, including encryption in transit. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
      ],
    },
    {
      id: "your-rights",
      heading: "7. Your Rights and Choices",
      paragraphs: [
        "Depending on your location, you may have rights to access, correct, export, or delete your personal information. You can exercise many of these directly in your account settings or by contacting us.",
      ],
    },
    {
      id: "contact",
      heading: "8. Contact",
      paragraphs: [
        "For privacy questions or requests, email privacy@chatgrp.example. We will respond in accordance with applicable law.",
      ],
    },
  ],
}
