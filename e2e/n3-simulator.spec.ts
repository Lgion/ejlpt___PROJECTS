import { test, expect } from '@playwright/test';

test.describe('JLPT N3 Official 2018 Simulator', () => {
  test('runs Official Strict 3-stage simulation with cover gates, OMR sheet, reading split-view, listening scratchpad, and /180 results', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Open launch modal from Official N3 catalog card
    await expect(page.getByText('Cahier Officiel · 102 Q')).toBeVisible();
    await page.getByRole('button', { name: /Configurer & Simuler \(N3 · 3 Modes\)/i }).click();

    const launchDialog = page.locator('dialog.jlpt-launch-dialog[open]');
    await expect(launchDialog).toBeVisible();
    await expect(launchDialog.getByText('1. Examen Officiel Strict')).toBeVisible();
    await expect(launchDialog.getByText('2. Conditions Paramétrables')).toBeVisible();
    await expect(launchDialog.getByText('3. Choix Modulaire (Épreuves / 問題)')).toBeVisible();

    // Launch Mode 1: OFFICIAL_STRICT
    await launchDialog.getByRole('button', { name: 'Démarrer la session' }).click();

    // 2. Stage 1 Cover Gate (もんだいようし)
    await expect(page.locator('.jlpt-sim-shell.jlpt-theme-paper')).toBeVisible();
    await expect(page.getByText('もんだいようし').first()).toBeVisible();
    await expect(page.getByText('（30ぷん）')).toBeVisible();
    await expect(page.getByText('Conditions Officielles Strictes')).toBeVisible();

    await page.getByRole('button', { name: /問題用紙を開く/i }).click();

    // 3. Vocab Booklet + OMR interaction + live Paper/Dark toggle
    await expect(page.getByText('観客').first()).toBeVisible();
    await page.locator('label[for="omr-n3-2018-v-1-4"]').click();
    await expect(page.locator('#omr-n3-2018-v-1-4')).toBeChecked();
    await expect(page.locator('.jlpt-omr-sheet__counter')).toContainText('1 / 35');

    await page.getByRole('button', { name: /Basculer entre thème Papier/i }).click();
    await expect(page.locator('.jlpt-sim-shell.jlpt-theme-dark')).toBeVisible();
    await page.getByRole('button', { name: /Basculer entre thème Papier/i }).click();
    await expect(page.locator('.jlpt-sim-shell.jlpt-theme-paper')).toBeVisible();

    // Submit Stage 1 -> Irreversible transition to Stage 2 Cover Gate
    await page.getByRole('button', { name: 'Remettre le cahier' }).first().click();
    const confirmDialog = page.locator('dialog.jlpt-confirm-dialog[open]');
    await expect(confirmDialog).toBeVisible();
    await confirmDialog
      .getByRole('button', { name: 'Remettre ce cahier et passer à la suite' })
      .click();

    // 4. Stage 2 Cover Gate (文法・読解 70分)
    await expect(page.getByText(/Pause entre les épreuves/i)).toBeVisible();
    await expect(page.getByText('（70分）')).toBeVisible();
    await page.getByRole('button', { name: /問題用紙を開く/i }).click();

    // Verify ★ ordering question (問題2 Q14) and split-view Reading Poster (問題7 Q38)
    await page.locator('label[for="omr-n3-2018-g-14-2"]').click();
    await expect(page.locator('.jlpt-star-slot').first()).toBeVisible();

    await page.locator('label[for="omr-n3-2018-r-38-2"]').click();
    await expect(page.getByRole('heading', { name: '大原動物園をもっと楽しむために' })).toBeVisible();
    await expect(page.getByText('夜の動物園').first()).toBeVisible();

    // Submit Stage 2 -> Stage 3 Listening Cover Gate
    await page.getByRole('button', { name: 'Remettre le cahier' }).first().click();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog
      .getByRole('button', { name: 'Remettre ce cahier et passer à la suite' })
      .click();

    // 5. Stage 3 Listening (聴解)
    await expect(page.getByRole('heading', { name: '聴解' })).toBeVisible();
    await page.getByRole('button', { name: /問題用紙を開く/i }).click();

    await expect(page.getByText('Flux Audio Officiel Verrouillé')).toBeVisible();
    const mondai1Img = page.locator('img[src*="mondai1-q1.png"]');
    await expect(mondai1Img).toBeVisible();
    await expect
      .poll(() => mondai1Img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);

    // Jump to 問題3 Q1 to verify − メモ − scratchpad
    await page.locator('label[for="omr-n3-2018-l-13-3"]').click();
    const memoPad = page.locator('#memo-mondai-3');
    await expect(memoPad).toBeVisible();
    await memoPad.fill('会話のポイント：駅の西口');

    // Verify 問題4 uses 3-bubble OMR rows (1..3 only, no choice 4)
    await expect(page.locator('#omr-n3-2018-l-16-3')).toBeAttached();
    await expect(page.locator('#omr-n3-2018-l-16-4')).toHaveCount(0);
    await page.locator('label[for="omr-n3-2018-l-16-1"]').click();

    // Submit final Listening stage
    await page.getByRole('button', { name: 'Terminer & Noter' }).first().click();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Soumettre la feuille finale' }).click();

    // 6. Scaled /180 Results + Granular Breakdown
    await expect(page.getByText(/Score Total : .* \/ 180 pts/)).toBeVisible();
    await expect(page.getByText('言語知識（文字・語彙・文法）').first()).toBeVisible();
    await expect(page.getByText('読解 (Compréhension écrite)')).toBeVisible();
    await expect(page.getByText('聴解 (Écoute Choukai)')).toBeVisible();
    await expect(page.locator('.jlpt-official-breakdown')).toBeVisible();

    await page.getByRole('button', { name: 'Retourner au Tableau de Bord' }).click();
    await expect(page.getByText('Choisissez votre Epreuve & Niveau')).toBeVisible();
  });

  test('supports Modular Selection mode with Unlimited timer, Immediate Feedback, and Segmented Audio', async ({
    page,
  }) => {
    await page.goto('/');

    // Switch to Modular tab and open N3 modular picker
    await page.getByRole('button', { name: 'Entraînement Modulaire' }).click();
    await page.getByRole('button', { name: /Choisir des épreuves sur mesure \(問題\)/i }).click();

    const launchDialog = page.locator('dialog.jlpt-launch-dialog[open]');
    await expect(launchDialog).toBeVisible();

    // Add listening 問題4 to preselected written modules, enable unlimited timer + immediate feedback
    await launchDialog.getByText('聴解 問題4（発話表現）').click();
    await launchDialog.getByRole('button', { name: 'Libre', exact: true }).click();
    const immCheck = launchDialog.getByLabel('Correction immédiate');
    if (!(await immCheck.isChecked())) {
      await immCheck.check();
    }

    await launchDialog.getByRole('button', { name: 'Démarrer la session' }).click();

    // Verify immediate written stage (no cover gate in modular preset) + Chrono libre
    await expect(page.getByText('Mode Choix Modulaire')).toBeVisible();
    await expect(page.getByText('Chrono libre')).toBeVisible();

    // Click option 4 on Q1 -> immediate feedback banner appears
    await page.locator('.jlpt-option-card').nth(3).click();
    await expect(page.locator('.jlpt-immediate-feedback')).toBeVisible();

    // Move to Listening stage -> check segmented free controls & mondai4 illustration
    await page.getByRole('button', { name: 'Remettre le cahier' }).first().click();
    const confirmDialog = page.locator('dialog.jlpt-confirm-dialog[open]');
    await confirmDialog
      .getByRole('button', { name: 'Remettre ce cahier et passer à la suite' })
      .click();

    await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
    await expect(page.getByRole('button', { name: '0.85x' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Script', exact: true })).toBeVisible();

    const mondai4Img = page.locator('img[src*="mondai4-q1.png"]');
    await expect(mondai4Img).toBeVisible();
    await expect
      .poll(() => mondai4Img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);

    // Reveal spoken script in free mode
    await page.getByRole('button', { name: 'Script', exact: true }).click();
    await expect(page.locator('.jlpt-script-box')).toBeVisible();

    // Finish modular session cleanly
    await page.getByRole('button', { name: 'Terminer & Noter' }).first().click();
    await confirmDialog.getByRole('button', { name: 'Soumettre la feuille finale' }).click();
    await expect(page.getByText(/Score Total : .* \/ 180 pts/)).toBeVisible();
  });
});
