import { test, expect } from '@playwright/test';

test.describe('eJLPT critical offline-first flows', () => {
  test('hydrates Dexie, performs offline search, and navigates core modules', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Kanji' }).first()).toBeVisible();

    // Open offline search modal via button
    await page.getByRole('button', { name: /Rechercher/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const searchInput = dialog.getByRole('searchbox', { name: /Recherche globale hors-ligne/i });
    await searchInput.fill('語');

    // Wait for Dexie hydration + FlexSearch results to render
    await expect(dialog.getByText('語学').first()).toBeVisible({ timeout: 25_000 });
    await page.keyboard.press('Escape');

    // Navigate to Script 2 List / Reader
    await page.goto('/reader');
    await expect(page.getByRole('heading', { name: /Analyseur de Texte/i })).toBeVisible();
    await expect(page.getByText(/Vocabulaire \(/)).toBeVisible({ timeout: 20_000 });

    // Toggle adaptive furigana mode
    await page.getByRole('button', { name: 'Toujours', exact: true }).click();
    await expect(page.locator('ruby rt').first()).toBeVisible();

    // Navigate to Bookmarks and add a manual note
    await page.goto('/bookmarks');
    await page.getByRole('button', { name: 'Ajouter' }).click();
    await page.getByLabel('Mot / Kanji *').fill('漢字');
    await page.getByLabel('Sens / Traduction *').fill('Sinogramme');
    await page.getByRole('button', { name: 'Créer' }).click();
    await expect(page.locator('article').filter({ hasText: 'Sinogramme' }).first()).toBeVisible();

    // Navigate to Practice and run a 1-question check
    await page.goto('/practice');
    await expect(page.getByRole('heading', { name: /Pratique ciblée/i })).toBeVisible();
    await page.getByRole('button', { name: 'Lancer la session' }).click();
    await expect(page.getByText(/Question 1 \//)).toBeVisible({ timeout: 15_000 });

    // Navigate to History Heatmap & SMART goals
    await page.goto('/history');
    await expect(page.getByText(/Heatmap Kanji & Objectifs SMART/i)).toBeVisible();
    await expect(page.getByText(/Objectifs SMART Recommandés/i)).toBeVisible();

    // Navigate to Tools & verify Kanjiverse 3D tab loads dynamically without crashing
    await page.goto('/tools');
    await page.getByRole('button', { name: /Kanjiverse 3D/i }).click();
    await expect(page.getByText(/Constellation 3D Kanjiverse/i)).toBeVisible();
  });
});

