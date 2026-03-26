import pandas as pd
import json

def convertir_hyg_a_json(input_file, output_file):
    print(f"Leyendo {input_file}...")
    
    # Columnas que nos interesan
    columnas_utiles = ['id', 'bf', 'proper', 'ra', 'dec', 'mag', 'con']
    
    try:
        # 1. Cargamos los datos
        df = pd.read_csv(input_file, compression='gzip', usecols=columnas_utiles)
        
        # 2. Filtramos (solo estrellas visibles, mag < 6.5)
        df = df[df['mag'] <= 6.5]
        
        # 3. EL TRUCO: Reemplazar NaN por None
        df = df.astype(object).where(pd.notnull(df), None)
        
        print(f"Procesadas {len(df)} estrellas. Convirtiendo a JSON...")
        
        # 4. Convertir a lista de diccionarios
        data_list = df.to_dict(orient='records')
        
        # 5. Guardar el archivo
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data_list, f, indent=2, ensure_ascii=False)
            
        print(f"¡Listo! Archivo generado: {output_file}")
        
    except Exception as e:
        print(f"Hubo un error: {e}")

# Uso del script
convertir_hyg_a_json('hygdata_v42.csv.gz', '../../public/estrellas.json')
