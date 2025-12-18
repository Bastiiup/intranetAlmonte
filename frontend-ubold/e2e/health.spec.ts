/**
 * Pruebas E2E para el endpoint de health check
 */

import { test, expect } from '@playwright/test'

test.describe('Health Check', () => {
  test('debe responder correctamente el endpoint de health', async ({ request }) => {
    const response = await request.get('/api/health')
    
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)
    
    const body = await response.json()
    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('timestamp')
  })
})
