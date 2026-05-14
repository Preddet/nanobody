import requests
q = '''{ entry(entry_id: "9B0A") { polymer_entities { rcsb_entity_source_organism { scientific_name } } } }'''
res = requests.post('https://data.rcsb.org/graphql', json={'query': q})
print(res.json())
