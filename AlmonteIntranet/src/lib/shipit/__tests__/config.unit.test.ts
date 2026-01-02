/**
 * Pruebas unitarias para config.ts
 */

describe('shipit config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Resetear variables de entorno antes de cada test
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('debe usar URL por defecto si no está configurada', () => {
    delete process.env.SHIPIT_API_URL
    const { SHIPIT_API_URL } = require('../config')
    expect(SHIPIT_API_URL).toBe('https://api.shipit.cl/v4')
  })

  it('debe usar URL desde variable de entorno', () => {
    process.env.SHIPIT_API_URL = 'https://api.custom.shipit.cl/v4'
    jest.resetModules()
    const { SHIPIT_API_URL } = require('../config')
    expect(SHIPIT_API_URL).toBe('https://api.custom.shipit.cl/v4')
  })

  it('debe usar token desde variable de entorno', () => {
    process.env.SHIPIT_API_TOKEN = 'test_token_123'
    jest.resetModules()
    const { SHIPIT_API_TOKEN } = require('../config')
    expect(SHIPIT_API_TOKEN).toBe('test_token_123')
  })

  it('debe usar email desde variable de entorno', () => {
    process.env.SHIPIT_API_EMAIL = 'test@shipit.cl'
    jest.resetModules()
    const { SHIPIT_API_EMAIL } = require('../config')
    expect(SHIPIT_API_EMAIL).toBe('test@shipit.cl')
  })

  it('debe construir URLs correctamente', () => {
    process.env.SHIPIT_API_URL = 'https://api.shipit.cl/v4'
    jest.resetModules()
    const { getShipitUrl } = require('../config')
    
    expect(getShipitUrl('shipments')).toBe('https://api.shipit.cl/v4/shipments')
    expect(getShipitUrl('/shipments')).toBe('https://api.shipit.cl/v4/shipments')
    expect(getShipitUrl('shipments/123')).toBe('https://api.shipit.cl/v4/shipments/123')
  })
})
