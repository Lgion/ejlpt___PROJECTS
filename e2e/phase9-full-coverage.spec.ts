import { test, expect } from '@playwright/test';

test.describe('Phase 9 Full Coverage E2E & Security Audit', () => {
  test('verifies Navbar dropdown, Dictionary, Grammar visual system, Practice hubs, Reader v2 & Video', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 1. Navbar primary links & Explorer dropdown
    await page.goto('/');
    for (const label of ['Examens', 'Leçons', 'Quiz & SRS', 'Kanji', 'Dico', 'Grammaire']) {
      await expect(page.getByRole('link', { name: label }).first()).toBeVisible();
    }

    await page.getByRole('button', { name: 'Explorer' }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    for (const sub of ['Presse Todai', 'Lecteur & Vidéo', 'Immersion', 'Tchat Oral IA', 'FAQ Publique', 'Outils (9)', 'Ressources']) {
      await expect(menu.getByText(sub)).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();

    // Toggle adaptive profile & furigana buttons cleanly
    await page.getByTitle(/Profil adaptatif Kanjiverse/i).click();
    await page.getByTitle(/mode Furigana/i).click();

    // 2. Dictionary /dictionary
    await page.goto('/dictionary');
    await expect(
      page.getByRole('heading', { name: /Dictionnaires Lexicaux, Scripts & Polysémie/i })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: /Polysémie/i })).toBeVisible();
    await page.getByRole('tab', { name: /Proverbes/i }).click();
    await expect(page.getByText(/七転び八起き/)).toBeVisible({ timeout: 15_000 });

    // 3. Grammar /grammar
    await page.goto('/grammar');
    await expect(page.getByRole('heading', { name: /Grammaire/i }).first()).toBeVisible();
    await expect(page.getByLabel(/Format d'affichage des connexions/i)).toBeVisible();

    // 4. Practice /practice (Yomikata Z & Drag-Drop / Writing)
    await page.goto('/practice');
    await page.getByRole('button', { name: 'Yomikata Z', exact: true }).click();
    await expect(page.getByText(/Yomikata Z — Lecture contextuelle/i)).toBeVisible();
    // Answer 1st QCM option
    await page.locator('.yomikata__option').first().click();
    await expect(page.getByText('Audio JA')).toBeVisible();

    await page.getByRole('button', { name: /Drag-Drop, Tri & Écriture/i }).click();
    await expect(page.getByText(/Drag-and-Drop, Tri grammatical/i)).toBeVisible();
    await page.getByRole('button', { name: 'Tri 1段 / 5段 / Irr.', exact: true }).click();
    await expect(page.getByText(/1段 \(Ichidan\)/)).toBeVisible();
    await page.getByRole('button', { name: /Écriture Kanji Notée/i }).click();
    await expect(page.getByText(/Canvas d'écriture/i)).toBeVisible();

    // 5. Reader v2 & Video subtitles /reader
    await page.goto('/reader');
    await expect(page.getByRole('button', { name: /Générer un quiz depuis ce texte/i })).toBeEnabled({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: /Générer un quiz depuis ce texte/i }).click();
    await expect(page.getByLabel('Quiz généré depuis le texte')).toBeVisible();
    await page.getByRole('button', { name: 'Fermer le quiz' }).click();

    await page.getByRole('button', { name: /Vidéo & Sous-Titres Interactifs/i }).click();
    await expect(page.getByText(/Lecteur Vidéo à Sous-Titres Interactifs/i)).toBeVisible();
    await expect(page.getByText(/Timeline des sous-titres/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('verifies Immersion, Tools (without Map), News, FAQ, Chat, Lessons, Resources & API security boundaries', async ({
    page,
    request,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // 6. Immersion /immersion
    await page.goto('/immersion');
    await expect(page.getByRole('heading', { name: /Hub d'Immersion Japonaise/i })).toBeVisible();
    await page.getByRole('button', { name: /Définitions JA, Presse & Claviers/i }).click();
    await expect(page.getByText(/Fcitx5 \+ Mozc/)).toBeVisible();
    await page.getByRole('button', { name: /Scénarios Image & Gairaigo Oral/i }).click();
    await expect(page.getByText(/Programme Oral Gairaigo/i)).toBeVisible();

    // 7. Tools /tools (9 tabs, no Map)
    await page.goto('/tools');
    await expect(page.getByRole('button', { name: 'Map', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: /Table Conjugaison/i }).click();
    await expect(page.getByText(/Table Complète de Conjugaison Japonaise/i)).toBeVisible();
    await page.getByRole('button', { name: /Récap Politesse/i }).click();
    await expect(page.getByText(/Règle d’or Soto/i)).toBeVisible();
    await page.getByRole('button', { name: /おすすめのリンクス/i }).click();
    await expect(page.getByText('Jisho.org')).toBeVisible();
    await page.getByRole('button', { name: /Todo-List IA/i }).click();
    await expect(page.getByText(/Co-rédacteur de programme IA/i)).toBeVisible();

    // 8. Phase 8 routes
    await page.goto('/news');
    await expect(page.getByRole('heading', { name: /Presse Quotidienne Graduée/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'N5', exact: true })).toBeVisible();

    await page.goto('/faq');
    await expect(page.getByRole('heading', { name: /Questions & Réponses Publiques/i })).toBeVisible();
    await expect(page.getByText(/différence entre は \(wa\) et が \(ga\)/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/chat');
    await expect(page.getByRole('heading', { name: /Dialogue Guidé/i })).toBeVisible();

    await page.goto('/lessons');
    await expect(page.getByRole('heading', { name: /Curriculum Structuré/i })).toBeVisible();
    await expect(page.getByText(/Leçon 1/i).first()).toBeVisible();

    await page.goto('/resources');
    await expect(page.getByText(/Katakana \(カタカナ\) en premier/i)).toBeVisible();
    await expect(page.getByText(/edict_database/)).toBeVisible();
    await expect(page.getByText(/kanjium/)).toBeVisible();
    await expect(page.getByText(/japanese-toolkit/)).toBeVisible();
    await expect(page.getByText(/kanjiapi\.dev/)).toBeVisible();

    // 9. API Security checks (zero secret leaks & cron guards)
    const statusRes = await request.get('/api/ai/status');
    expect(statusRes.status()).toBe(200);
    const statusText = await statusRes.text();
    expect(statusText).not.toContain('AIza');
    expect(statusText).not.toContain('GEMINI_API_KEY');
    const statusJson = JSON.parse(statusText) as {
      ok: boolean;
      fallbackChainLength: number;
    };
    expect(statusJson.ok).toBe(true);
    expect(statusJson.fallbackChainLength).toBeGreaterThanOrEqual(1);

    const cronNewsRes = await request.get('/api/cron/daily-news');
    expect(cronNewsRes.status()).toBe(401);

    const cronSlangRes = await request.get('/api/cron/slang-refresh');
    expect(cronSlangRes.status()).toBe(401);

    expect(pageErrors).toEqual([]);
  });
});
