import { GraphicEq, TableBar } from "@mui/icons-material"
import {
  BottomNavigation,
  BottomNavigationAction,
  Container,
  Paper,
  Typography,
} from "@mui/material"
import type { Dispatch, SetStateAction } from "react"
import type { PageViewOptions } from "../utils/types"

interface FooterProps {
  text: string | null
  pageView: string
  setPageView: Dispatch<SetStateAction<PageViewOptions>>
}

export function Footer({ text = "filePath", pageView, setPageView }: FooterProps) {
  return (
    <Paper
      sx={{
        position: "sticky",
        bottom: 0,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "grid",
        zIndex: 10,
      }}
      elevation={3}
    >
      {text && <Typography variant="body2">...{text}</Typography>}
      <BottomNavigation
        // showLabels
        value={pageView}
        onChange={(_event, newValue) => {
          setPageView(newValue)
        }}
      >
        <BottomNavigationAction label="Table" value="table" icon={<TableBar />} />
        <BottomNavigationAction label="Charts" value="charts" icon={<GraphicEq />} />
      </BottomNavigation>
    </Paper>
  )
}
