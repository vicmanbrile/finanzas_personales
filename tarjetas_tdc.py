from datetime import datetime, timedelta
import math

class TarjetaLogic:
    def __init__(self, nombre, credito, disponible, saldo, fecha_pago_str, saldo_pagar, color):
        self.nombre = nombre
        self.credito = max(0.0, float(credito or 0))
        self.disponible = max(0.0, float(disponible or 0))
        self.saldo = float(saldo or 0)
        self.saldo_pagar = max(0.0, float(saldo_pagar or 0))
        self.color = color.strip() if color else "#6366f1"
        
        try:
            self.fecha_pago = datetime.strptime(fecha_pago_str.strip(), '%Y-%m-%d')
        except:
            self.fecha_pago = datetime.now()

    def semanas_hasta_pago(self):
        # 1. Normalizar "hoy" para quitarle horas y evitar desfases matemáticos
        hoy = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 2. Encontrar el último viernes antes de (o en) la fecha de pago.
        # En Python weekday(): Lunes=0 ... Jueves=3, Viernes=4, Sábado=5, Domingo=6
        dias_al_viernes = (self.fecha_pago.weekday() - 4) % 7
        inicio_semana_7 = self.fecha_pago - timedelta(days=dias_al_viernes)
        
        # 3. Diferencia en días desde hoy hasta el inicio de la semana 7
        dias_diff = (inicio_semana_7 - hoy).days
        
        # 4. Asignar la semana basada en bloques de 7 días exactos
        if dias_diff <= 0:
            # Si hoy ya es ese "último viernes" o una fecha posterior a él
            semanas = 7
        else:
            # math.ceil redondea hacia arriba, agrupando bloques:
            # 1 a 7 días antes = Semana 6
            # 8 a 14 días antes = Semana 5... etc.
            semanas = 7 - math.ceil(dias_diff / 7)
            
        # 5. Asegurar que nunca baje de la semana 1 ni suba de la 7
        return max(1, min(7, semanas))
        

    def calcular(self):
        datos = {}

        datos["nombre"] = self.nombre
        datos["color"] = self.color
        datos["credito"] = self.credito

        # Fecha de pago (procesada)
        datos["saldoAPago"] = self.saldo_pagar
        
        semanas = self.semanas_hasta_pago()
        datos["fechaAPago"] = self.fecha_pago.strftime('%d/%m/%Y')
        datos["semanaAPago"] = semanas
        datos["tenerAPago"] = round(self.saldo_pagar * semanas / 7, 2)

        # Corriente
        saldo_corriente = max(0.0, self.saldo - self.saldo_pagar)
        datos["semanaCorriente"] = semanas - 4 if semanas > 4 else 0
        datos["tenerCorriente"] = round(saldo_corriente * datos["semanaCorriente"] / 7,2)
        # Total
        deuda_total = max(0.0, self.credito - self.disponible)
        msi_total = max(0.0, deuda_total - self.saldo)
        tener = datos["tenerCorriente"] + datos["tenerAPago"]
        apalancamiento_total = max(0.0, deuda_total - tener)
        msi = min(msi_total, apalancamiento_total) 
        apalancamiento_neto = max(0.0, apalancamiento_total - msi)

        # Totales y cálculos de redondeo
        datos["tener"] =  min(deuda_total, tener)
        datos["apalancamiento"] = round(apalancamiento_neto, 2)
        datos["msi"] = round(msi, 2)
        datos["disponible"] = self.disponible
        datos["usoPorcentaje"] = round((deuda_total / self.credito * 100), 1) if self.credito > 0 else 0

        # Finalmente, retornamos la variable
        return datos