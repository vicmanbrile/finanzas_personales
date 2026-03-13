from flask import Flask, jsonify, send_from_directory
from datetime import datetime, timedelta
import requests
import csv
import math
import io
import os
import json

app = Flask(__name__)
PATH = r"C:\Users\victo\OneDrive\Documents\Downloads\finanzas"
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
            # Asumimos formato YYYY-MM-DD que viene de Sheets
            self.fecha_pago = datetime.strptime(fecha_pago_str.strip(), '%Y-%m-%d')
        except:
            self.fecha_pago = datetime.now()

    def calcular(self):
        deuda_total = max(0.0, self.credito - self.disponible)
        uso_porcentaje = round((deuda_total / self.credito * 100), 1) if self.credito > 0 else 0
        
        # Lógica de Semanas y Ahorro
        hoy = datetime.now()
        f = self.fecha_pago + timedelta(days=1)
        d = f.isoweekday() 
        inicio = self.fecha_pago - timedelta(days=(d + 50))
        diff_days = (hoy - inicio).days
        semanas = min(7, max(1, math.floor(diff_days / 7) + 1))
        
        saldo_corriente = max(0.0, self.saldo - self.saldo_pagar)
        msi_total = max(0.0, deuda_total - saldo_corriente)
        t_sc = semanas if semanas >= 3 else 0        
        tener = (self.saldo_pagar * semanas / 7) + (saldo_corriente * t_sc / 7)
        tener = min(deuda_total, tener)
        apalancamiento_total = max(0.0, deuda_total - tener)
        msi = min(msi_total, apalancamiento_total) 
        apalancamiento_neto = max(0.0, apalancamiento_total - msi)
        
        return {
            "nombre": self.nombre,
            "credito": self.credito,
            "disponible": self.disponible,
            "tener": round(tener, 2),
            "apalancamiento": round(apalancamiento_neto, 2),
            "msi": round(msi, 2),
            "usoPorcentaje": uso_porcentaje,
            "color": self.color,
            "fechaPago": self.fecha_pago.strftime('%d/%m/%Y'),
            "saldoPagar": self.saldo_pagar,
            "semanaActual": semanas
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
        
        # 4. Actualizar caché local con datos frescos
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(resultado, f, ensure_ascii=False, indent=4)
        
        return jsonify(resultado)

    except Exception as e:
        print(f"Error de red/datos: {e}. Intentando cargar desde caché...")
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                return jsonify(cache_data)
            except Exception as e_cache:
                return jsonify({"error": f"Error crítico: {str(e_cache)}"}), 500
        
        return jsonify({"error": "No hay conexión ni caché disponible"}), 500

# Rutas para archivos estáticos
@app.route('/')
def index(): return send_from_directory(PATH, 'index.html')

@app.route('/<path:path>')
def static_files(path): return send_from_directory(PATH, path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)