import requests

query = """
{
  entries(entry_ids: ["8EVD", "9B0A"]) {
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
response = requests.post(url, json={'query': query})
print(response.json())
