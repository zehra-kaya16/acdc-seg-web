import { useEffect, useMemo, useState } from "react";
import {
  AppBar, Toolbar, Typography, Container, Grid, Card, CardContent,
  Stack, Button, FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, ToggleButtonGroup, ToggleButton, Chip, Box
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { getPatients, runPredict } from "./api";
import MetricCard from "./components/MetricCard";
import OverlayPanel from "./components/OverlayPanel";

export default function App() {
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState("");
  const [phase, setPhase] = useState("ED"); // ED / ES
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

  const apiBase = import.meta.env.VITE_API_BASE;

  useEffect(() => {
    (async () => {
      try {
        const data = await getPatients(); // beklenen: [{patient_id, real_patient_id}] veya benzeri
        setPatients(data);

        // Eğer backend şu an [] döndürüyorsa, UI boş kalmasın diye:
        // demo fallback (istersen kaldır)
        if (!data?.length) {
          setPatients([{ patient_id: "Patient 1", real_patient_id: "patient101" }]);
        }
      } catch (e) {
        setError("Backend’e bağlanılamadı. API çalışıyor mu? /docs açılıyor mu?");
      }
    })();
  }, []);

  const selectedId = useMemo(() => {
    // backend’in döndürdüğü yapıya göre seçimi normalize et
    // kullanıcı Patient 1 seçse de real id ile predict çağıracağız
    const p = patients.find(x => x.patient_id === selected || x.real_patient_id === selected);
    return p?.real_patient_id || selected || "";
  }, [patients, selected]);

  async function onRun() {
    setError("");
    setLoading(true);
    setResult(null);

    try {
      if (!selectedId) throw new Error("Hasta seçilmedi.");

      const data = await runPredict(selectedId);

      // 1) Buraya log ekle
      console.log("PREDICT RESPONSE:", data);
      console.log("VITE_API_BASE:", apiBase);

      // 2) URL düzeltme: absolute ise olduğu gibi kullan, relative ise base ekle
      const toAbs = (u) => {
        if (!u) return null;
        if (/^https?:\/\//i.test(u)) return u; // zaten tam URL
        const base = (apiBase || "").replace(/\/$/, "");
        const path = u.startsWith("/") ? u : `/${u}`;
        return `${base}${path}`;
      };

      setResult({
        edv: data.edv_ml,
        esv: data.esv_ml,
        ef: data.ef_percent,
        edImg: toAbs(data.ed_overlay_url),
        esImg: toAbs(data.es_overlay_url),
      });
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || "Predict sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  const year = new Date().getFullYear();

  // 2) Daha canlı demo: Indigo/Navy → Cyan/Teal vurgu + hafif glow
  const barBg =
    "linear-gradient(90deg, rgba(7,12,26,0.96) 0%, rgba(2,34,64,0.94) 45%, rgba(0,120,170,0.92) 100%)";

  const barGlow =
    "0 10px 34px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 28px rgba(0,190,255,0.18)";

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: "rgba(255,255,255,0.10)",
          color: "#fff",
          background: barBg,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: barGlow,
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "2px",
            background:
              "linear-gradient(90deg, rgba(0,255,240,0.00), rgba(0,255,240,0.35), rgba(0,190,255,0.45), rgba(0,255,240,0.00))",
          },
        }}
      >
        <Toolbar sx={{ gap: 1.25 }}>
          <Stack>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
              ACDC Cardiac MRI Segmentation
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.82)" }}>
              2D ResUNet • EDV/ESV/EF hesaplama • Overlay çıktısı
            </Typography>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* İçerik alanı büyüsün, footer aşağı itilsin */}
      <Box component="main" sx={{ flex: "1 0 auto" }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Grid container spacing={3}>
            {/* METRICS */}
            <Grid item xs={12}>
              <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ height: 110 }}>
                    <MetricCard title="EDV" value={result?.edv?.toFixed?.(2)} unit="ml" />
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ height: 110 }}>
                    <MetricCard title="ESV" value={result?.esv?.toFixed?.(2)} unit="ml" />
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ height: 110 }}>
                    <MetricCard title="EF" value={result?.ef?.toFixed?.(2)} unit="%" />
                  </Box>
                </Grid>
              </Grid>
            </Grid>

            {/* LEFT PANEL */}
            <Grid item xs={12} md={4}>
              <Card
                variant="outlined"
                sx={{
                  backgroundColor: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(10px)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                  borderColor: "rgba(255,255,255,0.7)",
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6">Çalıştırma Paneli</Typography>

                    <FormControl fullWidth>
                      <InputLabel>Hasta</InputLabel>
                      <Select
                        value={selected}
                        label="Hasta"
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        {patients.map((p) => (
                          <MenuItem key={p.real_patient_id || p.patient_id} value={p.real_patient_id || p.patient_id}>
                            {p.patient_id || p.real_patient_id}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">Model:</Typography>
                      <Chip size="small" label="ResUNet2D" />
                    </Stack>

                    <Button
                      size="large"
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={18} /> : <PlayArrowIcon />}
                      disabled={loading || !selectedId}
                      onClick={onRun}
                    >
                      {loading ? "Çalışıyor..." : "Run Segmentation"}
                    </Button>

                    {error && <Alert severity="error">{String(error)}</Alert>}

                    <Alert
                      severity="info"
                      sx={{
                        visibility: "hidden", // görünmez ama yer kaplar
                      }}
                    >
                      Backend açık değilse sonuçlar gelmez. API: <b>{apiBase}</b>
                    </Alert>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* RIGHT PANEL */}
            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 999,
                      background:
                        "linear-gradient(90deg, rgba(7,12,26,0.55), rgba(0,120,170,0.38))",
                      color: "#fff",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      boxShadow:
                        "0 10px 26px rgba(0,0,0,0.36), 0 0 18px rgba(0,190,255,0.16)",
                    }}
                  >
                    <Typography variant="h6" sx={{ m: 0, fontWeight: 800, color: "#fff" }}>
                      Segmentation Overlay
                    </Typography>

                    <ToggleButtonGroup
                      value={phase}
                      exclusive
                      onChange={(_, v) => v && setPhase(v)}
                      size="small"
                      sx={{
                        ml: 1,
                        "& .MuiToggleButton-root": {
                          color: "rgba(255,255,255,0.92)",
                          borderColor: "rgba(255,255,255,0.22)",
                          backgroundColor: "rgba(255,255,255,0.10)",
                          px: 1.25,
                        },
                        "& .MuiToggleButton-root:hover": {
                          backgroundColor: "rgba(0,190,255,0.14)",
                          borderColor: "rgba(0,255,240,0.35)",
                        },
                        "& .MuiToggleButton-root.Mui-selected": {
                          color: "#07101a",
                          backgroundColor: "rgba(220,255,252,0.92)",
                          borderColor: "rgba(0,255,240,0.45)",
                          boxShadow: "0 0 0 1px rgba(0,255,240,0.25) inset",
                        },
                        "& .MuiToggleButton-root.Mui-selected:hover": {
                          backgroundColor: "rgba(220,255,252,0.92)",
                        },
                      }}
                    >
                      <ToggleButton value="ED">ED</ToggleButton>
                      <ToggleButton value="ES">ES</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Stack>

                {/* Görsel gelmeden önce alanı rezerve et → kaymayı azaltır */}
                <Box sx={{ minHeight: 520 }}>
                  <OverlayPanel
                    title={phase === "ED" ? "End-Diastole (ED) Overlay" : "End-Systole (ES) Overlay"}
                    imgUrl={phase === "ED" ? result?.edImg : result?.esImg}
                  />
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FOOTER */}
      <Box
        component="footer"
        sx={{
          mt: "auto",
          borderTop: 1,
          borderColor: "rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.90)",
          background: barBg,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: `0 -10px 26px rgba(0,0,0,0.38), 0 0 28px rgba(0,190,255,0.14)`,
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "2px",
            background:
              "linear-gradient(90deg, rgba(0,255,240,0.00), rgba(0,255,240,0.28), rgba(0,190,255,0.40), rgba(0,255,240,0.00))",
          },
        }}
      >
        <Container maxWidth="lg" sx={{ py: 2.25 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.92)" }}>
              ACDC veri kümesi üzerinde kardiyak MR bölütleme ve EDV/ESV/EF hesaplama için geliştirilmiş akademik demo uygulaması.
            </Typography>

            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.72)" }}>
              {year} • Academic project
            </Typography>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
