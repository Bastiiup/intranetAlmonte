/**
 * Pruebas E2E para el módulo de chat
 */

import { test, expect } from '@playwright/test'

test.describe('Chat API', () => {
  test('debe validar parámetros requeridos en GET /api/chat/mensajes', async ({ request }) => {
    const response = await request.get('/api/chat/mensajes')
    
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('requeridos')
  })

  test('debe validar parámetros requeridos en POST /api/chat/mensajes', async ({ request }) => {
    const response = await request.post('/api/chat/mensajes', {
      data: {},
    })
    
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('requeridos')
  })

  test('debe validar que los IDs sean números válidos', async ({ request }) => {
    const response = await request.get('/api/chat/mensajes?colaborador_id=abc&remitente_id=xyz')
    
    expect(response.status()).toBe(400)
    
    const body = await response.json()
    expect(body).toHaveProperty('error')
    expect(body.error).toContain('números válidos')
  })
})

