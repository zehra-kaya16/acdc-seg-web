from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


# -----------------------------
# Model: ResUNet2D
# -----------------------------
NUM_CLASSES_DEFAULT = 4
EPS = 1e-8


class ResidualBlock(nn.Module):
    def __init__(self, c_in: int, c_out: int):
        super().__init__()
        self.conv1 = nn.Conv2d(c_in, c_out, kernel_size=3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(c_out)
        self.conv2 = nn.Conv2d(c_out, c_out, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c_out)
        self.act = nn.ReLU(inplace=True)
        self.skip = nn.Conv2d(c_in, c_out, kernel_size=1, bias=False) if c_in != c_out else nn.Identity()

    def forward(self, x):
        identity = self.skip(x)
        out = self.act(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = self.act(out + identity)
        return out


class ResUNet2D(nn.Module):
    def __init__(self, c_in: int = 1, c_out: int = NUM_CLASSES_DEFAULT, base: int = 64):
        super().__init__()
        self.d1 = ResidualBlock(c_in, base);    self.p1 = nn.MaxPool2d(2)
        self.d2 = ResidualBlock(base, base*2);  self.p2 = nn.MaxPool2d(2)
        self.d3 = ResidualBlock(base*2, base*4);self.p3 = nn.MaxPool2d(2)
        self.d4 = ResidualBlock(base*4, base*8);self.p4 = nn.MaxPool2d(2)

        self.b  = ResidualBlock(base*8, base*16)

        self.u4 = nn.ConvTranspose2d(base*16, base*8,  kernel_size=2, stride=2)
        self.u3 = nn.ConvTranspose2d(base*8,  base*4,  kernel_size=2, stride=2)
        self.u2 = nn.ConvTranspose2d(base*4,  base*2,  kernel_size=2, stride=2)
        self.u1 = nn.ConvTranspose2d(base*2,  base,    kernel_size=2, stride=2)

        self.c4 = ResidualBlock(base*16, base*8)
        self.c3 = ResidualBlock(base*8,  base*4)
        self.c2 = ResidualBlock(base*4,  base*2)
        self.c1 = ResidualBlock(base*2,  base)

        self.out = nn.Conv2d(base, c_out, kernel_size=1)

    def forward(self, x):
        d1 = self.d1(x); x = self.p1(d1)
        d2 = self.d2(x); x = self.p2(d2)
        d3 = self.d3(x); x = self.p3(d3)
        d4 = self.d4(x); x = self.p4(d4)
        x  = self.b(x)
        x  = self.u4(x); x = torch.cat([x, d4], dim=1); x = self.c4(x)
        x  = self.u3(x); x = torch.cat([x, d3], dim=1); x = self.c3(x)
        x  = self.u2(x); x = torch.cat([x, d2], dim=1); x = self.c2(x)
        x  = self.u1(x); x = torch.cat([x, d1], dim=1); x = self.c1(x)
        return self.out(x)


# -----------------------------
# Inference config
# -----------------------------
@dataclass
class InferenceConfig:
    device: str = "cpu"                 # "cuda" da olabilir
    num_classes: int = 4
    out_hw: Tuple[int, int] = (256, 256)


# -----------------------------
# Preprocess (Colab'daki preprocess_slice_with_meta ile aynı mantık)
# -----------------------------
def preprocess_slice_with_meta(x2d: np.ndarray, out_hw=(256, 256)) -> Tuple[np.ndarray, Dict]:
    x = x2d.astype(np.float32)

    lo, hi = np.percentile(x, 1), np.percentile(x, 99)
    x = np.clip(x, lo, hi)

    x = (x - x.min()) / (x.max() - x.min() + EPS)

    H, W = x.shape
    outH, outW = out_hw

    pad_h = max(0, outH - H)
    pad_w = max(0, outW - W)
    pad_top = pad_h // 2
    pad_bot = pad_h - pad_top
    pad_left = pad_w // 2
    pad_right = pad_w - pad_left

    x_pad = np.pad(x, ((pad_top, pad_bot), (pad_left, pad_right)), mode="constant")

    H2, W2 = x_pad.shape
    start_h = (H2 - outH) // 2
    start_w = (W2 - outW) // 2
    x_crop = x_pad[start_h:start_h + outH, start_w:start_w + outW]

    meta = {
        "orig_shape": (H, W),
        "pad": (pad_top, pad_bot, pad_left, pad_right),
        "crop_start": (start_h, start_w),
        "out_hw": (outH, outW),
        "padded_shape": (H2, W2),
    }
    return x_crop, meta


def invert_preprocess_mask(mask256: np.ndarray, meta: Dict) -> np.ndarray:
    H, W = meta["orig_shape"]
    pad_top, pad_bot, pad_left, pad_right = meta["pad"]
    start_h, start_w = meta["crop_start"]
    H2, W2 = meta["padded_shape"]
    outH, outW = meta["out_hw"]

    padded = np.zeros((H2, W2), dtype=np.uint8)
    padded[start_h:start_h + outH, start_w:start_w + outW] = mask256.astype(np.uint8)

    h0 = pad_top
    h1 = H2 - pad_bot
    w0 = pad_left
    w1 = W2 - pad_right
    unpadded = padded[h0:h1, w0:w1]

    unpadded = unpadded[:H, :W]
    if unpadded.shape != (H, W):
        fixed = np.zeros((H, W), dtype=np.uint8)
        hh = min(H, unpadded.shape[0])
        ww = min(W, unpadded.shape[1])
        fixed[:hh, :ww] = unpadded[:hh, :ww]
        unpadded = fixed
    return unpadded


# -----------------------------
# Model loader (tek sefer yükle)
# -----------------------------
_MODEL_CACHE: Dict[str, nn.Module] = {}


def load_resunet2d_state_dict(ckpt_path: Path, cfg: InferenceConfig) -> nn.Module:
    key = f"{ckpt_path.resolve()}::{cfg.device}::{cfg.num_classes}"
    if key in _MODEL_CACHE:
        return _MODEL_CACHE[key]

    device = torch.device(cfg.device)
    model = ResUNet2D(c_in=1, c_out=cfg.num_classes)
    state = torch.load(str(ckpt_path), map_location=device)
    model.load_state_dict(state)
    model.to(device)
    model.eval()
    _MODEL_CACHE[key] = model
    return model


@torch.no_grad()
def predict_mask_volume_original_space(model: nn.Module, vol_hwc: np.ndarray, cfg: InferenceConfig) -> np.ndarray:
    """
    vol_hwc: (H,W,Z)
    returns: (H,W,Z) uint8 (0..C-1)
    """
    device = torch.device(cfg.device)
    H, W, Z = vol_hwc.shape
    pred = np.zeros((H, W, Z), dtype=np.uint8)

    for z in range(Z):
        x256, meta = preprocess_slice_with_meta(vol_hwc[..., z], out_hw=cfg.out_hw)
        x_t = torch.from_numpy(x256)[None, None, ...].to(device)  # (1,1,256,256)
        logits = model(x_t)                                       # (1,C,256,256)
        mask256 = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy().astype(np.uint8)
        maskHW = invert_preprocess_mask(mask256, meta)
        pred[..., z] = maskHW

    return pred
