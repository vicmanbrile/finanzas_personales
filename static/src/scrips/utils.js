// utils.js

/**
 * Convierte un número en formato de moneda mexicana (MXN).
 * @param {number} value - El valor numérico a formatear.
 * @returns {string} - El texto con el formato de moneda (ej. "$ 1,500.00").
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
}