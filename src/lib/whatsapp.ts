import { SITE } from './site';

const WA_BASE = 'https://wa.me';

export interface WhatsAppOptions {
  message: string;
  /** Digits only, country code first, no plus. Defaults to the company number. */
  number?: string;
}

/**
 * Builds a wa.me deep link with a pre-filled message.
 *
 * This is the Phase 1 revenue mechanism — every pre-order and service
 * enquiry passes through it, so it validates its inputs rather than
 * silently producing a broken link.
 */
export function buildWhatsAppUrl({ message, number }: WhatsAppOptions): string {
  const target = number ?? SITE.whatsappNumber;

  if (!/^\d{7,15}$/.test(target)) {
    throw new Error(
      `WhatsApp number must be 7-15 digits with no plus or spaces, received "${target}"`
    );
  }
  if (message.trim().length === 0) {
    throw new Error('WhatsApp message cannot be empty');
  }

  return `${WA_BASE}/${target}?text=${encodeURIComponent(message)}`;
}

/** Standard opener for a service enquiry. */
export function buildEnquiryMessage(subject: string): string {
  return `Hi Radiant Alpha, I'd like to enquire about ${subject}.`;
}
