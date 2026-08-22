/**
 * Client-side form validation, shared by contact.astro and start-project.astro.
 *
 * Additive only: native `required` / `maxlength` / `pattern` still gate
 * submission exactly as they did with no script running, which is what
 * protects a visitor with JavaScript disabled. This only adds a persistent,
 * readable message next to every field that failed — not just the first,
 * which is all the browser's own bubble shows.
 *
 * Listening for the native 'invalid' event rather than intercepting submit
 * keeps this additive: nothing here can let a bad submission through, because
 * the browser's own gate never moves.
 */

type Validatable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function messageFor(field: Validatable, helpFor: Record<string, string>): string {
  const v = field.validity;
  if (v.valueMissing) return helpFor[field.id] ?? 'This field is required.';
  if (v.tooLong && 'maxLength' in field) {
    return `Please shorten this to ${field.maxLength} characters.`;
  }
  if (v.typeMismatch || v.patternMismatch) {
    return 'That does not look like a complete email address.';
  }
  return field.validationMessage;
}

function showFieldError(field: Validatable, helpFor: Record<string, string>) {
  const id = `${field.id}-error`;
  let msg = document.getElementById(id);
  if (!msg) {
    msg = document.createElement('p');
    msg.id = id;
    msg.className = 'field__error';
    field.insertAdjacentElement('afterend', msg);
  }
  msg.textContent = messageFor(field, helpFor);
  field.setAttribute('aria-invalid', 'true');
  const described = field.getAttribute('aria-describedby');
  if (!described || !described.includes(id)) {
    field.setAttribute('aria-describedby', [described, id].filter(Boolean).join(' '));
  }
}

function clearFieldError(field: Validatable) {
  const id = `${field.id}-error`;
  document.getElementById(id)?.remove();
  field.removeAttribute('aria-invalid');
  const described = field.getAttribute('aria-describedby');
  if (described) {
    const rest = described.split(' ').filter((token) => token !== id).join(' ');
    if (rest) field.setAttribute('aria-describedby', rest);
    else field.removeAttribute('aria-describedby');
  }
}

/**
 * Wires per-field error messages and a submit busy-state onto a form.
 * `helpFor` maps a field's id to the sentence shown when it is left empty —
 * every other failure (too long, not an email) gets a generic message, since
 * those are the same regardless of which field is which.
 */
export function enhanceFormValidation(form: HTMLFormElement, helpFor: Record<string, string>) {
  const validatable = [...form.querySelectorAll<Validatable>('input, select, textarea')].filter(
    (el) => el.id && el.id !== 'bot-field'
  );

  for (const field of validatable) {
    field.addEventListener('invalid', () => showFieldError(field, helpFor));
    field.addEventListener('input', () => {
      if (field.checkValidity()) clearFieldError(field);
    });
  }

  // Pressing Send on a slow connection with no feedback invites a second
  // press, which sends the enquiry twice. Only fires once native validation
  // has already passed, so it never masks a blocked, invalid submission.
  form.addEventListener('submit', () => {
    if (!form.checkValidity()) return;
    const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }
    form.setAttribute('aria-busy', 'true');
  });
}
