import { inter, publicSans, nunito, roboto, ibmPlexSans, poppins } from '../fonts'

// Mock de next/font/google
jest.mock('next/font/google', () => ({
  Inter: jest.fn((config) => ({
    variable: config.variable,
    className: 'inter',
    style: config.style,
  })),
  Public_Sans: jest.fn((config) => ({
    variable: config.variable,
    className: 'public-sans',
    style: config.style,
  })),
  Nunito: jest.fn((config) => ({
    variable: config.variable,
    className: 'nunito',
    style: config.style,
  })),
  Roboto: jest.fn((config) => ({
    variable: config.variable,
    className: 'roboto',
    style: config.style,
  })),
  IBM_Plex_Sans: jest.fn((config) => ({
    variable: config.variable,
    className: 'ibm-plex-sans',
    style: config.style,
  })),
  Poppins: jest.fn((config) => ({
    variable: config.variable,
    className: 'poppins',
    style: config.style,
  })),
}))

describe('fonts helpers', () => {
  describe('inter', () => {
    it('debe exportar la configuración de Inter', () => {
      expect(inter).toBeDefined()
      expect(inter.variable).toBe('--ins-font-sans-serif')
    })

    it('debe tener className definido', () => {
      expect(inter.className).toBeDefined()
    })
  })

  describe('publicSans', () => {
    it('debe exportar la configuración de Public Sans', () => {
      expect(publicSans).toBeDefined()
      expect(publicSans.variable).toBe('--font-public-sans')
    })

    it('debe tener className definido', () => {
      expect(publicSans.className).toBeDefined()
    })
  })

  describe('nunito', () => {
    it('debe exportar la configuración de Nunito', () => {
      expect(nunito).toBeDefined()
      expect(nunito.variable).toBe('--font-nunito')
    })

    it('debe tener className definido', () => {
      expect(nunito.className).toBeDefined()
    })
  })

  describe('roboto', () => {
    it('debe exportar la configuración de Roboto', () => {
      expect(roboto).toBeDefined()
      expect(roboto.variable).toBe('--ins-font-sans-serif')
    })

    it('debe tener className definido', () => {
      expect(roboto.className).toBeDefined()
    })
  })

  describe('ibmPlexSans', () => {
    it('debe exportar la configuración de IBM Plex Sans', () => {
      expect(ibmPlexSans).toBeDefined()
      expect(ibmPlexSans.variable).toBe('--ins-font-sans-serif')
    })

    it('debe tener className definido', () => {
      expect(ibmPlexSans.className).toBeDefined()
    })
  })

  describe('poppins', () => {
    it('debe exportar la configuración de Poppins', () => {
      expect(poppins).toBeDefined()
      expect(poppins.variable).toBe('--ins-font-sans-serif')
    })

    it('debe tener className definido', () => {
      expect(poppins.className).toBeDefined()
    })
  })

  describe('configuración de fuentes', () => {
    it('todas las fuentes deben tener variable definida', () => {
      expect(inter.variable).toBeTruthy()
      expect(publicSans.variable).toBeTruthy()
      expect(nunito.variable).toBeTruthy()
      expect(roboto.variable).toBeTruthy()
      expect(ibmPlexSans.variable).toBeTruthy()
      expect(poppins.variable).toBeTruthy()
    })

    it('todas las fuentes deben tener className definido', () => {
      expect(inter.className).toBeTruthy()
      expect(publicSans.className).toBeTruthy()
      expect(nunito.className).toBeTruthy()
      expect(roboto.className).toBeTruthy()
      expect(ibmPlexSans.className).toBeTruthy()
      expect(poppins.className).toBeTruthy()
    })
  })
})










