import { Container, Typography } from "@mui/material"
import { ThemeToggle } from "./ThemeToggle"

export function Header() {
  return (
    <Container
      id="header"
      maxWidth="xl"
      sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", m: 0 }}
    >
      <Typography>CodeWAS Table</Typography>
      <ThemeToggle />
    </Container>
  )
}
