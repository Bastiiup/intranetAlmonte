/**
 * Schemas de validación Zod para el módulo CRM
 */

import { z } from 'zod'

// Schema para Material
export const MaterialSchema = z.object({
  material_nombre: z.string().min(1, 'El nombre del material es obligatorio'),
  tipo: z.enum(['util', 'libro', 'cuaderno', 'otro']).default('util'),
  cantidad: z.number().int().positive().default(1),
  obligatorio: z.boolean().default(true),
  descripcion: z.string().optional().nullable(),
})

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
export const CreateCursoSchema = z.object({
  nombre_curso: z.string().min(1, 'El nombre del curso es obligatorio'),
  nivel: z.enum(['Basica', 'Media']),
  grado: z.string().regex(/^[1-8]$/, 'El grado debe ser entre 1 y 8'),
  paralelo: z.string().nullable().optional(),
  activo: z.boolean().default(true), // Default true, pero el tipo sigue siendo opcional
  lista_utiles: z.union([z.number(), z.string(), z.null()]).optional(),
  materiales: z.array(MaterialSchema).optional(),
  colegio: z.union([z.number(), z.string()]),
}).transform(data => ({
  ...data,
  activo: data.activo ?? true, // Garantizar que siempre sea boolean después del parse
})) as z.ZodType<{
  nombre_curso: string
  nivel: 'Basica' | 'Media'
  grado: string
  paralelo?: string | null
  activo: boolean // Tipo explícito requerido
  lista_utiles?: number | string | null
  materiales?: Array<{
    material_nombre: string
    tipo: 'util' | 'libro' | 'cuaderno' | 'otro'
    cantidad: number
    obligatorio: boolean
    descripcion?: string | null
  }>
  colegio: number | string
}>

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

