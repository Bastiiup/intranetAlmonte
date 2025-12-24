/**
 * Lifecycle hooks para wo-pedido (TypeScript version)
 * Este archivo debe ir en: src/api/wo-pedido/content-types/wo-pedido/lifecycles.ts
 * 
 * CORRECCIÓN: El hook afterUpdate ahora:
 * 1. Verifica si solo se actualizó el estado antes de sincronizar
 * 2. Maneja mejor los errores cuando los items no tienen product_id válido
 * 3. No falla la transacción si hay problemas con la sincronización
 */

import { Core } from '@strapi/strapi';

export default {
  async afterUpdate(event: any) {
    const { result, params } = event;
    
    try {
      // Verificar si solo se actualizó el estado
      // Si solo cambió el estado, no necesitamos sincronizar con WooCommerce
      const changedFields = Object.keys(params.data || {});
      const soloEstadoCambio = changedFields.length === 1 && changedFields[0] === 'estado';
      
      if (soloEstadoCambio) {
        console.log('[wo-pedido] ℹ️ Solo se actualizó el estado, omitiendo sincronización con WooCommerce');
        return;
      }

      // Obtener el pedido completo con items
      const pedido = await strapi.entityService.findOne('api::wo-pedido.wo-pedido', result.id, {
        populate: ['items', 'cliente'],
      });

      if (!pedido) {
        console.warn('[wo-pedido] ⚠️ No se encontró el pedido para sincronizar');
        return;
      }

      // Verificar si tiene originPlatform y wooId
      const originPlatform = (pedido as any).originPlatform || (pedido as any).origin_platform;
      const wooId = (pedido as any).wooId || ((pedido as any).externalIds?.wooCommerce?.id);

      // Si no tiene wooId o es "otros", no sincronizar
      if (!wooId || originPlatform === 'otros') {
        console.log('[wo-pedido] ℹ️ Pedido sin wooId o originPlatform="otros", omitiendo sincronización');
        return;
      }

      // Validar items antes de sincronizar
      const items = (pedido as any).items || [];
      const itemsValidos = items.filter((item: any) => {
        const tieneProductId = item.producto_id || item.product_id || item.libro_id;
        return tieneProductId;
      });

      if (items.length > 0 && itemsValidos.length === 0) {
        console.warn('[wo-pedido] ⚠️ El pedido tiene items pero ninguno tiene product_id válido. Omitiendo sincronización con WooCommerce.');
        console.warn('[wo-pedido] ⚠️ Detalles de items:', items.map((item: any) => ({
          id: item.id,
          nombre: item.nombre,
          producto_id: item.producto_id,
          product_id: item.product_id,
          libro_id: item.libro_id,
        })));
        // NO lanzar error, solo registrar warning
        return;
      }

      // Si llegamos aquí, intentar sincronizar
      console.log('[wo-pedido] 🔄 Iniciando sincronización con WooCommerce...');
      
      // Aquí iría la lógica de sincronización con WooCommerce
      // Por ejemplo, llamar a un servicio de sincronización
      
    } catch (error: any) {
      // IMPORTANTE: No lanzar el error para no fallar la transacción
      // Solo registrar el error y continuar
      console.error('[wo-pedido] ❌ Error en afterUpdate syncOrderFromWoPedido:', error.message);
      console.error('[wo-pedido] ❌ Stack:', error.stack);
      
      // NO hacer throw del error para evitar que falle la actualización del pedido
      // El pedido se actualiza correctamente en Strapi, solo falla la sincronización con WooCommerce
    }
  },
};





