import { test } from '../fixtures/test'

test.describe('Signatures - sign a message', () => {
  test('can sign a message and shows signed result', async ({ dashboardPage, mode }) => {
    test.setTimeout(180_000)

    const m = mode
    const msg = `E2E hello ${Date.now()}`
    await dashboardPage.signMessage(msg, m)
  })
})
