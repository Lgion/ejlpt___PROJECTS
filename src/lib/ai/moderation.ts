export interface ModerationResult {
  allowed: boolean;
  sanitizedText: string;
  reasonFr?: string;
  flags: string[];
}

export interface ModerationOptions {
  minLength?: number;
  maxLength?: number;
  allowLinks?: boolean;
}

const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_RE = /<[^>]*>/g;
const URL_RE = /(?:https?:\/\/|www\.)\S+/gi;
const EXCESSIVE_REPEAT_RE = /(.)\1{9,}/u;

const LATIN_PROFANITY_RE =
  /\b(connard|connasse|salope|putain|fdp|encule|merde|nique|batard|fuck|shit|bitch|asshole|cunt|nigger|faggot|retard)\b/i;

const SPAM_PHRASES_RE =
  /\b(viagra|cialis|casino|crypto\s*giveaway|free\s*bitcoin|buy\s*followers|earn\s*\$\d+\s*daily|porn|xxx)\b/i;

const JA_SLURS = ['死ね', 'しね', 'ぶっ殺す', 'きもい', 'クズ', 'ちんこ', 'まんこ'];

export function sanitizeTextInput(raw: string): string {
  return raw
    .replace(CONTROL_CHARS_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trim();
}

export function moderateUserText(
  text: string,
  options: ModerationOptions = {}
): ModerationResult {
  const minLength = options.minLength ?? 2;
  const maxLength = options.maxLength ?? 2000;
  const allowLinks = options.allowLinks ?? false;

  const sanitizedText = sanitizeTextInput(String(text || ''));
  const flags: string[] = [];

  if (sanitizedText.length < minLength) {
    flags.push('too_short');
    return {
      allowed: false,
      sanitizedText,
      reasonFr: `Le texte doit contenir au moins ${minLength} caractères.`,
      flags,
    };
  }

  if (sanitizedText.length > maxLength) {
    flags.push('too_long');
    return {
      allowed: false,
      sanitizedText,
      reasonFr: `Le texte dépasse la limite autorisée de ${maxLength} caractères.`,
      flags,
    };
  }

  const urls = sanitizedText.match(URL_RE) || [];
  if ((!allowLinks && urls.length > 0) || urls.length > 2) {
    flags.push('spam_links');
    return {
      allowed: false,
      sanitizedText,
      reasonFr: 'Les liens externes ne sont pas autorisés dans ce contenu.',
      flags,
    };
  }

  if (EXCESSIVE_REPEAT_RE.test(sanitizedText)) {
    flags.push('char_flood');
    return {
      allowed: false,
      sanitizedText,
      reasonFr: 'Texte détecté comme répétitif (spam).',
      flags,
    };
  }

  if (SPAM_PHRASES_RE.test(sanitizedText)) {
    flags.push('spam_keyword');
    return {
      allowed: false,
      sanitizedText,
      reasonFr: 'Ce contenu a été bloqué par le filtre anti-spam.',
      flags,
    };
  }

  const normalizedForProfanity = sanitizedText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    LATIN_PROFANITY_RE.test(normalizedForProfanity) ||
    JA_SLURS.some((term) => sanitizedText.includes(term))
  ) {
    flags.push('profanity');
    return {
      allowed: false,
      sanitizedText,
      reasonFr: 'Merci de garder un langage respectueux et adapté à l’apprentissage.',
      flags,
    };
  }

  return {
    allowed: true,
    sanitizedText,
    flags,
  };
}
