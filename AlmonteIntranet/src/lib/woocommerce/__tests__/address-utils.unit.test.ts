/**
 * Pruebas unitarias para address-utils.ts
 */

import {
  buildWooCommerceAddress,
  parseWooCommerceAddress,
  createAddressMetaData,
  type DetailedAddress,
} from '../address-utils'

describe('address-utils', () => {
  describe('buildWooCommerceAddress', () => {
    it('debe construir address_1 y address_2 desde campos detallados', () => {
      const detailed: DetailedAddress = {
        calle: 'Av. Providencia',
        numero: '123',
        dpto: '101',
        block: 'A',
        condominio: 'Los Rosales',
        city: 'Santiago',
        state: 'Región Metropolitana',
        postcode: '7500000',
        country: 'CL',
      }

      const result = buildWooCommerceAddress(detailed)

      expect(result.address_1).toBe('Av. Providencia 123')
      expect(result.address_2).toBe('Dpto 101, Block A, Los Rosales')
    })

    it('debe manejar solo calle y número', () => {
      const detailed: DetailedAddress = {
        calle: 'Calle Principal',
        numero: '456',
      }

      const result = buildWooCommerceAddress(detailed)

      expect(result.address_1).toBe('Calle Principal 456')
      expect(result.address_2).toBe('')
    })

    it('debe manejar solo condominio sin dpto ni block', () => {
      const detailed: DetailedAddress = {
        calle: 'Av. Las Condes',
        numero: '789',
        condominio: 'Torre del Sol',
      }

      const result = buildWooCommerceAddress(detailed)

      expect(result.address_1).toBe('Av. Las Condes 789')
      expect(result.address_2).toBe('Torre del Sol')
    })

    it('debe usar address_1 y address_2 si no hay campos detallados', () => {
      const detailed: DetailedAddress = {
        address_1: 'Dirección completa',
        address_2: 'Información adicional',
      }

      const result = buildWooCommerceAddress(detailed)

      expect(result.address_1).toBe('Dirección completa')
      expect(result.address_2).toBe('Información adicional')
    })

    it('debe manejar campos vacíos', () => {
      const detailed: DetailedAddress = {}

      const result = buildWooCommerceAddress(detailed)

      expect(result.address_1).toBe('')
      expect(result.address_2).toBe('')
    })
  })

  describe('parseWooCommerceAddress', () => {
    it('debe parsear address_1 con calle y número', () => {
      const result = parseWooCommerceAddress('Av. Providencia 123', '')

      expect(result.calle).toBe('Av. Providencia')
      expect(result.numero).toBe('123')
    })

    it('debe parsear address_2 con dpto, block y condominio', () => {
      const result = parseWooCommerceAddress('', 'Dpto 101, Block A, Condominio Los Rosales')

      expect(result.dpto).toBe('101')
      expect(result.block).toBe('A')
      expect(result.condominio).toBe('Los Rosales')
    })

    it('debe parsear address_2 sin prefijos', () => {
      const result = parseWooCommerceAddress('', 'Los Rosales')

      expect(result.condominio).toBe('Los Rosales')
    })

    it('debe manejar address_1 sin número', () => {
      const result = parseWooCommerceAddress('Calle Principal', '')

      expect(result.calle).toBe('Calle Principal')
      expect(result.numero).toBeUndefined()
    })

    it('debe manejar strings vacíos', () => {
      const result = parseWooCommerceAddress('', '')

      expect(result.address_1).toBe('')
      expect(result.address_2).toBe('')
    })
  })

  describe('createAddressMetaData', () => {
    it('debe crear meta_data para billing con todos los campos', () => {
      const address: DetailedAddress = {
        calle: 'Av. Providencia',
        numero: '123',
        dpto: '101',
        block: 'A',
        condominio: 'Los Rosales',
      }

      const result = createAddressMetaData('billing', address)

      expect(result).toHaveLength(5)
      expect(result.find((m) => m.key === '_billing_calle')?.value).toBe('Av. Providencia')
      expect(result.find((m) => m.key === '_billing_numero')?.value).toBe('123')
      expect(result.find((m) => m.key === '_billing_dpto')?.value).toBe('101')
      expect(result.find((m) => m.key === '_billing_block')?.value).toBe('A')
      expect(result.find((m) => m.key === '_billing_condominio')?.value).toBe('Los Rosales')
    })

    it('debe crear meta_data para shipping', () => {
      const address: DetailedAddress = {
        calle: 'Calle Principal',
        numero: '456',
      }

      const result = createAddressMetaData('shipping', address)

      expect(result).toHaveLength(2)
      expect(result.find((m) => m.key === '_shipping_calle')?.value).toBe('Calle Principal')
      expect(result.find((m) => m.key === '_shipping_numero')?.value).toBe('456')
    })

    it('debe omitir campos vacíos', () => {
      const address: DetailedAddress = {
        calle: 'Calle Principal',
        // numero, dpto, block, condominio no están definidos
      }

      const result = createAddressMetaData('billing', address)

      expect(result).toHaveLength(1)
      expect(result[0].key).toBe('_billing_calle')
    })

    it('debe retornar array vacío si no hay campos', () => {
      const address: DetailedAddress = {}

      const result = createAddressMetaData('billing', address)

      expect(result).toHaveLength(0)
    })
  })
})




