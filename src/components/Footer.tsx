import { Container, Typography } from "@mui/material"

export function Footer({ text }: string) {
  return (
    <Container
      maxWidth="xl"
      sx={{ py: 2, borderTop: "1px solid", borderColor: "divider", display: "grid" }}
    >
      {text && <Typography>...{text}</Typography>}
    </Container>
  )
}
