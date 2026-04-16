import { Container, Typography } from "@mui/material"

export function Footer() {
  return (
    <Container
      maxWidth="xl"
      sx={{ py: 2, borderTop: "1px solid", borderColor: "divider", display: "grid" }}
    >
      <Typography>Footer</Typography>
    </Container>
  )
}
