// App.tsx — wire up the table with your JSON data
import { ThemeProvider, createTheme, CssBaseline, Container, Typography } from "@mui/material"
import ConceptTable from "./table/ConceptTable"

import rawData from "./data/data.json"
import { ThemeToggle } from "./components/ThemeToggle"

const data = JSON.parse(JSON.stringify(rawData))

// In a real app this comes from an API fetch / prop

const theme = createTheme({
  colorSchemes: {
    light: true,
    dark: true,
  },
  // palette: { mode: "light" },
  typography: {
    fontFamily: [
      "Hack",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    fontSize: 11,
  },
})

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container
        id="header"
        maxWidth="xl"
        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", m: 0 }}
      >
        <Typography>CodeWAS Table</Typography>
        <ThemeToggle />
      </Container>
      <ConceptTable data={data} />
    </ThemeProvider>
  )
}
