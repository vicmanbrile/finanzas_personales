document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
});

async function cargarDatos() {
    try {
        const response = await fetch('/api/tarjetas');
        if (!response.ok) throw new Error('Error al obtener los datos de la API');
        const tarjetas = await response.json();

        renderDashboard(tarjetas);
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('tarjetas-container').innerHTML = `
            <p style="color: var(--color-ahorro); text-align: center; grid-column: 1 / -1;">
                Ocurrió un error al cargar la información: ${error.message}
            </p>`;
    }
}

function renderDashboard(tarjetas) {
    // 1. Inicializar variables para los totales
    let totalCredito = 0;
    let totalDisponible = 0;
    let totalAhorro = 0;     // Corresponde a 'tener'
    let totalApalancado = 0; // Apalancamiento neto
    let totalMsi = 0;        // Meses sin intereses

    // 2. Sumar los valores de todas las tarjetas
    tarjetas.forEach(t => {
        totalCredito += t.credito || 0;
        totalDisponible += t.disponible || 0;
        totalAhorro += t.tener || 0;
        totalApalancado += t.apalancamiento || 0;
        totalMsi += t.msi || 0; // Si la API aún no manda MSI en alguna tarjeta, asume 0
    });

    const totalUsado = totalCredito - totalDisponible;
    const utilizacionGlobal = totalCredito > 0 ? (totalUsado / totalCredito) * 100 : 0;

    // 3. Actualizar los textos del Resumen General en el HTML
    document.getElementById('total-deuda-header').innerText = formatCurrency(totalUsado);
    document.getElementById('total-ahorro').innerText = formatCurrency(totalAhorro);
    document.getElementById('total-apalancado-grid').innerText = formatCurrency(totalApalancado);
    
    // Verificamos que el elemento MSI exista (por si no has actualizado el HTML aún)
    const msiElement = document.getElementById('total-msi-grid');
    if(msiElement) {
        msiElement.innerText = formatCurrency(totalMsi);
    }

    document.getElementById('total-disponible').innerText = formatCurrency(totalDisponible);
    document.getElementById('total-utilizacion').innerText = `${utilizacionGlobal.toFixed(1)}%`;

    // 4. Renderizar la Barra General (dividida en 4 segmentos)
    const barGeneral = document.getElementById('bar-general');
    if (totalCredito > 0 && barGeneral) {
        const pctAhorro = (totalAhorro / totalCredito) * 100;
        const pctApalancado = (totalApalancado / totalCredito) * 100;
        const pctMsi = (totalMsi / totalCredito) * 100;
        const pctDisponible = (totalDisponible / totalCredito) * 100;

        // Le agregamos tooltips (title) nativos para que al pasar el mouse se vea el monto
        barGeneral.innerHTML = `
            <div style="width: ${pctAhorro}%; height: 100%; background-color: var(--color-ahorro);" title="Ahorro: ${formatCurrency(totalAhorro)}"></div>
            <div style="width: ${pctApalancado}%; height: 100%; background-color: var(--color-apalancado);" title="Apalancamiento: ${formatCurrency(totalApalancado)}"></div>
            <div style="width: ${pctMsi}%; height: 100%; background-color: var(--color-msi, #8b5cf6);" title="MSI: ${formatCurrency(totalMsi)}"></div>
            <div style="width: ${pctDisponible}%; height: 100%; background-color: var(--color-disponible);" title="Disponible: ${formatCurrency(totalDisponible)}"></div>
        `;
        // Aseguramos que el contenedor de la barra tenga flexbox
        barGeneral.style.display = 'flex';
        barGeneral.style.height = '12px'; // Ajusta la altura si lo necesitas
        barGeneral.style.borderRadius = '6px';
        barGeneral.style.overflow = 'hidden';
    }

    // 5. Renderizar cada Tarjeta
    const contenedor = document.getElementById('tarjetas-container');
    contenedor.innerHTML = ''; // Limpiamos "Cargando..." o contenido previo

    tarjetas.forEach(t => {
        const card = document.createElement('div');
        card.className = 'tarjeta-card';
        card.style.borderTop = `4px solid ${t.color}`;
        card.style.padding = '15px'; // Añade padding si no lo tienes en tu CSS
        card.style.backgroundColor = '#fff';
        card.style.borderRadius = '8px';
        card.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';

        // Calcular porcentajes de la tarjeta individual
        const msiVal = t.msi || 0;
        const pctTener = t.credito > 0 ? (t.tener / t.credito) * 100 : 0;
        const pctApalancamiento = t.credito > 0 ? (t.apalancamiento / t.credito) * 100 : 0;
        const pctMsi = t.credito > 0 ? (msiVal / t.credito) * 100 : 0;
        const pctDisponible = t.credito > 0 ? (t.disponible / t.credito) * 100 : 0;

        // Estructura de la tarjeta
        card.innerHTML = `
            <div class="tarjeta-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0;">${t.nombre}</h3>
                <span style="background-color: ${t.color}20; color: ${t.color}; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
                    ${t.usoPorcentaje}% uso
                </span>
            </div>
            
            <div class="tarjeta-meta" style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #666; margin-bottom: 15px;">
                <span>Pago: ${t.fechaPago}</span>
                <span>Semana: ${t.semanaActual}</span>
            </div>

            <div style="display: flex; height: 8px; width: 100%; border-radius: 4px; overflow: hidden; margin-bottom: 15px; background-color: #e2e8f0;">
                <div style="width: ${pctTener}%; background-color: var(--color-ahorro);"></div>
                <div style="width: ${pctApalancamiento}%; background-color: var(--color-apalancado);"></div>
                <div style="width: ${pctMsi}%; background-color: var(--color-msi, #8b5cf6);"></div>
                <div style="width: ${pctDisponible}%; background-color: var(--color-disponible);"></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
                <div style="display: flex; flex-direction: column;">
                    <span style="color: #666; font-size: 0.75rem;">Ahorro</span>
                    <span style="font-weight: bold; color: var(--color-ahorro);">${formatCurrency(t.tener)}</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span style="color: #666; font-size: 0.75rem;">Apalancado</span>
                    <span style="font-weight: bold; color: var(--color-apalancado);">${formatCurrency(t.apalancamiento)}</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span style="color: #666; font-size: 0.75rem;">MSI</span>
                    <span style="font-weight: bold; color: var(--color-msi, #8b5cf6);">${formatCurrency(msiVal)}</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                    <span style="color: #666; font-size: 0.75rem;">Disponible</span>
                    <span style="font-weight: bold; color: var(--color-disponible);">${formatCurrency(t.disponible)}</span>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// Función auxiliar para dar formato de moneda a los números
function formatCurrency(value) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
}