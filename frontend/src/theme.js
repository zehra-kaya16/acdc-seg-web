import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial"].join(","),
    h3: { fontWeight: 800, letterSpacing: -0.6 },
    h6: { fontWeight: 700 },
  },
  components: {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        minHeight: "100vh",
        background: `
          linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)),
          url("/cardiac-17.png")
        `,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      },
    },
  },

  MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
  MuiButton: { styleOverrides: { root: { borderRadius: 12, textTransform: "none", fontWeight: 700 } } },
},

});
