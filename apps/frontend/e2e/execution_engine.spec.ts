import { test, expect } from '@playwright/test'

test.describe('Complete SIP Execution Engine & Operational Workflow', () => {
  test('end-to-end flow: configuration -> preflight -> execution launch -> live monitoring -> diagnostics -> history -> report', async ({ page }) => {
    // 1. Visit Dashboard
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'OXE SIPp Automation' })).toBeVisible()

    // 2. Open Test Execution Launcher
    await page.getByRole('button', { name: /test execution/i }).click()
    await expect(page.getByRole('heading', { name: 'Execution Launch Control' })).toBeVisible()
    await expect(page.getByText('SIMULATED EXECUTION')).toBeVisible()

    // 3. Switch to Physical Mode to verify safety confirmation gate
    await page.getByText('PHYSICAL OXE EXECUTION').click()
    await expect(page.getByText('Physical OXE SIP Traffic Confirmation Required')).toBeVisible()

    // Launch without confirmation should be disabled or blocked
    const launchPhyBtn = page.getByRole('button', { name: /launch physical test run/i })
    await expect(launchPhyBtn).toBeDisabled()

    // 4. Return to Simulated Mode
    await page.getByText('SIMULATED EXECUTION').click()
    const launchSimBtn = page.getByRole('button', { name: /launch simulated test run/i })
    await expect(launchSimBtn).toBeEnabled()

    // 5. Launch Simulated Run
    await launchSimBtn.click()

    // 6. Navigate to Live Monitor directly via sidebar
    await page.getByRole('button', { name: /live monitor/i }).click()
    await expect(page.getByRole('heading', { name: 'Live Execution & Telemetry Monitor' })).toBeVisible()
    await expect(page.getByText(/CALLER Host/i)).toBeVisible()
    await expect(page.getByText(/CALLED Host/i)).toBeVisible()
    await expect(page.getByText('Telemetry Stream: Live')).toBeVisible()

    // 7. Check execution controls (Stop)
    const stopButtons = page.getByRole('button', { name: /stop test/i })
    if (await stopButtons.count() > 0) {
      await stopButtons.first().click()
    }

    // 8. Navigate to Diagnostics
    await page.getByRole('button', { name: /sip diagnostics/i }).click()
    await expect(page.getByRole('heading', { name: 'SIP Diagnostics & Failure Analysis' })).toBeVisible()
    await expect(page.getByText('Root Cause Synthesis')).toBeVisible()

    // 9. Navigate to History
    await page.getByRole('button', { name: /test history/i }).click()
    await expect(page.getByRole('heading', { name: 'Execution History & Test Runs' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()

    // 10. Navigate to Reports
    await page.getByRole('button', { name: /reports & audits/i }).click()
    await expect(page.getByRole('heading', { name: 'Execution Reports & Audit Exports' })).toBeVisible()
    await expect(page.getByText('Generated Report Document')).toBeVisible()
    await expect(page.getByText('AUDIT VERIFIED')).toBeVisible()
  })
})
