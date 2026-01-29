/**
 * Ruta de prueba para verificar variables de entorno
 * Visita: /api/test-env
 */

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    // Variables de Strapi
    hasStrapiToken: !!process.env.STRAPI_API_TOKEN,
    strapiTokenLength: process.env.STRAPI_API_TOKEN?.length || 0,
    strapiUrl: process.env.NEXT_PUBLIC_STRAPI_URL || 'https://strapi-pruebas-production.up.railway.app',
    
    // Variables de WooCommerce
    hasWooCommerceKey: !!process.env.WOOCOMMERCE_CONSUMER_KEY,
    wooCommerceKeyLength: process.env.WOOCOMMERCE_CONSUMER_KEY?.length || 0,
    hasWooCommerceSecret: !!process.env.WOOCOMMERCE_CONSUMER_SECRET,
    wooCommerceSecretLength: process.env.WOOCOMMERCE_CONSUMER_SECRET?.length || 0,
    wooCommerceUrl: process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || 'https://staging.escolar.cl',
    
    // Entorno
    nodeEnv: process.env.NODE_ENV,
    railwayEnv: process.env.RAILWAY_ENVIRONMENT,
    
    // Variables de Shipit
    hasShipitToken: !!process.env.SHIPIT_API_TOKEN,
    shipitTokenLength: process.env.SHIPIT_API_TOKEN?.length || 0,
    hasShipitEmail: !!process.env.SHIPIT_API_EMAIL,
    shipitUrl: process.env.SHIPIT_API_URL || 'https://api.shipit.cl/v4',
    
    // Variables de Gemini
    hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
    geminiApiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    geminiApiKeyPreview: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...` : 'No configurada',
    
    // Todas las variables que empiezan con STRAPI, WOOCOMMERCE, SHIPIT o GEMINI
    allStrapiVars: Object.keys(process.env).filter(key => key.includes('STRAPI')),
    allWooCommerceVars: Object.keys(process.env).filter(key => key.includes('WOOCOMMERCE')),
    allShipitVars: Object.keys(process.env).filter(key => key.includes('SHIPIT')),
    allGeminiVars: Object.keys(process.env).filter(key => key.includes('GEMINI')),
  }, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
}

