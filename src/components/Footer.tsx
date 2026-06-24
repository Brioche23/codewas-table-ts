import { BottomNavigation, BottomNavigationAction, Box, Paper, Typography } from "@mui/material"
import type { Dispatch, SetStateAction } from "react"
import type { LoadedDataSource, PageViewOptions } from "../utils/types"
import { TableBar, GraphicEq } from "@mui/icons-material"

interface FooterProps {
  text: string | null
  dataSource: LoadedDataSource | null
  conceptStats: { filtered: number; total: number } | null
  pageView: string
  setPageView: Dispatch<SetStateAction<PageViewOptions>>
}

function formatBytes(bytes?: number) {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function formatDuration(ms?: number) {
  if (ms == null) return null
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}

// Builds the "size · rows · columns · load time" summary shown under the file path.
function describeDataSource(
  dataSource: LoadedDataSource | null,
  conceptStats: FooterProps["conceptStats"],
): string {
  if (!dataSource) return ""
  const parts: string[] = []
  const size = formatBytes(dataSource.fileSize)

  console.log(dataSource)
  if (size) parts.push(size)

  if (dataSource.kind === "duckdb") {
    // Counts come from the explorer so they match the table exactly (filtered of total).
    if (conceptStats) {
      parts.push(
        `${conceptStats.filtered.toLocaleString()} of ${conceptStats.total.toLocaleString()} concepts`,
      )
    }
    parts.push(`${dataSource.columnCount} analyses`)
  } else {
    parts.push(`${dataSource.rows.length.toLocaleString()} rows`)
    const columns = dataSource.rows[0] ? Object.keys(dataSource.rows[0]).length : 0
    if (columns) parts.push(`${columns} columns`)
  }

  const loadTime = formatDuration(dataSource.loadMs)
  if (loadTime) parts.push(`loaded in ${loadTime}`)
  return parts.join(" · ")
}

export function Footer({ dataSource, conceptStats, pageView, setPageView }: FooterProps) {
  const metadata = describeDataSource(dataSource, conceptStats)

  return (
    <Paper
      sx={{
        // position: "sticky",
        // bottom: 0,
        // borderTop: "1px solid",
        // borderColor: "divider",
        // display: "grid",
        zIndex: 10,
      }}
      elevation={3}
    >
      <BottomNavigation
        // showLabels
        value={pageView}
        onChange={(_event, newValue) => {
          setPageView(newValue)
        }}
        sx={{ maxHeight: 40 }}
      >
        <BottomNavigationAction
          label="Table"
          value="table"
          icon={<TableBar sx={{ fontSize: 10 }} />}
        />
        <BottomNavigationAction
          label="Charts"
          value="charts"
          icon={<GraphicEq sx={{ fontSize: 10 }} />}
        />
      </BottomNavigation>
      <Box
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          px: 1,
          py: 0.5,
          fontSize: 12,
          textAlign: "start",
          display: "flex",
          placeContent: "space-between",
        }}
      >
        {/* {text && (
          <Typography variant="body2" noWrap>
          {text}
          </Typography>
          )} */}
        <Typography variant="caption" color="text.secondary">
          {metadata ?? "Loading..."}
        </Typography>

        {/* <ThemeToggle /> */}
        {/* <MenuListComposition /> */}
        <Typography variant="caption" color="text.secondary">
          CodeWAS Beta | FinnGen
        </Typography>
      </Box>
    </Paper>
  )
}
