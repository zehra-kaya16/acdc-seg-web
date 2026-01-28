import { Card, CardContent, Typography, Box } from "@mui/material";

export default function OverlayPanel({ title, imgUrl }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        borderColor: "rgba(255,255,255,0.7)",
      }}
    >
      <CardContent>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>
          {title}
        </Typography>

        <Box
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            minHeight: 360,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",

            /* Overlay görüntüsü net kalsın diye arka planı opak yaptık */
            backgroundColor: "#fff",
          }}
        >
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={title}
              style={{
                width: "100%",
                maxHeight: 520,
                objectFit: "contain",
                borderRadius: 12,
              }}
            />
          ) : (
            <Typography color="text.secondary">
              Segmentation overlay burada görünecek
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
