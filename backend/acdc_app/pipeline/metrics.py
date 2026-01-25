from __future__ import annotations

from dataclasses import dataclass
import numpy as np
import nibabel as nib

EPS = 1e-8


def voxel_volume_ml(nifti_img: nib.Nifti1Image) -> float:
    dx, dy, dz = nifti_img.header.get_zooms()[:3]  # mm
    return float(dx * dy * dz) / 1000.0            # ml


def volume_ml_from_mask(mask_hwc: np.ndarray, v_voxel_ml: float, label: int) -> float:
    return float(np.sum(mask_hwc == label)) * float(v_voxel_ml)


def compute_edv_esv_ef(ed_mask: np.ndarray, es_mask: np.ndarray, v_voxel_ml: float, lv_label: int = 3):
    edv = volume_ml_from_mask(ed_mask, v_voxel_ml, lv_label)
    esv = volume_ml_from_mask(es_mask, v_voxel_ml, lv_label)
    ef  = (edv - esv) / (edv + EPS) * 100.0
    return edv, esv, ef
