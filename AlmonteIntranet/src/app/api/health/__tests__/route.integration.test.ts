/**
 * @jest-environment node
 */

/**
 */

/**
 * Pruebas de integración para /api/health
 */

import { NextRequest } from 'next/server'
import { GET } from '../route'

describe('/api/health', () => {
  describe('GET', () => {
    it('debe retornar status ok con timestamp', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0)
    })

    it('debe retornar timestamp en formato ISO', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET()
      const data = await response.json()

      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('debe retornar siempre 200', async () => {
      const request = new NextRequest('http://localhost:3000/api/health')
      const response = await GET()

      expect(response.status).toBe(200)
    })
  })
})

