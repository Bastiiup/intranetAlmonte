import { exportarMaterialesAExcel, exportarListaUtilesAExcel } from '../excel'

// Mock de xlsx
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({ '!cols': [] })),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}))

// Mock de window
const mockWindow = {
  location: {},
}

describe('excel helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.window = mockWindow as any
    global.alert = jest.fn()
    global.console = {
      ...console,
      error: jest.fn(),
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('exportarMaterialesAExcel', () => {
    const mockMateriales = [
      {
        material_nombre: 'Lápiz',
        tipo: 'util' as const,
        cantidad: 2,
        obligatorio: true,
        descripcion: 'Lápiz grafito',
      },
      {
        material_nombre: 'Cuaderno',
        tipo: 'cuaderno' as const,
        cantidad: 1,
        obligatorio: true,
      },
    ]

    it('debe retornar sin hacer nada cuando window no está definido', async () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      await exportarMaterialesAExcel(mockMateriales)
      
      const XLSX = await import('xlsx')
      expect(XLSX.utils.book_new).not.toHaveBeenCalled()

      global.window = originalWindow
    })

    it('debe exportar materiales a Excel correctamente', async () => {
      const XLSX = await import('xlsx')
      
      await exportarMaterialesAExcel(mockMateriales, 'test-materiales')

      expect(XLSX.utils.book_new).toHaveBeenCalled()
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled()
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled()
      expect(XLSX.writeFile).toHaveBeenCalled()
    })

    it('debe mapear correctamente los tipos de materiales', async () => {
      const XLSX = await import('xlsx')
      const materiales = [
        { material_nombre: 'Util', tipo: 'util' as const, cantidad: 1, obligatorio: true },
        { material_nombre: 'Libro', tipo: 'libro' as const, cantidad: 1, obligatorio: true },
        { material_nombre: 'Cuaderno', tipo: 'cuaderno' as const, cantidad: 1, obligatorio: true },
        { material_nombre: 'Otro', tipo: 'otro' as const, cantidad: 1, obligatorio: true },
      ]

      await exportarMaterialesAExcel(materiales)

      const callArgs = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0]
      expect(callArgs[0].Tipo).toBe('Útil Escolar')
      expect(callArgs[1].Tipo).toBe('Libro')
      expect(callArgs[2].Tipo).toBe('Cuaderno')
      expect(callArgs[3].Tipo).toBe('Otro')
    })

    it('debe mapear correctamente obligatorio a Sí/No', async () => {
      const XLSX = await import('xlsx')
      const materiales = [
        { material_nombre: 'Obligatorio', tipo: 'util' as const, cantidad: 1, obligatorio: true },
        { material_nombre: 'Opcional', tipo: 'util' as const, cantidad: 1, obligatorio: false },
      ]

      await exportarMaterialesAExcel(materiales)

      const callArgs = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0]
      expect(callArgs[0].Obligatorio).toBe('Sí')
      expect(callArgs[1].Obligatorio).toBe('No')
    })

    it('debe incluir descripción vacía cuando no se proporciona', async () => {
      const XLSX = await import('xlsx')
      const materiales = [
        { material_nombre: 'Sin desc', tipo: 'util' as const, cantidad: 1, obligatorio: true },
      ]

      await exportarMaterialesAExcel(materiales)

      const callArgs = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0]
      expect(callArgs[0].Descripcion).toBe('')
    })

    it('debe usar nombre de archivo por defecto', async () => {
      const XLSX = await import('xlsx')
      
      await exportarMaterialesAExcel(mockMateriales)

      expect(XLSX.writeFile).toHaveBeenCalled()
      const fileName = (XLSX.writeFile as jest.Mock).mock.calls[0][1]
      expect(fileName).toContain('materiales_')
      expect(fileName).toContain('.xlsx')
    })

    it('debe manejar errores correctamente', async () => {
      const XLSX = await import('xlsx')
      ;(XLSX.utils.book_new as jest.Mock).mockImplementation(() => {
        throw new Error('xlsx error')
      })

      await exportarMaterialesAExcel(mockMateriales)

      expect(global.console.error).toHaveBeenCalled()
      expect(global.alert).toHaveBeenCalled()
    })

    it('debe mostrar mensaje específico cuando xlsx no está disponible', async () => {
      const XLSX = await import('xlsx')
      // Simular error al importar xlsx
      const originalBookNew = XLSX.utils.book_new
      ;(XLSX.utils.book_new as jest.Mock).mockImplementation(() => {
        throw new Error('Cannot find module xlsx')
      })

      await exportarMaterialesAExcel(mockMateriales)

      expect(global.console.error).toHaveBeenCalled()
      expect(global.alert).toHaveBeenCalled()
      
      // Restaurar
      XLSX.utils.book_new = originalBookNew
    })
  })

  describe('exportarListaUtilesAExcel', () => {
    const mockListaUtiles = {
      nombre: 'Lista 1° Básico',
      nivel: 'Básico',
      grado: 1,
      materiales: [
        {
          material_nombre: 'Lápiz',
          tipo: 'util' as const,
          cantidad: 2,
          obligatorio: true,
        },
      ],
    }

    it('debe exportar lista de útiles con nombre completo', async () => {
      const XLSX = await import('xlsx')
      
      await exportarListaUtilesAExcel(mockListaUtiles)

      expect(XLSX.utils.book_new).toHaveBeenCalled()
    })

    it('debe usar nombre personalizado cuando se proporciona', async () => {
      const XLSX = await import('xlsx')
      
      await exportarListaUtilesAExcel(mockListaUtiles, 'lista-personalizada')

      expect(XLSX.writeFile).toHaveBeenCalled()
      const fileName = (XLSX.writeFile as jest.Mock).mock.calls[0][1]
      expect(fileName).toContain('lista-personalizada_')
    })

    it('debe construir nombre con nivel y grado cuando están disponibles', async () => {
      const XLSX = await import('xlsx')
      
      await exportarListaUtilesAExcel(mockListaUtiles)

      expect(XLSX.writeFile).toHaveBeenCalled()
      const fileName = (XLSX.writeFile as jest.Mock).mock.calls[0][1]
      expect(fileName).toContain('Lista 1° Básico_1°_Básico')
    })

    it('debe usar solo nombre cuando no hay nivel ni grado', async () => {
      const XLSX = await import('xlsx')
      const listaSinNivel = {
        nombre: 'Lista Simple',
        materiales: [
          {
            material_nombre: 'Lápiz',
            tipo: 'util' as const,
            cantidad: 1,
            obligatorio: true,
          },
        ],
      }

      await exportarListaUtilesAExcel(listaSinNivel)

      expect(XLSX.writeFile).toHaveBeenCalled()
      const fileName = (XLSX.writeFile as jest.Mock).mock.calls[0][1]
      expect(fileName).toContain('Lista Simple_')
    })

    it('debe usar nombre por defecto cuando no se proporciona', async () => {
      const XLSX = await import('xlsx')
      const listaSinNombre = {
        materiales: [
          {
            material_nombre: 'Lápiz',
            tipo: 'util' as const,
            cantidad: 1,
            obligatorio: true,
          },
        ],
      }

      await exportarListaUtilesAExcel(listaSinNombre as any)

      expect(XLSX.writeFile).toHaveBeenCalled()
      const fileName = (XLSX.writeFile as jest.Mock).mock.calls[0][1]
      expect(fileName).toContain('lista_utiles_')
    })
  })
})

