import { test, expect } from '@playwright/test'

test.describe('Scenario Catalogue -> Configuration -> Preflight E2E Journey', () => {
  test('end-to-end scenario selection, configuration wizard, and preflight readiness gate', async ({ page }) => {
    // 1. Visit App
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'OXE SIPp Automation' })).toBeVisible()

    // 2. Open Scenario Catalogue
    await page.getByRole('button', { name: /scenario catalogue/i }).click()
    await expect(page.getByRole('heading', { name: 'SIP Scenario Catalogue' })).toBeVisible()

    // Verify scenario cards exist
    await expect(page.getByText('INVITE_Caller_Auth_PRACK')).toBeVisible()
    await expect(page.locator('span', { hasText: /^UAC$/ }).first()).toBeVisible()

    // 3. Inspect XML Modal
    const inspectButtons = page.getByRole('button', { name: /view xml/i })
    if (await inspectButtons.count() > 0) {
      await inspectButtons.first().click()
      await expect(page.getByText('INVITE_Caller_Auth_PRACK')).toBeVisible()
      // Close modal
      const closeButtons = page.locator('button:has(svg.lucide-x)')
      if (await closeButtons.count() > 0) {
        await closeButtons.first().click()
      }
    }

    // 4. Click Configure on a Scenario Card
    const configureButtons = page.getByRole('button', { name: /configure/i })
    await configureButtons.first().click()

    // 5. Verify Test Configuration Wizard opened
    await expect(page.getByRole('heading', { name: 'Test Configuration Engine' })).toBeVisible()
    await expect(page.getByText('Step 1: Select Target Environment')).toBeVisible()

    // Step 1: Advance to Step 2
    await page.getByRole('button', { name: /next: choose scenario/i }).click()
    await expect(page.getByText('Step 2: Choose SIP Scenario Asset')).toBeVisible()

    // Step 2: Advance to Step 3
    await page.getByRole('button', { name: /next: dialplan settings/i }).click()
    await expect(page.getByText('Step 3: Dialplan Subscribers & Networking Ports')).toBeVisible()

    // Step 3: Advance to Step 4
    await page.getByRole('button', { name: /next: traffic & protocol/i }).click()
    await expect(page.getByText('Step 4: Traffic Rates, SIP Authentication & PRACK')).toBeVisible()

    // Step 4: Advance to Step 5
    await page.getByRole('button', { name: /next: review & save/i }).click()
    await expect(page.getByText('Configuration Summary')).toBeVisible()

    // 6. Save Configuration & Advance to Preflight
    await page.getByRole('button', { name: /proceed to preflight/i }).first().click()

    // 7. Verify Preflight Validation View
    await expect(page.getByRole('heading', { name: 'Preflight Readiness Check' })).toBeVisible()
    await expect(page.getByText('READY FOR EXECUTION')).toBeVisible()
    await expect(page.getByRole('button', { name: /re-run preflight/i })).toBeVisible()

    // Verify check categories
    await expect(page.getByText('Validation Checks')).toBeVisible()
  })

  test('scenario filtering by category', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /scenario catalogue/i }).click()
    await expect(page.getByRole('heading', { name: 'SIP Scenario Catalogue' })).toBeVisible()

    // Filter by Registration category
    await page.getByRole('button', { name: 'Registration', exact: true }).click()
    await expect(page.getByText('REGISTER.xml')).toBeVisible()

    // Reset to ALL
    await page.getByRole('button', { name: 'ALL', exact: true }).click()
    await expect(page.getByText('INVITE_Caller_Auth_PRACK')).toBeVisible()
  })

  test('preflight view category filtering and blocker differentiation', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /preflight checks/i }).click()
    await expect(page.getByRole('heading', { name: 'Preflight Readiness Check' })).toBeVisible()

    // Verify filter pills
    await expect(page.getByRole('button', { name: 'ALL', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'BLOCKERS', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'WARNINGS', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'PASSED', exact: true })).toBeVisible()

    // Click Blockers only filter
    await page.getByRole('button', { name: 'BLOCKERS', exact: true }).click()
  })
})
