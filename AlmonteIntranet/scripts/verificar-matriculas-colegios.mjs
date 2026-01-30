#!/usr/bin/env node

/**
 * Script para verificar matrículas de colegios directamente en Strapi
 * Fecha: 30 de enero de 2026
 * 
 * Verifica el campo 'matricula' en todos los cursos y calcula totales por colegio
 */

const STRAPI_URL = process.env.STRAPI_URL || 'https://strapi-pruebas-production.up.railway.app'
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN

if (!STRAPI_TOKEN) {
  console.error('❌ Error: STRAPI_API_TOKEN no está configurado')
  console.log('Configúralo con: $env:STRAPI_API_TOKEN="tu_token_aqui"')
  process.exit(1)
}

console.log('🔍 Verificando matrículas en Strapi...')
console.log(`📡 URL: ${STRAPI_URL}`)
console.log('')

/**
 * Obtener todos los cursos de un colegio
 */
async function obtenerCursosDeColeg(rbd) {
  const cursos = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    try {
      const url = `${STRAPI_URL}/api/cursos?` +
        `filters[colegio][rbd][$eq]=${rbd}&` +
        `fields[0]=nombre_curso&` +
        `fields[1]=grado&` +
        `fields[2]=nivel&` +
        `fields[3]=anio&` +
        `fields[4]=matricula&` +
        `populate[colegio][fields][0]=colegio_nombre&` +
        `populate[colegio][fields][1]=rbd&` +
        `pagination[page]=${page}&` +
        `pagination[pageSize]=100`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${STRAPI_TOKEN}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      
      const { data, meta } = await response.json()
      
      if (!data || data.length === 0) {
        break
      }
      
      cursos.push(...data)
      
      if (page >= (meta.pagination?.pageCount || 1)) {
        hasMore = false
      } else {
        page++
      }
    } catch (error) {
      console.error(`❌ Error en página ${page}:`, error.message)
      hasMore = false
    }
  }
  
  return cursos
}

/**
 * Verificar matrícula de un colegio específico
 */
async function verificarMatriculaColegio(rbd, nombreColegio) {
  console.log(`\n📊 ${nombreColegio} (RBD: ${rbd})`)
  console.log('─'.repeat(60))
  
  const cursos = await obtenerCursosDeColeg(rbd)
  
  if (cursos.length === 0) {
    console.log('⚠️  No se encontraron cursos para este colegio')
    return {
      rbd,
      nombre: nombreColegio,
      totalCursos: 0,
      cursosConMatricula: 0,
      totalMatriculados: 0,
      cursos: []
    }
  }
  
  let totalMatriculados = 0
  let cursosConMatricula = 0
  const detalleCursos = []
  
  cursos.forEach(curso => {
    const attrs = curso.attributes
    const matricula = attrs.matricula || 0
    
    if (matricula > 0) {
      cursosConMatricula++
      detalleCursos.push({
        id: curso.id,
        nombre: attrs.nombre_curso,
        grado: attrs.grado,
        nivel: attrs.nivel,
        anio: attrs.anio,
        matricula: matricula
      })
    }
    
    totalMatriculados += Number(matricula)
  })
  
  console.log(`Total de cursos: ${cursos.length}`)
  console.log(`Cursos con matrícula > 0: ${cursosConMatricula}`)
  console.log(`Cursos sin matrícula: ${cursos.length - cursosConMatricula}`)
  console.log(`\n✨ Total matriculados: ${totalMatriculados} estudiantes`)
  
  if (cursosConMatricula > 0) {
    console.log(`\n📝 Detalle de cursos con matrícula:`)
    detalleCursos
      .sort((a, b) => Number(a.grado) - Number(b.grado))
      .forEach(c => {
        console.log(`   - ${c.nombre} (${c.anio}): ${c.matricula} estudiantes`)
      })
  }
  
  return {
    rbd,
    nombre: nombreColegio,
    totalCursos: cursos.length,
    cursosConMatricula,
    totalMatriculados,
    porcentaje: ((cursosConMatricula / cursos.length) * 100).toFixed(1),
    cursos: detalleCursos
  }
}

/**
 * Función principal
 */
async function main() {
  const colegios = [
    { rbd: 10611, nombre: 'American Academy' },
    { rbd: 10479, nombre: 'Colegio Estela Segura' },
    { rbd: 10350, nombre: 'Colegio Elena Bettini Independencia' },
    { rbd: 5654343, nombre: 'colegio1' },
    { rbd: 12605, nombre: 'Academia Hospicio' },
    { rbd: 12345, nombre: 'Colegio Ejemplo 1' },
  ]
  
  const resultados = []
  
  for (const colegio of colegios) {
    const resultado = await verificarMatriculaColegio(colegio.rbd, colegio.nombre)
    resultados.push(resultado)
  }
  
  // Resumen final
  console.log('\n')
  console.log('═'.repeat(60))
  console.log('📊 RESUMEN GENERAL')
  console.log('═'.repeat(60))
  console.log('')
  console.log('Colegio'.padEnd(35), 'RBD'.padEnd(10), 'Matriculados')
  console.log('─'.repeat(60))
  
  resultados.forEach(r => {
    const nombre = r.nombre.substring(0, 33).padEnd(35)
    const rbd = String(r.rbd).padEnd(10)
    const matriculados = `${r.totalMatriculados} estudiantes`
    console.log(nombre, rbd, matriculados)
  })
  
  console.log('─'.repeat(60))
  
  const totalEstudiantes = resultados.reduce((sum, r) => sum + r.totalMatriculados, 0)
  const totalCursos = resultados.reduce((sum, r) => sum + r.totalCursos, 0)
  const totalCursosConMatricula = resultados.reduce((sum, r) => sum + r.cursosConMatricula, 0)
  
  console.log('')
  console.log(`📚 Total de cursos analizados: ${totalCursos}`)
  console.log(`✅ Cursos con matrícula: ${totalCursosConMatricula} (${((totalCursosConMatricula/totalCursos)*100).toFixed(1)}%)`)
  console.log(`🎓 Total de estudiantes matriculados: ${totalEstudiantes}`)
  console.log('')
  
  // Guardar resultados en JSON
  const fs = await import('fs/promises')
  const outputPath = 'scripts/resultados-verificacion-matriculas.json'
  await fs.writeFile(
    outputPath,
    JSON.stringify({
      fecha: new Date().toISOString(),
      strapi_url: STRAPI_URL,
      resultados,
      totales: {
        totalCursos,
        totalCursosConMatricula,
        totalEstudiantes
      }
    }, null, 2)
  )
  
  console.log(`💾 Resultados guardados en: ${outputPath}`)
  console.log('')
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
