from flask import Flask, jsonify, send_from_directory
import requests
import csv
import io
import os
import json
import tarjetas_tdc

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATH = BASE_DIR
SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXdAW8zU6-897ZCb-1r4--VCALsGkuzo5psM4pimZhuaAqApY0gyKEvH6GtUgL0N5YwnqCfeTtpibj/pub?gid=0&single=true&output=csv"
CACHE_FILE = "cache_data.json"

@app.route('/api/tarjetas')
def get_tarjetas():
    try:
        respuesta = requests.get(SHEET_URL, timeout=5)
        respuesta.raise_for_status()
        respuesta.encoding = 'utf-8'
        
        contenido = io.StringIO(respuesta.text)
        lector = csv.reader(contenido)
        next(lector)
        
        resultado = []
        for fila in lector:
            if len(fila) >= 6:
                t = tarjetas_tdc.TarjetaLogic(*fila)
                resultado.append(t.calcular())

        def clasificar(tarjeta):
            if tarjeta['semanaCorriente'] > 0:
                return 3
            elif tarjeta['semanaAPago'] == 1:
                return 2
            else:
                return -tarjeta['semanaAPago']

        resultado.sort(key=clasificar)
       
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

@app.route('/')
def index(): 
    return send_from_directory(PATH, 'index.html')

@app.route('/<path:path>')
def static_files(path): 
    return send_from_directory(PATH, path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)