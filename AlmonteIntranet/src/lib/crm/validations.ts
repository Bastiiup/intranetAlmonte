/**
 * Schemas de validación Zod para el módulo CRM
 */

import { z } from 'zod'

// Schema para Material (con preprocess para aplicar defaults)
export const MaterialSchema = z.preprocess(
  (data: any) => ({
    material_nombre: data.material_nombre,
    tipo: data.tipo ?? 'util',
    cantidad: data.cantidad ?? 1,
    obligatorio: data.obligatorio ?? true,
    descripcion: data.descripcion ?? null,
  }),
  z.object({
    material_nombre: z.string().min(1, 'El nombre del material es obligatorio'),
    tipo: z.enum(['util', 'libro', 'cuaderno', 'otro']),
    cantidad: z.number().int().positive(),
    obligatorio: z.boolean(),
    descripcion: z.string().nullable(),
  })
)

// Schema para actualizar curso
export const UpdateCursoSchema = z.object({
  nombre_curso: z.string().min(1, 'El nombre del curso no puede estar vacío').optional(),
  nivel: z.enum(['Basica', 'Media']).optional(),
  grado: z.string().regex(/^[1-8]$/, 'El grado debe ser entre 1 y 8').optional(),
  paralelo: z.string().nullable().optional(),
  activo: z.boolean().optional(),
  lista_utiles: z.union([z.number(), z.string(), z.null()]).optional(),
  materiales: z.array(MaterialSchema).optional(),
})

// Schema para crear curso
export const CreateCursoSchema = z.preprocess(
  (data: any) => ({
    ...data,
    // Asegurar que materiales siempre tengan los campos requeridos
    materiales: data.materiales?.map((m: any) => ({
      material_nombre: m.material_nombre,
      tipo: m.tipo ?? 'util',
      cantidad: m.cantidad ?? 1,
      obligatorio: m.obligatorio ?? true,
      descripcion: m.descripcion ?? null,
    })),
  }),
  z.object({
    nombre_curso: z.string().min(1, 'El nombre del curso es obligatorio'),
    nivel: z.enum(['Basica', 'Media']),
    grado: z.string().regex(/^[1-8]$/, 'El grado debe ser entre 1 y 8'),
    paralelo: z.string().nullable().optional(),
    activo: z.boolean(), // Requerido (el endpoint asigna default antes de validar)
    lista_utiles: z.union([z.number(), z.string(), z.null()]).optional(),
    materiales: z.array(MaterialSchema).optional(),
    colegio: z.union([z.number(), z.string()]),
  })
)

// Tipos inferidos de los schemas
export type UpdateCursoInput = z.infer<typeof UpdateCursoSchema>
export type CreateCursoInput = z.infer<typeof CreateCursoSchema>

/**
 * Valida datos con un schema Zod y retorna error formateado si falla
 */
export function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true
  data: T
} | {
  success: false
  errors: z.ZodError
} {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  return { success: false, errors: result.error }
}

