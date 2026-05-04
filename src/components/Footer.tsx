import { Container, Typography } from "@mui/material"

interface FooterProps {
  text: string | null
}

export function Footer({ text = "filePath" }: FooterProps) {
  return (
    <Container
      maxWidth="xl"
      sx={{ py: 2, borderTop: "1px solid", borderColor: "divider", display: "grid" }}
    >
      {text && <Typography>...{text}</Typography>}
    </Container>
  )
}
