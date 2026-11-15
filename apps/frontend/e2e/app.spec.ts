import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('OXE SIP Automation Platform E2E & Accessibility Suite', () => {
  test('homepage displays header, sidebar, and dashboard view', async ({ page }) => {
    await page.goto('/')

    // Check title & branding with strict role selectors
    await expect(page.getByRole('heading', { name: 'OXE SIPp Automation' })).toBeVisible()
    await expect(page.getByText('Cross-Platform Suite')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'System Dashboard' })).toBeVisible()
    await expect(page.getByText('Simulated Runner Active')).toBeVisible()

    // Check key telemetry cards
    await expect(page.getByText('OXE Core Link')).toBeVisible()
    await expect(page.getByText('Protocol Modes')).toBeVisible()
    await expect(page.getByText('Engine State')).toBeVisible()
  })

  test('multi-step navigation across major platform views', async ({ page }) => {
    await page.goto('/')

    // 1. Navigate to Environments
    await page.getByRole('button', { name: /environments/i }).click()
    await expect(page.getByRole('heading', { name: 'Environments & Target Nodes' })).toBeVisible()
    await expect(page.getByText('Hardware Lab OXE Primary')).toBeVisible()

    // 2. Navigate to Runtime Manager
    await page.getByRole('button', { name: /runtime manager/i }).click()
    await expect(page.getByRole('heading', { name: 'Runtime Manager' })).toBeVisible()
    await expect(page.getByText('IExecutionRunner Interface v1.0')).toBeVisible()

    // 3. Navigate to Scenario Catalogue
    await page.getByRole('button', { name: /scenario catalogue/i }).click()
    await expect(page.getByRole('heading', { name: 'SIP Scenario Catalogue' })).toBeVisible()
    await expect(page.getByText('INVITE_Caller_Auth_PRACK')).toBeVisible()

    // 4. Navigate to Preflight Checks
    await page.getByRole('button', { name: /preflight checks/i }).click()
    await expect(page.getByRole('heading', { name: 'Preflight Readiness Check' })).toBeVisible()
    await expect(page.getByText(/READY/i).first()).toBeVisible()

    // 5. Navigate to SIP Diagnostics
    await page.getByRole('button', { name: /sip diagnostics/i }).click()
    await expect(page.getByRole('heading', { name: /SIP Diagnostics/i })).toBeVisible()
  })

  test('view state toggles (Empty, Loading, Error, Populated)', async ({ page }) => {
    await page.goto('/')

    // On Dashboard, switch to Empty state
    await page.getByRole('button', { name: 'empty' }).click()
    await expect(page.getByText('No system telemetry or historical test runs recorded yet.')).toBeVisible()

    // Switch to Error state
    await page.getByRole('button', { name: 'error' }).click()
    await expect(page.getByText('Failed to Load Data')).toBeVisible()

    // Switch back to Populated state
    await page.getByRole('button', { name: 'populated' }).click()
    await expect(page.getByText('OXE Core Link')).toBeVisible()
  })

  test('accessibility audit (WCAG compliance)', async ({ page }) => {
    await page.goto('/')

    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Ignore third-party theme contrast in prototype
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('responsive viewport validation across Desktop, Tablet, and Mobile', async ({ page }) => {
    // 1. Desktop Viewport (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'System Dashboard' })).toBeVisible()
    await expect(page.getByText('OXE Core Link')).toBeVisible()
    await expect(page.getByText('RFC 3261 (Core SIP)')).toBeVisible()
    await expect(page.getByText('Alcatel-Lucent OmniPCX Enterprise SIP Compliance Standards')).toBeVisible()

    // 2. Tablet Viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.getByRole('heading', { name: 'System Dashboard' })).toBeVisible()
    await expect(page.getByText('Configured Test Environments')).toBeVisible()
    await expect(page.getByText('Recent Test Executions')).toBeVisible()

    // 3. Mobile Viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.getByRole('heading', { name: 'System Dashboard' })).toBeVisible()
    await expect(page.getByText('OXE Core Link')).toBeVisible()
    await expect(page.getByRole('button', { name: /launch test run/i })).toBeVisible()
  })
})
