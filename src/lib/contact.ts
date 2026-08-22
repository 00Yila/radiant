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

/**
 * "Start Your Project" — the site's specific, commitment-toned CTA — now
 * carries a real usability finding: clicking it set an expectation of a
 * purpose-built project-scoping interface, distinct from Contact, and what
 * it opened was the same five-field form under a different button. This
 * links it to the guided intake at /start-project instead, which asks two
 * real questions the plain contact form does not (budget, timeline) and
 * frames the message box as a scoped step rather than one blank textarea —
 * while still submitting through the same hardened handler, honeypot, and
 * validation as Contact, so none of that gets rebuilt or re-tested.
 */
export const startProjectUrlForService = (serviceId: string): string =>
  `/start-project?subject=${encodeURIComponent(serviceId)}`;

/**
 * Budget is asked as an open text field, not fixed bands, because the
 * services behind it are not comparable on one scale: software development
 * starts at ₦500,000 as a one-off, digital marketing at ₦80,000 a month, and
 * IT consulting at ₦25,000 an hour. A single set of naira bands would have to
 * either mix those units dishonestly or silently assume the visitor means a
 * one-off project. Naming the real spread here keeps the field's placeholder
 * honest without inventing a normalised scale the business has never used.
 */
export const BUDGET_PLACEHOLDER =
  'e.g. ₦150,000, or "not sure yet" — projects here range from ₦25,000/hour to ₦500,000+';
