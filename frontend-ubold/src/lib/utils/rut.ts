/**
 * Utilidades para validación y formato de RUT chileno
 */

/**
 * Valida el dígito verificador del RUT chileno
 * @param rut - RUT en cualquier formato (12345678-9, 12.345.678-9, 123456789)
 * @returns { valid: boolean, formatted: string, error?: string }
 */
export function validarRUTChileno(rut: string): {
  valid: boolean
  formatted: string
  error?: string
} {
  // Limpiar el RUT: quitar puntos, guiones y espacios
  const rutLimpio = rut.replace(/[.-]/g, '').replace(/\s/g, '').trim()

  // Validar formato básico (debe tener al menos 7 dígitos + 1 dígito verificador)
  if (rutLimpio.length < 8 || rutLimpio.length > 9) {
    return {
      valid: false,
      formatted: rut,
      error: 'El RUT debe tener entre 8 y 9 caracteres (7-8 dígitos + 1 dígito verificador)',
    }
  }

  // Separar cuerpo (todo excepto el último carácter) y dígito verificador
  const cuerpo = rutLimpio.slice(0, -1)
  const dvIngresado = rutLimpio.slice(-1).toUpperCase()

  // Validar que el cuerpo sean solo dígitos
  if (!/^\d+$/.test(cuerpo)) {
    return {
      valid: false,
      formatted: rut,
      error: 'El cuerpo del RUT debe contener solo números',
    }
  }

  // Validar que el dígito verificador sea un dígito o 'K'
  if (!/^[0-9K]$/.test(dvIngresado)) {
    return {
      valid: false,
      formatted: rut,
      error: 'El dígito verificador debe ser un número o la letra K',
    }
  }

  // Calcular el dígito verificador correcto
  let suma = 0
  let multiplicador = 2

  // Multiplicar de derecha a izquierda
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  // Calcular el dígito verificador
  const resto = suma % 11
  let dvCalculado = 11 - resto

  // Casos especiales
  if (dvCalculado === 11) {
    dvCalculado = 0
  } else if (dvCalculado === 10) {
    dvCalculado = 'K'
  }

  // Comparar dígito ingresado con el calculado
  const dvEsValido = dvCalculado.toString().toUpperCase() === dvIngresado

  // Formatear el RUT (cuerpo con guión y dígito verificador)
  const rutFormateado = `${cuerpo}-${dvIngresado}`

  if (!dvEsValido) {
    return {
      valid: false,
      formatted: rutFormateado,
      error: `El dígito verificador es incorrecto. Debería ser ${dvCalculado}`,
    }
  }

  return {
    valid: true,
    formatted: rutFormateado,
  }
}

/**
 * Formatea un RUT a formato estándar (12345678-9)
 * No valida el dígito verificador, solo formatea
 * @param rut - RUT en cualquier formato
 * @returns RUT formateado
 */
export function formatearRUT(rut: string): string {
  const rutLimpio = rut.replace(/[.-]/g, '').replace(/\s/g, '').trim()

  if (rutLimpio.length < 2) {
    return rut
  }

  const cuerpo = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1).toUpperCase()

  return `${cuerpo}-${dv}`
}

/**
 * Limpia un RUT (solo números y K)
 * @param rut - RUT en cualquier formato
 * @returns RUT limpio (solo dígitos y K)
 */
export function limpiarRUT(rut: string): string {
  return rut.replace(/[.-]/g, '').replace(/\s/g, '').trim().toUpperCase()
}

