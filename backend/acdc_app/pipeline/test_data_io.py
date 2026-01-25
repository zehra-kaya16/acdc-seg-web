from pathlib import Path
from acdc_app.pipeline.data_io import list_patients, load_patient_files

# Burada test dosyası: backend/acdc_app/pipeline/test_data_io.py
# parents[0]=pipeline, parents[1]=acdc_app, parents[2]=backend
DEMO_ROOT = Path(__file__).resolve().parents[2] / "data" / "demo"

if __name__ == "__main__":
    print("DEMO_ROOT =", DEMO_ROOT)
    print("EXISTS?  =", DEMO_ROOT.exists())

    patients = list_patients(DEMO_ROOT)
    print("Patients:", patients)

    if patients:
        pf = load_patient_files(DEMO_ROOT, patients[0])
        print("ED file:", pf.ed_image_path.name)
        print("ES file:", pf.es_image_path.name)
