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
    let totalCredito = 0;
    let totalDisponible = 0;
    let totalAhorro = 0;
    let totalApalancado = 0;
    let totalMsi = 0;

    tarjetas.forEach(t => {
        totalCredito += t.credito || 0;
        totalDisponible += t.disponible || 0;
        totalAhorro += t.tener || 0;
        totalApalancado += t.apalancamiento || 0;
        totalMsi += t.msi || 0;
    });

    const totalUsado = totalCredito - totalDisponible;
    const utilizacionGlobal = totalCredito > 0 ? (totalUsado / totalCredito) * 100 : 0;

    document.getElementById('total-deuda-header').innerText = formatCurrency(totalUsado);
    document.getElementById('total-ahorro').innerText = formatCurrency(totalAhorro);
    document.getElementById('total-apalancado-grid').innerText = formatCurrency(totalApalancado);
    
    const msiElement = document.getElementById('total-msi-grid');
    if(msiElement) {
        msiElement.innerText = formatCurrency(totalMsi);
    }

    document.getElementById('total-disponible').innerText = formatCurrency(totalDisponible);
    document.getElementById('total-utilizacion').innerText = `${utilizacionGlobal.toFixed(1)}%`;

    const barGeneral = document.getElementById('bar-general');
    if (totalCredito > 0 && barGeneral) {
        const pctAhorro = (totalAhorro / totalCredito) * 100;
        const pctApalancado = (totalApalancado / totalCredito) * 100;
        const pctMsi = (totalMsi / totalCredito) * 100;
        const pctDisponible = (totalDisponible / totalCredito) * 100;

        barGeneral.innerHTML = `
            <div style="width: ${pctAhorro}%; height: 100%; background-color: var(--color-ahorro);" title="Ahorro: ${formatCurrency(totalAhorro)}"></div>
            <div style="width: ${pctApalancado}%; height: 100%; background-color: var(--color-apalancado);" title="Apalancamiento: ${formatCurrency(totalApalancado)}"></div>
            <div style="width: ${pctMsi}%; height: 100%; background-color: var(--color-msi, #8b5cf6);" title="MSI: ${formatCurrency(totalMsi)}"></div>
            <div style="width: ${pctDisponible}%; height: 100%; background-color: var(--color-disponible);" title="Disponible: ${formatCurrency(totalDisponible)}"></div>
        `;
        barGeneral.style.display = 'flex';
        barGeneral.style.height = '12px';
        barGeneral.style.borderRadius = '6px';
        barGeneral.style.overflow = 'hidden';
    }

    const contenedor = document.getElementById('tarjetas-container');
    contenedor.innerHTML = '';

    tarjetas.forEach(t => {
        const card = document.createElement('div');
        card.className = 'tarjeta-card';
        card.style.borderTop = `4px solid ${t.color}`;
        card.style.padding = '20px';
        card.style.backgroundColor = '#fff';
        card.style.borderRadius = '12px';
        card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '15px';

        // Valores Generales
        const msiVal = t.msi || 0;
        const pctApalancamiento = t.credito > 0 ? (t.apalancamiento / t.credito) * 100 : 0;
        const pctMsi = t.credito > 0 ? (msiVal / t.credito) * 100 : 0;
        const pctDisponible = t.credito > 0 ? (t.disponible / t.credito) * 100 : 0;

        // Valores de ahorro requeridos separados
        const tenerCorriente = Number(t.tenerCorriente) || 0;
        const tenerAPago = Number(t.tenerAPago) || 0;
        const totalAhorroEnSemana = tenerCorriente + tenerAPago;

        // Porcentajes para la barra de Distribución (divididos sobre el total del Crédito)
        const pctTenerAPagoCredito = t.credito > 0 ? (tenerAPago / t.credito) * 100 : 0;
        const pctTenerCorrienteCredito = t.credito > 0 ? (tenerCorriente / t.credito) * 100 : 0;

        // Texto dinámico inteligente
        let textoProgreso = '';
        if (tenerAPago > 0 && tenerCorriente > 0) {
            textoProgreso = `Semana Pago <span style="color: #f59e0b;">(${formatCurrency(tenerAPago)})</span> 4 / 4 </br> <span style="margin: 0 4px; color: #cbd5e1;"> </br> </span> Corriente <span style="color: #3b82f6;">(${formatCurrency(tenerCorriente)})</span> ${t.semanaCorriente} / 3`;
        } else if (tenerAPago > 0) {
            textoProgreso = `Semana Pago <span style="color: #f59e0b;">(${formatCurrency(tenerAPago)})</span> ${Math.min(t.semanaAPago, 4)} / 4`;
        } else if (tenerCorriente > 0) {
            textoProgreso = `</br> Corriente <span style="color: #3b82f6;">(${formatCurrency(tenerCorriente)})</span> ${t.semanaCorriente} / 3`;
        }

        card.innerHTML = `
            <div>
                <div class="tarjeta-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <h3 style="margin: 0; font-size: 1.2rem;">${t.nombre}</h3>
                    <span style="background-color: ${t.color}20; color: ${t.color}; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
                        ${t.usoPorcentaje}% uso
                    </span>
                </div>
                <div style="font-size: 0.95rem; color: #444; font-weight: 600;">
                    Crédito: ${formatCurrency(t.credito)}
                </div>
            </div>
            
            <div class="tarjeta-meta" style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #666; margin-bottom: 5px;">
                <span>Fecha a Pago: <strong>${t.fechaAPago}</strong></span>
                <span style="color: var(--color-ahorro);">Saldo a Pago: <strong>${formatCurrency(t.saldoAPago)}</strong></span>
            </div>

            <div>
                <div style="margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-align: left;">
                        Distribución de Crédito
                    </span>
                    
                    <span style="display: ${totalAhorroEnSemana > 0 ? 'block' : 'none'}; font-size: 0.75rem; font-weight: 600; text-align: left; color: #64748b;">
                        ${textoProgreso}
                    </span>
                </div>
                <div style="display: flex; height: 8px; width: 100%; border-radius: 4px; overflow: hidden; background-color: #e2e8f0;">
                    <div style="width: ${pctTenerAPagoCredito}%; background-color: #f59e0b; transition: width 0.5s;" title="Semana a Pago: ${formatCurrency(tenerAPago)}"></div>
                    <div style="width: ${pctTenerCorrienteCredito}%; background-color: #3b82f6; transition: width 0.5s;" title="Corriente: ${formatCurrency(tenerCorriente)}"></div>
                    
                    <div style="width: ${pctApalancamiento}%; background-color: var(--color-apalancado);" title="Apalancado: ${formatCurrency(t.apalancamiento)}"></div>
                    <div style="width: ${pctMsi}%; background-color: var(--color-msi, #8b5cf6);" title="MSI: ${formatCurrency(msiVal)}"></div>
                    <div style="width: ${pctDisponible}%; background-color: var(--color-disponible);" title="Disponible: ${formatCurrency(t.disponible)}"></div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem; padding-top: 10px; border-top: 1px dashed #e2e8f0;">
                <div style="display: flex; flex-direction: column;">
                    <span style="color: #666; font-size: 0.75rem;">Ahorro (Tener)</span>
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

function formatCurrency(value) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(value);
}