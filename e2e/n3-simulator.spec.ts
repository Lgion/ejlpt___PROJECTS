import { test, expect } from '@playwright/test';

test.describe('JLPT Multi-Exam Anonymized Simulator & Dynamic Composer', () => {
  test('runs Official Strict 3-stage simulation (JLPT N3 — Examen #1) with cover gates, OMR sheet, reading split-view, listening scratchpad, and /180 results', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify anonymized catalog cards (no 2018/2012 years exposed to the learner)
    await expect(page.locator('.exam-catalog')).not.toContainText(/2018|2012/);

    // 1. Open launch modal from Official N3 catalog card
    const n3Card = page.locator('.exam-card', { hasText: 'JLPT N3' });
    await expect(n3Card.getByText('Cahier Officiel · 102 Q')).toBeVisible();
    await n3Card.getByRole('button', { name: /Configurer & Simuler \(N3 · 3 Modes\)/i }).click();

    const launchDialog = page.locator('dialog.jlpt-launch-dialog[open]');
    await expect(launchDialog).toBeVisible();
    await expect(launchDialog.getByText('N3 · Examen #1')).toBeVisible();
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

    // Open N3 configuration modal and select Mode 3 (Choix Modulaire)
    const n3Card = page.locator('.exam-card', { hasText: 'JLPT N3' });
    await n3Card.getByRole('button', { name: /Configurer & Simuler \(N3 · 3 Modes\)/i }).click();

    const launchDialog = page.locator('dialog.jlpt-launch-dialog[open]');
    await expect(launchDialog).toBeVisible();
    await launchDialog.getByText('3. Choix Modulaire (Épreuves / 問題)').click();

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
    await expect(page.locator('.jlpt-sim-hud__timer--desktop')).toContainText('Chrono libre');
    await expect(page.locator('.jlpt-mobile-sticky-timer')).toBeHidden();

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

  test('displays 5 unified level cards (N5–N1) with inline Examen #1 / #2 / Mixte selector, 2-stage N1 simulator, and Examen #2 illustrated questions', async ({
    page,
  }) => {
    await page.goto('/');

    // 5 unified cards (one per level N5..N1, no duplicate cards)
    await expect(page.locator('.exam-card')).toHaveCount(5);
    await expect(page.getByText('Cahier Officiel · 91 Q')).toBeVisible();
    await expect(page.getByText('Cahier Officiel · 98 Q')).toBeVisible();
    await expect(page.getByText('Cahier Officiel · 102 Q')).toBeVisible();
    await expect(page.getByText('Cahier Officiel · 107 Q')).toHaveCount(2);

    // 1. Launch N1 Examen #1 2-stage Official Strict simulation
    const n1Card = page.locator('.exam-card', { hasText: 'JLPT N1' });
    await n1Card.getByRole('button', { name: /Configurer & Simuler \(N1 · 3 Modes\)/i }).click();

    const launchDialog = page.locator('dialog.jlpt-launch-dialog[open]');
    await expect(launchDialog).toBeVisible();
    await launchDialog.getByRole('button', { name: 'Démarrer la session' }).click();

    // Stage 1: 110 min combined written booklet
    await expect(page.getByText('（110分）')).toBeVisible();
    await page.getByRole('button', { name: /問題用紙を開く/i }).click();
    await expect(page.getByText('人脈').first()).toBeVisible();
    await expect(page.locator('.jlpt-margin-tab')).toContainText('文字・語彙');

    // Jump to N1 Reading Q69 (情報検索)
    await page.locator('label[for="omr-n1-2018-r-69-1"]').click();
    await expect(page.getByRole('heading', { name: /他大学の図書館の資料の利用について/ })).toBeVisible();

    // Submit Stage 1 -> directly Stage 2 Listening (only 2 stages total)
    await page.getByRole('button', { name: 'Remettre le cahier' }).first().click();
    const confirmDialog = page.locator('dialog.jlpt-confirm-dialog[open]');
    await confirmDialog
      .getByRole('button', { name: 'Remettre ce cahier et passer à la suite' })
      .click();

    await expect(page.getByRole('heading', { name: '聴解' })).toBeVisible();
    await page.getByRole('button', { name: /問題用紙を開く/i }).click();

    // Verify N1 Listening Mondai 5 printed 3(1) / 3(2) choices
    await page.locator('label[for="omr-n1-2018-l-36-1"]').click();
    await expect(page.getByText('富田美術館').first()).toBeVisible();
    await expect(page.locator('#memo-mondai-5')).toHaveCount(0);

    // Return home & select Examen #2 inside the N5 configuration modal
    await page.getByRole('button', { name: 'Terminer & Noter' }).first().click();
    await confirmDialog.getByRole('button', { name: 'Soumettre la feuille finale' }).click();
    await expect(page.getByText(/Score Total : .* \/ 180 pts/)).toBeVisible();
    await page.getByRole('button', { name: 'Retourner au Tableau de Bord' }).click();

    const n5Card = page.locator('.exam-card', { hasText: 'JLPT N5' });
    await n5Card.getByRole('button', { name: /Configurer & Simuler \(N5 · 3 Modes\)/i }).click();
    await launchDialog.getByRole('button', { name: /Examen #2 \(89 Q\)/i }).click();

    await launchDialog.getByRole('button', { name: 'Démarrer la session' }).click();
    await page.getByRole('button', { name: /問題用紙を開く/i }).click();

    // Jump to N5 Examen #2 Vocab Q12 (pseudo-kanji strip image)
    await page.locator('label[for="omr-n5-2012-v-12-2"]').click();
    const vocabImg = page.locator('img[src*="vocab-q12.png"]');
    await expect(vocabImg).toBeVisible();
    await expect
      .poll(() => vocabImg.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  });

  test('composes and runs a Dynamic Mixed Exam directly inside the unified launch modal', async ({
    page,
  }) => {
    await page.goto('/');

    // Open N3 configuration modal and select Examen Mixte
    const n3Card = page.locator('.exam-card', { hasText: 'JLPT N3' });
    await n3Card.getByRole('button', { name: /Configurer & Simuler \(N3 · 3 Modes\)/i }).click();

    const launchDialog = page.locator('dialog.jlpt-launch-dialog[open]');
    await expect(launchDialog).toBeVisible();
    await launchDialog.getByRole('button', { name: /Examen Mixte/i }).click();
    await expect(launchDialog.getByText('N3 · Examen Mixte')).toBeVisible();
    await expect(launchDialog.getByText(/JLPT N3 — Examen Mixte #/)).toBeVisible();

    // Pick Examen #2 explicitly for the first part and Examen #1 for the second part right inside ExamLaunchModal
    const selects = launchDialog.locator('select.jlpt-mixer-select');
    await expect(selects.first()).toBeVisible();
    await selects.nth(0).selectOption('exam-n3-official-2012');
    await selects.nth(1).selectOption('exam-n3-official-2018');

    // Toggle fine shuffle inside the unified modal and start session
    await launchDialog.getByRole('button', { name: /Panachage fin/i }).click();
    await launchDialog.getByRole('button', { name: 'Démarrer la session' }).click();

    // Open Stage 1 cover gate -> verify Examen #2's Q1 (from exam-n3-official-2012 vocab_m1) is active
    await page.getByRole('button', { name: /問題用紙を開く/i }).click();
    await expect(page.locator('label[for="omr-n3-2012-v-1-3"]')).toBeVisible();
    await page.locator('label[for="omr-n3-2012-v-1-3"]').click();
    await expect(page.locator('#omr-n3-2012-v-1-3')).toBeChecked();
  });

  test('provides compact mobile exam HUD, sticky top-right timer, fixed bottom nav footer, and direct 1..35 question navigation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const n3Card = page.locator('.exam-card', { hasText: 'JLPT N3' });
    await n3Card.getByRole('button', { name: /Configurer & Simuler \(N3 · 3 Modes\)/i }).click();
    const launchDialog = page.locator('dialog.jlpt-launch-dialog[open]');
    await launchDialog.getByRole('button', { name: 'Démarrer la session' }).click();
    await page.getByRole('button', { name: /問題用紙を開く/i }).click();

    // 1. Check compact site-header + sim-hud height (<= 250px) and compact app-footer (<= 100px)
    const siteHeaderBox = await page.locator('.site-header').boundingBox();
    const simHudBox = await page.locator('.jlpt-sim-hud').boundingBox();
    const bookletFooterBox = await page.locator('.jlpt-booklet-footer').boundingBox();
    const appFooterBox = await page.locator('.app-footer').boundingBox();
    expect(siteHeaderBox).not.toBeNull();
    expect(simHudBox).not.toBeNull();
    expect(bookletFooterBox).not.toBeNull();
    expect(appFooterBox).not.toBeNull();
    expect(siteHeaderBox!.height + simHudBox!.height).toBeLessThanOrEqual(250);
    expect(bookletFooterBox!.height).toBeLessThanOrEqual(100);
    expect(appFooterBox!.height).toBeLessThanOrEqual(100);

    // 2. All clickable HUD action buttons align on the same horizontal row, above non-clickable badges
    const exitBox = await page.locator('.jlpt-sim-hud__exit').boundingBox();
    const themeBox = await page.locator('.jlpt-sim-hud__tool-btn').first().boundingBox();
    const finishBox = await page.locator('.jlpt-sim-hud__finish-btn').boundingBox();
    const stagePillBox = await page.locator('.jlpt-sim-hud__stage-pill').boundingBox();
    expect(Math.abs(exitBox!.y - themeBox!.y)).toBeLessThanOrEqual(4);
    expect(Math.abs(exitBox!.y - finishBox!.y)).toBeLessThanOrEqual(4);
    expect(stagePillBox!.y).toBeGreaterThanOrEqual(exitBox!.y + exitBox!.height - 2);

    // 3. Direct jump across 35 items via horizontal QuestionJumpStrip & expandable Grid drawer
    await page.locator('.jlpt-q-jump__grid-btn').click();
    const drawer = page.locator('#jlpt-q-jump-drawer');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: '32', exact: true }).click();
    await expect(page.locator('.jlpt-booklet-folio')).toContainText('32 / 35');

    await page.locator('.jlpt-q-jump__strip').getByRole('button', { name: /Question 11/ }).click();
    await expect(page.locator('.jlpt-booklet-folio')).toContainText('11 / 35');

    await page.locator('.jlpt-q-jump__strip').getByRole('button', { name: /Question 3 \(/ }).click();
    await expect(page.locator('.jlpt-booklet-folio')).toContainText('3 / 35');

    await page.locator('.jlpt-q-jump__strip').getByRole('button', { name: /Question 7 \(/ }).click();
    await expect(page.locator('.jlpt-booklet-folio')).toContainText('7 / 35');

    // 4. Scroll down -> sticky timer stays pinned top-right right below .site-header and bottom nav bar stays fixed at viewport bottom
    await page.evaluate(() => window.scrollTo(0, 400));
    const stickyTimerBox = await page
      .locator('.jlpt-mobile-sticky-timer .jlpt-sim-hud__timer')
      .boundingBox();
    const fixedBottomBox = await page.locator('.jlpt-booklet-footer').boundingBox();
    expect(stickyTimerBox).not.toBeNull();
    expect(stickyTimerBox!.x + stickyTimerBox!.width).toBeGreaterThan(250);
    expect(stickyTimerBox!.y).toBeGreaterThanOrEqual(siteHeaderBox!.height - 2);
    expect(stickyTimerBox!.y).toBeLessThanOrEqual(siteHeaderBox!.height + 24);
    expect(fixedBottomBox!.y + fixedBottomBox!.height).toBeLessThanOrEqual(846);
    expect(fixedBottomBox!.y).toBeGreaterThan(740);
  });
});
