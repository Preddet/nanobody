import pandas as pd
import json
import os
import math

def clean_value(val):
    if pd.isna(val) or val == 'nan':
        return ""
    if isinstance(val, float):
        if math.isnan(val): return ""
    return str(val).strip()

def build_json():
    file_path = 'Nanobody-antijenli-PDB kodları_FINAL.xlsx'
    print(f"Reading {file_path}...")
    df = pd.read_excel(file_path)
    
    # Create docs directory if it doesn't exist
    os.makedirs('docs', exist_ok=True)
    
    records = []
    # Columns: ['PDB code', 'Antijen', 'Organism', 'Yöntem', 'Makale var mı?', 'Makale Link', 'Nanobody Sekansı']
    
    for _, row in df.iterrows():
        pdb = clean_value(row.get('PDB code', ''))
        if not pdb:
            continue
            
        record = {
            "pdb": pdb,
            "antigen": clean_value(row.get('Antijen', '')),
            "organism": clean_value(row.get('Organism', '')),
            "method": clean_value(row.get('Yöntem', '')),
            "has_paper": clean_value(row.get('Makale var mı?', '')),
            "paper_link": clean_value(row.get('Makale Link', '')),
            "sequence": clean_value(row.get('Nanobody Sekansı', ''))
        }
        records.append(record)
        
    out_path = os.path.join('docs', 'library.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully wrote {len(records)} records to {out_path}")

if __name__ == "__main__":
    build_json()
