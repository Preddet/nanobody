import pandas as pd

file_path = 'Nanobody-antijenli-PDB kodları_UPDATED.xlsx'
df = pd.read_excel(file_path, header=1)
print(df.columns.tolist())
