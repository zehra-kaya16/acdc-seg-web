from __future__ import annotations

from pathlib import Path
from typing import Optional

import numpy as np
import matplotlib.pyplot as plt


def save_overlay_png(
    img2d: np.ndarray,
    mask2d: np.ndarray,
    out_path: Path,
    title: Optional[str] = None,
    alpha: float = 0.4,
    vmin: int = 0,
    vmax: int = 3,
):
    out_path.parent.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(6, 6))
    plt.imshow(img2d, cmap="gray")
    plt.imshow(mask2d, cmap="jet", alpha=alpha, vmin=vmin, vmax=vmax)
    if title:
        plt.title(title)
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close()
