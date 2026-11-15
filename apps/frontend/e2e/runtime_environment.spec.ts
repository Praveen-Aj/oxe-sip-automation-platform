import { test, expect } from '@playwright/test'

test.describe('Runtime Manager & Environment Manager Workflows', () => {
  test('Runtime Manager discovery, interaction, and diagnostics modal', async ({ page }) => {
    await page.goto('/')

    // Navigate to Runtime Manager
    await page.getByRole('button', { name: /runtime manager/i }).click()
    await expect(page.getByRole('heading', { name: 'Runtime Manager' })).toBeVisible()

    // Verify key platform runtime cards
    await expect(page.getByText('Local Windows Host')).toBeVisible()
    await expect(page.getByText('Local Windows WSL2')).toBeVisible()
    await expect(page.getByText(/Simulated/i).first()).toBeVisible()

    // Test "Add Remote Host" modal dialog
    await page.getByRole('button', { name: /add remote host/i }).click()
    await expect(page.getByText('Register Remote Linux Host')).toBeVisible()
    await expect(page.getByText('Private SSH Key Reference Path')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Register Remote Linux Host')).not.toBeVisible()

    // Test Diagnostics modal inspection
    const inspectBtn = page.getByRole('button', { name: 'View Diagnostics' }).first()
    await expect(inspectBtn).toBeVisible()
    await inspectBtn.click()
    await expect(page.getByText(/diagnostics:/i)).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
  })

  test('Environment Manager listing, creation modal, and target activation', async ({ page }) => {
    await page.goto('/')

    // Navigate to Environments
    await page.getByRole('button', { name: /environments/i }).click()
    await expect(page.getByRole('heading', { name: 'Environments & Target Nodes' })).toBeVisible()

    // Verify presence of default and demo environments
    await expect(page.getByText('Hardware Lab OXE Primary')).toBeVisible()
    await expect(page.getByText('DEMO', { exact: true })).toBeVisible()

    // Test "Create Environment" modal dialog
    await page.getByRole('button', { name: /create environment/i }).click()
    await expect(page.getByText('Create Test Environment Profile')).toBeVisible()
    await expect(page.getByText('OXE PBX IP')).toBeVisible()
    await expect(page.getByText('SIP Domain / Realm')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Create Test Environment Profile')).not.toBeVisible()

    // Test active target selection
    const targetButtons = page.getByRole('button', { name: /select target/i })
    if (await targetButtons.count() > 0) {
      await targetButtons.first().click()
      await expect(page.getByText('Active Target').first()).toBeVisible()
    }
  })

  test('Rocky Linux single-host diagnostics, SIPp install guide, and profile export', async ({ page }) => {
    await page.goto('/')

    // Navigate to Runtime Manager
    await page.getByRole('button', { name: /runtime manager/i }).click()
    await expect(page.getByText('Rocky Linux Lab Server')).toBeVisible()
    await expect(page.getByText('CALLER + CALLED')).toBeVisible()

    // Test SIPp Guide modal
    await page.getByRole('button', { name: 'SIPp Guide' }).click()
    await expect(page.getByText(/SIPp Installation Guide:/i)).toBeVisible()
    await expect(page.getByText('EPEL Package (Recommended)')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByText(/SIPp Installation Guide:/i)).not.toBeVisible()

    // Navigate to Environments
    await page.getByRole('button', { name: /environments/i }).click()
    await expect(page.getByText('Hardware Lab OXE Primary')).toBeVisible()

    // Test Export Profile modal
    const exportBtn = page.getByRole('button', { name: /export profile/i }).first()
    await exportBtn.click()
    await expect(page.getByText('Export Environment Profile')).toBeVisible()
    await expect(page.getByText(/Zero Secrets Contained/i)).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
  })
})
