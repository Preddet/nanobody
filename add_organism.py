import pandas as pd
import requests
import time

def get_pdb_organisms(pdb_ids):
    # Batch query PDB GraphQL API
    query = """
    query ($entry_ids: [String!]!) {
      entries(entry_ids: $entry_ids) {
        rcsb_id
        polymer_entities {
          rcsb_entity_source_organism {
            scientific_name
          }
        }
      }
    }
    """
    
    url = "https://data.rcsb.org/graphql"
    results = {}
    
    # Process in batches of 50
    batch_size = 50
    for i in range(0, len(pdb_ids), batch_size):
        batch = pdb_ids[i:i+batch_size]
        variables = {"entry_ids": batch}
        try:
            response = requests.post(url, json={'query': query, 'variables': variables})
            data = response.json()
            if 'data' in data and data['data']['entries']:
                for entry in data['data']['entries']:
                    pdb_id = entry['rcsb_id']
                    organisms = []
                    if entry.get('polymer_entities'):
                        for entity in entry['polymer_entities']:
                            org_list = entity.get('rcsb_entity_source_organism')
                            if org_list:
                                for org in org_list:
                                    if org and 'scientific_name' in org:
                                        organisms.append(org['scientific_name'])
                    results[pdb_id] = list(set(organisms))
        except Exception as e:
            print(f"Error fetching batch {batch}: {e}")
        time.sleep(0.5)
        
    return results

def determine_organism(organisms):
    if not organisms:
        return "Unknown"
        
    # Terms to exclude (viruses, phages, etc.)
    exclude_keywords = ['virus', 'coronavirus', 'phage', 'viridae', 'viroid', 'virion']
    
    # Filter the list
    filtered = [org for org in organisms if not any(k in org.lower() for k in exclude_keywords)]
    
    # If we filtered everything out, we might want to return the original list 
    # but usually if they only bind to a virus, the user might want "Unknown" or the original.
    # However, if 'synthetic construct' is in there, maybe they want it removed too if others exist?
    # For now, let's just return the filtered list or the original if nothing is left.
    if not filtered:
        return ", ".join(organisms)
        
    return ", ".join(filtered)

file_path = 'Nanobody-antijenli-PDB kodları_UPDATED.xlsx'
print(f"Reading {file_path}...")
df = pd.read_excel(file_path, header=1)
original_columns = df.columns.tolist()

# Get PDB codes, filtering out NaNs
pdb_codes = [str(code).strip().upper() for code in df['PDB code'] if pd.notna(code) and str(code).strip()]
print(f"Found {len(pdb_codes)} PDB codes. Fetching organisms...")

organisms_map = get_pdb_organisms(pdb_codes)

# Map organisms back to the dataframe
def get_organism_for_row(row):
    code = str(row['PDB code']).strip().upper()
    if code in organisms_map:
        return determine_organism(organisms_map[code])
    return "Unknown"

df['Organism'] = df.apply(get_organism_for_row, axis=1)

# Reorder columns: Organism after Antijen
col_idx = df.columns.get_loc('Antijen')
new_cols = df.columns.tolist()[:-1] # Remove Organism from end
new_cols.insert(col_idx + 1, 'Organism')
df = df[new_cols]

# Save to new Excel file
output_path = 'Nanobody-antijenli-PDB kodları_FINAL.xlsx'
print(f"Saving to {output_path}...")
df.to_excel(output_path, index=False)
print("Done!")
