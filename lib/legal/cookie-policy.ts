import type { LegalDocumentByLocale } from './types';

export const COOKIE_POLICY: LegalDocumentByLocale = {
  en: {
    title: 'Cookie Policy',
    subtitle: 'VIVO WINE CLUB - vivowineclub.com',
    sections: [
      {
        heading: '1. What are cookies',
        paragraphs: [
          "Cookies are small text files that visited websites send to the user's device, where they are stored and then re-transmitted to the same website on the next visit. The website vivowineclub.com uses first-party and third-party cookies for the purposes described below.",
        ],
      },
      {
        heading: '2. Technical cookies (always active)',
        paragraphs: [
          "These are strictly necessary for the website to function, for example to manage access to the personal account area. They do not require the user's consent under applicable law.",
        ],
      },
      {
        heading: '3. Analytics cookies - Google Analytics',
        paragraphs: [
          "The website uses Google Analytics, a statistical analysis service provided by Google LLC, to understand how visitors interact with the website (pages visited, time spent, traffic sources). These cookies are activated only upon the user's consent.",
        ],
        bullets: [
          'Purpose: statistical analysis',
          'Provider: Google LLC',
          'Data transfer: United States (with safeguards provided by applicable law)',
          "Provider's privacy policy: [https://policies.google.com/privacy](https://policies.google.com/privacy)",
        ],
      },
      {
        heading: '4. Marketing/profiling cookies - Meta Pixel',
        paragraphs: [
          'The website uses Meta Pixel, a tool provided by Meta Platforms Inc. that measures the effectiveness of advertising campaigns and displays targeted advertising content to users on Facebook and Instagram. These cookies are activated only upon the user’s explicit consent.',
        ],
        bullets: [
          'Purpose: marketing, remarketing, advertising profiling',
          'Provider: Meta Platforms Inc.',
          'Data transfer: United States (with safeguards provided by applicable law)',
          "Provider's privacy policy: [https://www.facebook.com/privacy/policy/](https://www.facebook.com/privacy/policy/)",
        ],
      },
      {
        heading: '5. Managing consent',
        paragraphs: [
          'On first accessing the website, the user is shown a banner that allows them to:',
        ],
        bullets: [
          'Accept all cookies;',
          'Reject non-necessary cookies (analytics and marketing);',
          'Customize their choices for each cookie category.',
        ],
      },
      {
        paragraphs: [
          'Until a choice is made, only technical cookies are activated on the website. The user may change their preferences at any time via the "Manage Cookies" link in the website footer.',
        ],
      },
      {
        heading: '6. How to disable cookies from the browser',
        paragraphs: [
          'Users can also manage their cookie preferences directly through their browser settings. Guidance pages for the main browsers:',
        ],
        bullets: [
          'Google Chrome: [support.google.com/chrome/answer/95647](https://support.google.com/chrome/answer/95647)',
          'Mozilla Firefox: [support.mozilla.org/en-US/kb/enable-and-disable-cookies](https://support.mozilla.org/en-US/kb/enable-and-disable-cookies)',
          'Safari: [support.apple.com/guide/safari](https://support.apple.com/guide/safari)',
          'Microsoft Edge: [support.microsoft.com](https://support.microsoft.com)',
        ],
      },
      {
        heading: '7. Data Controller',
        paragraphs: [
          'VIVO WINE CLUB, Tax Code 95023200223, contact email: [info@vivowineclub.com](mailto:info@vivowineclub.com).',
        ],
      },
      {
        heading: '8. Updates',
        paragraphs: [
          'This Cookie Policy may be updated periodically. Last updated: 29/07/2026.',
        ],
      },
    ],
  },
};
