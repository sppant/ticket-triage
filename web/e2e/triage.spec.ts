import { expect, test } from '@playwright/test';

test('triages an example ticket and renders the result card', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('No ticket triaged yet')).toBeVisible();

  await page.getByRole('button', { name: /Double charge/ }).click();
  await expect(page.getByLabel('Subject')).not.toHaveValue('');

  await page.getByRole('button', { name: 'Triage ticket' }).click();

  const card = page.getByTestId('result-card');
  await expect(card).toBeVisible();
  await expect(card.getByTestId('category-badge')).not.toBeEmpty();
  await expect(card.getByTestId('priority-badge')).toContainText('priority');
  await expect(card.getByTestId('draft-reply')).not.toBeEmpty();
  await expect(card.getByTestId('model')).not.toBeEmpty();
  await expect(card.getByTestId('route-reason')).not.toBeEmpty();
  await expect(card.getByTestId('sources')).toContainText('Duplicate charges and failed payments');
  await expect(card.getByTestId('retrieval')).toHaveText('Keyword search');
  await expect(card.getByTestId('latency')).toHaveText(/\d+(\.\d)? (ms|s)/);

  await expect(page.getByRole('region', { name: 'Recent triages' })).toContainText('Charged twice');
});
