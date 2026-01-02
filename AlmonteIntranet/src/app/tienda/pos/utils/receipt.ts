/**
 * Utilidades para generación de tickets/recibos
 */

export interface ReceiptData {
  orderId: number
  date: string
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
  subtotal: number
  discount: number
  tax: number
  total: number
  payment: {
    method: string
    amount: number
    change?: number
  }
  customer?: {
    name: string
    email?: string
  }
  cashier?: string
}

/**
 * Genera el HTML de un ticket/recibo
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const date = new Date(data.date).toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket #${data.orderId}</title>
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 10px;
          }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          max-width: 300px;
          margin: 0 auto;
          padding: 10px;
        }
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
        }
        .info {
          margin: 10px 0;
          font-size: 11px;
        }
        .items {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          padding: 10px 0;
          margin: 10px 0;
        }
        .item {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .item-name {
          flex: 1;
        }
        .item-qty {
          margin: 0 5px;
        }
        .item-price {
          text-align: right;
          min-width: 60px;
        }
        .totals {
          margin: 10px 0;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }
        .total-final {
          font-weight: bold;
          font-size: 14px;
          border-top: 2px solid #000;
          padding-top: 5px;
          margin-top: 5px;
        }
        .payment {
          margin: 10px 0;
          padding-top: 10px;
          border-top: 1px dashed #000;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px dashed #000;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INTRANET ALMONTE</h1>
        <p>Punto de Venta</p>
      </div>
      
      <div class="info">
        <div><strong>Ticket #${data.orderId}</strong></div>
        <div>Fecha: ${date}</div>
        ${data.customer ? `<div>Cliente: ${data.customer.name}</div>` : ''}
        ${data.cashier ? `<div>Cajero: ${data.cashier}</div>` : ''}
      </div>
      
      <div class="items">
        ${data.items.map(item => `
          <div class="item">
            <div class="item-name">${item.name}</div>
            <div class="item-qty">${item.quantity}x</div>
            <div class="item-price">$${item.total.toLocaleString('es-CL')}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>$${data.subtotal.toLocaleString('es-CL')}</span>
        </div>
        ${data.discount > 0 ? `
          <div class="total-row">
            <span>Descuento:</span>
            <span>-$${data.discount.toLocaleString('es-CL')}</span>
          </div>
        ` : ''}
        ${data.tax > 0 ? `
          <div class="total-row">
            <span>IVA:</span>
            <span>$${data.tax.toLocaleString('es-CL')}</span>
          </div>
        ` : ''}
        <div class="total-row total-final">
          <span>TOTAL:</span>
          <span>$${data.total.toLocaleString('es-CL')}</span>
        </div>
      </div>
      
      <div class="payment">
        <div class="total-row">
          <span>Pago (${data.payment.method}):</span>
          <span>$${data.payment.amount.toLocaleString('es-CL')}</span>
        </div>
        ${data.payment.change !== undefined && data.payment.change > 0 ? `
          <div class="total-row">
            <span>Cambio:</span>
            <span>$${data.payment.change.toLocaleString('es-CL')}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="footer">
        <p>¡Gracias por su compra!</p>
        <p>www.moraleja.cl</p>
      </div>
    </body>
    </html>
  `
}

/**
 * Imprime un ticket/recibo
 */
export function printReceipt(data: ReceiptData): void {
  const html = generateReceiptHTML(data)
  const printWindow = window.open('', '_blank')
  
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    
    // Esperar a que se cargue el contenido antes de imprimir
    setTimeout(() => {
      printWindow.print()
      // Cerrar la ventana después de imprimir (opcional)
      // printWindow.close()
    }, 250)
  }
}

