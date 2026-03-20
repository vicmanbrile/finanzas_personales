from flask import Flask, jsonify, send_from_directory
from datetime import datetime, timedelta
import requests
import csv
import math
import io
import os
import json

app = Flask(__name__)
PATH = "/home/devic/htdocs/devic.mx"
SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXdAW8zU6-897ZCb-1r4--VCALsGkuzo5psM4pimZhuaAqApY0gyKEvH6GtUgL0N5YwnqCfeTtpibj/pub?gid=0&single=true&output=csv"
CACHE_FILE = "cache_data.json"

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
        dias_al_viernes = (self.fecha_pago.weekday() - 4) % 7
        inicio_semana_7 = self.fecha_pago - timedelta(days=dias_al_viernes)

        # 3. Diferencia en días desde hoy hasta el inicio de la semana 7
        dias_diff = (inicio_semana_7 - hoy).days

        # 4. Asignar la semana basada en bloques de 7 días exactos
        if dias_diff <= 0:
            semanas = 7
        else:
            semanas = 7 - math.ceil(dias_diff / 7)

        # 5. Asegurar que nunca baje de la semana 1 ni suba de la 7
        return max(1, min(7, semanas))


    def calcular(self):
        deuda_total = max(0.0, self.credito - self.disponible)
        uso_porcentaje = round((deuda_total / self.credito * 100), 1) if self.credito > 0 else 0

        semanas = self.semanas_hasta_pago()
        saldo_corriente = max(0.0, self.saldo - self.saldo_pagar)
        msi_total = max(0.0, deuda_total - self.saldo)
        
        # Semana correspondiente al saldo corriente
        t_sc = semanas if semanas >= 3 else 1        
        
        # Desglosamos las cantidades a ahorrar
        ahorro_saldo_pagar = (self.saldo_pagar * semanas / 7)
        ahorro_saldo_corriente = (saldo_corriente * t_sc / 7)
        
        # Mantenemos el total general limitándolo a la deuda total por seguridad
        tener = ahorro_saldo_pagar + ahorro_saldo_corriente
        tener = min(deuda_total, tener)
        
        apalancamiento_total = max(0.0, deuda_total - tener)
        msi = min(msi_total, apalancamiento_total) 
        apalancamiento_neto = max(0.0, apalancamiento_total - msi)

        return {
            "nombre": self.nombre,
            "color": self.color,
            "credito": self.credito,
            "fechaPago": self.fecha_pago.strftime('%d/%m/%Y'),
            "semanaActual": semanas,
            "semanaSaldoCorriente": t_sc,
            "usoPorcentaje": uso_porcentaje,
            "saldoPagar": self.saldo_pagar,
            "ahorroSaldoCorriente": round(ahorro_saldo_corriente, 2),
            "tener": round(tener, 2),
            "apalancamiento": round(apalancamiento_neto, 2),
            "msi": round(msi, 2),
            "disponible": self.disponible,
        }

@app.route('/api/tarjetas')
def get_tarjetas():
    try:
        # 1. Intentar descargar datos de Google Sheets (con timeout de 5s)
        respuesta = requests.get(SHEET_URL, timeout=5)
        respuesta.raise_for_status()
        respuesta.encoding = 'utf-8'

        # 2. Parsear CSV
        contenido = io.StringIO(respuesta.text)
        lector = csv.reader(contenido)
        next(lector) # Saltar encabezado

        # 3. Procesar cada fila
        resultado = []
        for fila in lector:
            if len(fila) >= 6:
                t = TarjetaLogic(*fila)
                resultado.append(t.calcular())

        # Ordenar las tarjetas por la semana actual
        resultado.sort(key=lambda x: x['semanaActual'], reverse=True)

        # 4. Calcular totales en el backend
        t_credito = sum(t['credito'] for t in resultado)
        t_disponible = sum(t['disponible'] for t in resultado)
        t_ahorro = sum(t['tener'] for t in resultado)
        t_apalancado = sum(t['apalancamiento'] for t in resultado)
        t_msi = sum(t['msi'] for t in resultado)
        
        t_usado = t_credito - t_disponible
        utilizacion = (t_usado / t_credito * 100) if t_credito > 0 else 0

        # 5. Estructurar la respuesta final (Cliente Ligero)
        respuesta_json = {
            "totales": {
                "totalCredito": t_credito,
                "totalDisponible": t_disponible,
                "totalAhorro": t_ahorro,
                "totalApalancado": t_apalancado,
                "totalMsi": t_msi,
                "totalUsado": t_usado,
                "utilizacionGlobal": utilizacion,
                "pctAhorro": (t_ahorro / t_credito * 100) if t_credito > 0 else 0,
                "pctApalancado": (t_apalancado / t_credito * 100) if t_credito > 0 else 0,
                "pctMsi": (t_msi / t_credito * 100) if t_credito > 0 else 0,
                "pctDisponible": (t_disponible / t_credito * 100) if t_credito > 0 else 0
            },
            "tarjetas": resultado
        }

        # 6. Actualizar caché local con la nueva estructura
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(respuesta_json, f, ensure_ascii=False, indent=4)

        return jsonify(respuesta_json)

    except Exception as e:
        print(f"Error de red/datos: {e}. Intentando cargar desde caché...")
        if os.path.exists(CACHE_FILE):
            try:
                # Si hay error de red, devolvemos la última versión guardada en caché
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                return jsonify(cache_data)
            except Exception as e_cache:
                return jsonify({"error": f"Error crítico al leer caché: {str(e_cache)}"}), 500

        return jsonify({"error": "No hay conexión ni caché disponible"}), 500

# Rutas para archivos estáticos
@app.route('/')
def index(): 
    return send_from_directory(PATH, 'index.html')

@app.route('/<path:path>')
def static_files(path): 
    return send_from_directory(PATH, path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)