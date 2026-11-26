import { describe, expect, it } from 'vitest';
import { moderateUserText, sanitizeTextInput } from '@/lib/ai/moderation';

describe('moderation', () => {
  it('accepts clean Japanese and French learning content', () => {
    const res = moderateUserText('先生に質問してもよろしいでしょうか。 (Puis-je poser une question ?)');
    expect(res.allowed).toBe(true);
    expect(res.flags).toEqual([]);
  });

  it('strips HTML tags and control characters safely', () => {
    const clean = sanitizeTextInput('<script>alert(1)</script>  猫が\t好きです  ');
    expect(clean).toBe('alert(1) 猫が 好きです');
  });

  it('rejects too-short, spam links, flood repeats, and profanity', () => {
    expect(moderateUserText('a').allowed).toBe(false);
    expect(moderateUserText('Visitez https://spam.example.com maintenant').allowed).toBe(false);
    expect(moderateUserText('aaaaaaaaaaaaa').allowed).toBe(false);
    expect(moderateUserText('Tu es un connard').allowed).toBe(false);
    expect(moderateUserText('きもい死ね').allowed).toBe(false);
  });
});
