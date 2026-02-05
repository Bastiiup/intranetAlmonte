import {
  currency,
  currentYear,
  appName,
  appTitle,
  appDescription,
  author,
  authorWebsite,
  authorContact,
  basePath,
} from '../index'

describe('index helpers', () => {
  describe('currency', () => {
    it('debe exportar currency', () => {
      expect(currency).toBeDefined()
    })

    it('debe ser uno de los tipos válidos', () => {
      expect(['₹', '$', '€']).toContain(currency)
    })

    it('debe tener valor por defecto de $', () => {
      expect(currency).toBe('$')
    })
  })

  describe('currentYear', () => {
    it('debe exportar currentYear', () => {
      expect(currentYear).toBeDefined()
    })

    it('debe ser un número', () => {
      expect(typeof currentYear).toBe('number')
    })

    it('debe ser el año actual', () => {
      const expectedYear = new Date().getFullYear()
      expect(currentYear).toBe(expectedYear)
    })

    it('debe ser un año válido (mayor a 2020)', () => {
      expect(currentYear).toBeGreaterThan(2020)
    })

    it('debe ser un año válido (menor a 2100)', () => {
      expect(currentYear).toBeLessThan(2100)
    })
  })

  describe('appName', () => {
    it('debe exportar appName', () => {
      expect(appName).toBeDefined()
    })

    it('debe ser un string', () => {
      expect(typeof appName).toBe('string')
    })

    it('debe tener el valor correcto', () => {
      expect(appName).toBe('Intranet Almonte')
    })

    it('debe tener longitud mayor a 0', () => {
      expect(appName.length).toBeGreaterThan(0)
    })
  })

  describe('appTitle', () => {
    it('debe exportar appTitle', () => {
      expect(appTitle).toBeDefined()
    })

    it('debe ser un string', () => {
      expect(typeof appTitle).toBe('string')
    })

    it('debe tener el valor correcto', () => {
      expect(appTitle).toBe('Intranet Almonte')
    })

    it('debe ser igual a appName', () => {
      expect(appTitle).toBe(appName)
    })
  })

  describe('appDescription', () => {
    it('debe exportar appDescription', () => {
      expect(appDescription).toBeDefined()
    })

    it('debe ser un string', () => {
      expect(typeof appDescription).toBe('string')
    })

    it('debe tener el valor correcto', () => {
      expect(appDescription).toBe(
        'Intranet Almonte - Sistema de gestión interno para administración de productos, categorías, etiquetas y más.'
      )
    })

    it('debe contener el nombre de la aplicación', () => {
      expect(appDescription).toContain('Intranet Almonte')
    })

    it('debe tener longitud mayor a 50 caracteres', () => {
      expect(appDescription.length).toBeGreaterThan(50)
    })
  })

  describe('author', () => {
    it('debe exportar author', () => {
      expect(author).toBeDefined()
    })

    it('debe ser un string', () => {
      expect(typeof author).toBe('string')
    })

    it('debe tener el valor correcto', () => {
      expect(author).toBe('Coderthemes')
    })

    it('debe tener longitud mayor a 0', () => {
      expect(author.length).toBeGreaterThan(0)
    })
  })

  describe('authorWebsite', () => {
    it('debe exportar authorWebsite', () => {
      expect(authorWebsite).toBeDefined()
    })

    it('debe ser un string', () => {
      expect(typeof authorWebsite).toBe('string')
    })

    it('debe tener el valor correcto', () => {
      expect(authorWebsite).toBe('https://coderthemes.com/')
    })

    it('debe ser una URL válida', () => {
      expect(authorWebsite).toMatch(/^https?:\/\//)
    })
  })

  describe('authorContact', () => {
    it('debe exportar authorContact', () => {
      expect(authorContact).toBeDefined()
    })

    it('debe ser un string', () => {
      expect(typeof authorContact).toBe('string')
    })

    it('debe estar vacío por defecto', () => {
      expect(authorContact).toBe('')
    })
  })

  describe('basePath', () => {
    it('debe exportar basePath', () => {
      expect(basePath).toBeDefined()
    })

    it('debe ser un string', () => {
      expect(typeof basePath).toBe('string')
    })

    it('debe estar vacío por defecto', () => {
      expect(basePath).toBe('')
    })
  })

  describe('consistencia de datos', () => {
    it('appName y appTitle deben ser iguales', () => {
      expect(appName).toBe(appTitle)
    })

    it('appDescription debe contener appName', () => {
      expect(appDescription).toContain(appName)
    })

    it('todas las constantes de string deben estar definidas', () => {
      expect(appName).toBeTruthy()
      expect(appTitle).toBeTruthy()
      expect(appDescription).toBeTruthy()
      expect(author).toBeTruthy()
      expect(authorWebsite).toBeTruthy()
    })

    it('currentYear debe ser un número válido', () => {
      expect(Number.isInteger(currentYear)).toBe(true)
      expect(currentYear).toBeGreaterThan(2000)
      expect(currentYear).toBeLessThan(3000)
    })
  })
})










