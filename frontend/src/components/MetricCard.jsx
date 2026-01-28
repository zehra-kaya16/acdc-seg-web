import { Card, CardContent, Typography, Stack } from "@mui/material";

export default function MetricCard({ title, value, unit }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={0.5}>
          <Typography variant="overline" color="text.secondary">{title}</Typography>
          <Typography variant="h5" fontWeight={800}>
            {value ?? "—"} {value != null ? unit : ""}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
