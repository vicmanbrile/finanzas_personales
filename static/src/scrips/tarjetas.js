document.addEventListener('DOMContentLoaded', () => {
    cargarTarjetas();
});

async function cargarTarjetas() {
    try {
        const response = await fetch('/api/tarjetas');
        
        if (!response.ok) {
            throw new Error('Error al obtener los datos de las tarjetas');
        }
        
        const tarjetas = await response.json(); 
        renderTarjetas(tarjetas);
    } catch (error) {
        console.error("Error en tarjetas:", error);
        document.getElementById('tarjetas-container').innerHTML = `
            <p style="color: var(--color-ahorro); text-align: center; grid-column: 1 / -1;">
                Ocurrió un error al cargar la información: ${error.message}
            </p>`;
    }
}

function renderTarjetas(tarjetas) {
    const contenedor = document.getElementById('tarjetas-container');
    contenedor.innerHTML = '';

    tarjetas.forEach(t => {
        const card = document.createElement('div');
        card.className = 'tarjeta-card';
        // Mantenemos el color del borde superior dinámico
        card.style.borderTop = `4px solid ${t.color}`;

        const msiVal = t.msi || 0;
        const tenerCorriente = Number(t.tenerCorriente) || 0;
        const tenerAPago = Number(t.tenerAPago) || 0;
        const totalAhorroEnSemana = tenerCorriente + tenerAPago;

        let textoProgreso = '';
        if (tenerAPago > 0 && tenerCorriente > 0) {
            textoProgreso = `Semana Pago <span class="text-pago">(${formatCurrency(tenerAPago)})</span> 4 / 4 </br> <span class="text-separador"> </br> </span> Corriente <span class="text-corriente">(${formatCurrency(tenerCorriente)})</span> ${t.semanaCorriente} / 3`;
        } else if (tenerAPago > 0) {
            textoProgreso = `Semana Pago <span class="text-pago">(${formatCurrency(tenerAPago)})</span> ${Math.min(t.semanaAPago, 4)} / 4`;
        } else if (tenerCorriente > 0) {
            textoProgreso = `</br> Corriente <span class="text-corriente">(${formatCurrency(tenerCorriente)})</span> ${t.semanaCorriente} / 3`;
        }

        card.innerHTML = `
            <div>
                <div class="tarjeta-header">
                    <h3>${t.nombre}</h3>
                    <span class="tarjeta-uso-badge" style="background-color: ${t.color}20; color: ${t.color};">
                        ${t.usoPorcentaje}% uso
                    </span>
                </div>
                <div class="tarjeta-credito">
                    Crédito: ${formatCurrency(t.credito)}
                </div>
            </div>
            
            <div class="tarjeta-meta">
                <span>Fecha a Pago: <strong>${t.fechaAPago}</strong></span>
                <span class="tarjeta-saldo-pago">Saldo a Pago: <strong>${formatCurrency(t.saldoAPago)}</strong></span>
            </div>

            <div>
                <div class="tarjeta-dist-header">
                    <span class="tarjeta-dist-title">Distribución de Crédito</span>
                    <span class="tarjeta-dist-texto" style="display: ${totalAhorroEnSemana > 0 ? 'block' : 'none'};">
                        ${textoProgreso}
                    </span>
                </div>
                <div class="tarjeta-barra-progreso">
                    <div class="tarjeta-barra-segmento bg-pago" style="width: ${t.credito > 0 ? (tenerAPago / t.credito) * 100 : 0}%;" title="Semana a Pago: ${formatCurrency(tenerAPago)}"></div>
                    <div class="tarjeta-barra-segmento bg-corriente" style="width: ${t.credito > 0 ? (tenerCorriente / t.credito) * 100 : 0}%;" title="Corriente: ${formatCurrency(tenerCorriente)}"></div>
                    <div class="tarjeta-barra-segmento bg-apalancado" style="width: ${t.credito > 0 ? (t.apalancamiento / t.credito) * 100 : 0}%;" title="Apalancado: ${formatCurrency(t.apalancamiento)}"></div>
                    <div class="tarjeta-barra-segmento bg-msi" style="width: ${t.credito > 0 ? (msiVal / t.credito) * 100 : 0}%;" title="MSI: ${formatCurrency(msiVal)}"></div>
                    <div class="tarjeta-barra-segmento bg-disponible" style="width: ${t.credito > 0 ? (t.disponible / t.credito) * 100 : 0}%;" title="Disponible: ${formatCurrency(t.disponible)}"></div>
                </div>
            </div>

            <div class="tarjeta-grid-totales">
                <div class="tarjeta-grid-item">
                    <span class="tarjeta-grid-label">Ahorro (Tener)</span>
                    <span class="tarjeta-grid-value val-ahorro">${formatCurrency(t.tener)}</span>
                </div>
                <div class="tarjeta-grid-item">
                    <span class="tarjeta-grid-label">Apalancado</span>
                    <span class="tarjeta-grid-value val-apalancado">${formatCurrency(t.apalancamiento)}</span>
                </div>
                <div class="tarjeta-grid-item">
                    <span class="tarjeta-grid-label">MSI</span>
                    <span class="tarjeta-grid-value val-msi">${formatCurrency(msiVal)}</span>
                </div>
                <div class="tarjeta-grid-item">
                    <span class="tarjeta-grid-label">Disponible</span>
                    <span class="tarjeta-grid-value val-disponible">${formatCurrency(t.disponible)}</span>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}