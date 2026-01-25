from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple, Optional
import re


@dataclass
class PatientFiles:
    patient_id: str
    patient_dir: Path
    info_path: Path
    ed_frame_idx: int
    es_frame_idx: int
    ed_image_path: Path
    es_image_path: Path


def list_patients(demo_root: Path) -> list[str]:
    if not demo_root.exists():
        return []
    return sorted([p.name for p in demo_root.iterdir() if p.is_dir()])



def read_info_cfg(info_path: Path) -> Dict[str, str]:
    """
    Parse ACDC Info.cfg file.
    Expected lines like:
      ED: 1
      ES: 14
    """
    text = info_path.read_text(encoding="utf-8", errors="ignore")
    info: Dict[str, str] = {}

    # key: value pattern
    for line in text.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        k, v = line.split(":", 1)
        info[k.strip()] = v.strip()
    return info


def _find_frame_file(patient_dir: Path, patient_id: str, frame_idx: int) -> Path:
    """
    Find file like patient101_frame01.nii (ACDC uses 2-digit frame).
    """
    frame_str = f"{frame_idx:02d}"  # 1 -> "01"
    cand = patient_dir / f"{patient_id}_frame{frame_str}.nii"
    if cand.exists():
        return cand

    # Fallback: try any matching file (robust)
    pattern = re.compile(rf"^{re.escape(patient_id)}_frame{frame_str}\.nii(\.gz)?$")
    for f in patient_dir.iterdir():
        if f.is_file() and pattern.match(f.name):
            return f

    raise FileNotFoundError(f"Frame file not found for {patient_id} frame {frame_idx} in {patient_dir}")


def load_patient_files(demo_root: Path, patient_id: str) -> PatientFiles:
    """
    Locate patient folder, parse ED/ES from Info.cfg, and return paths to ED/ES frame NIfTI.
    """
    patient_dir = demo_root / patient_id
    if not patient_dir.exists():
        raise FileNotFoundError(f"Patient dir not found: {patient_dir}")

    info_path = patient_dir / "Info.cfg"
    if not info_path.exists():
        raise FileNotFoundError(f"Info.cfg not found in: {patient_dir}")

    info = read_info_cfg(info_path)

    if "ED" not in info or "ES" not in info:
        raise ValueError(f"Info.cfg missing ED/ES keys: {info_path}")

    ed = int(info["ED"])
    es = int(info["ES"])

    ed_path = _find_frame_file(patient_dir, patient_id, ed)
    es_path = _find_frame_file(patient_dir, patient_id, es)

    return PatientFiles(
        patient_id=patient_id,
        patient_dir=patient_dir,
        info_path=info_path,
        ed_frame_idx=ed,
        es_frame_idx=es,
        ed_image_path=ed_path,
        es_image_path=es_path,
    )

DEMO_ROOT = Path(__file__).resolve().parents[1] / "data" / "demo"

if __name__ == "__main__":
    patients = list_patients(DEMO_ROOT)
    print("Patients:", patients)

    if patients:
        pf = load_patient_files(DEMO_ROOT, patients[0])
        print(pf)
        print("ED file:", pf.ed_image_path.name)
        print("ES file:", pf.es_image_path.name)