/**
 * The contact form's subject list, and the mapping from a service page to it.
 *
 * Single source for both sides: the <select> is built from SUBJECTS, and a
 * service CTA links to /contact?subject=<its slug>. Keeping them apart is how
 * a renamed option silently stops matching the link that points at it — so
 * tests/unit/contact.test.ts asserts every service resolves to a real option.
 */
export const SUBJECTS = [
  'Website design & development',
  'Software development',
  'E-commerce',
  'Digital marketing',
  'IT consulting',
  'Networking & infrastructure',
  'Solar & PV installation',
  'Technology products',
  'Something else',
] as const;

export type Subject = (typeof SUBJECTS)[number];

/** Service collection id → the option that service should preselect. */
export const SUBJECT_BY_SERVICE: Record<string, Subject> = {
  'website-design-development': 'Website design & development',
  'software-development': 'Software development',
  'ecommerce-solutions': 'E-commerce',
  'digital-marketing': 'Digital marketing',
  'it-consulting': 'IT consulting',
  'networking-infrastructure': 'Networking & infrastructure',
  'solar-pv-installation': 'Solar & PV installation',
  'technology-products': 'Technology products',
};

/**
 * A prompt for the message box, tailored to what the visitor clicked from.
 *
 * This is a placeholder, never a value: pre-filling the textarea would put
 * words in someone's mouth and invites submitting our sentence instead of
 * their problem. A prompt asks the question we would otherwise have to email
 * back and ask.
 */
export const MESSAGE_PROMPT: Record<string, string> = {
  'website-design-development':
    'What does your business do, and what should the site achieve — enquiries, bookings, credibility?',
  'software-development':
    'What process are you trying to replace or automate, and who uses it?',
  'ecommerce-solutions':
    'What are you selling, roughly how many products, and how do you want to take payment?',
  'digital-marketing':
    'Who are you trying to reach, and what have you tried so far?',
  'it-consulting':
    'What decision or problem are you weighing up?',
  'networking-infrastructure':
    'How many people and devices, and is it a new site or an existing one?',
  'solar-pv-installation':
    'What do you need to keep running, and for how long without the grid?',
  'technology-products':
    'Which device or model are you after, and how many?',
};

/** Link a service CTA at the contact form with that service preselected. */
export const contactUrlForService = (serviceId: string): string =>
  `/contact?subject=${encodeURIComponent(serviceId)}`;
