import Button from "@mui/material/Button"
import ClickAwayListener from "@mui/material/ClickAwayListener"
import Grow from "@mui/material/Grow"
import Paper from "@mui/material/Paper"
import Popper from "@mui/material/Popper"
import MenuItem from "@mui/material/MenuItem"
import MenuList from "@mui/material/MenuList"
import Stack from "@mui/material/Stack"
import { Download } from "@mui/icons-material"
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  type SyntheticEvent,
} from "react"
import { buildFullSummaryQuery } from "./queryBuilders"
import { mapSummaryRow } from "./rowMappers"
import type { BlockMetricRow, MRT_ColumnFiltersState } from "./types"
import { summaryRowsToTsv, triggerDownload, getSafeDownloadName } from "./utils/utils"
import type { DuckDbDataSource } from "../../utils/types"

interface DownloadMenuProps {
  dataSource: DuckDbDataSource
  countMode: string
  selectedDomain: string
  searchText: string
  columnFilters: MRT_ColumnFiltersState
  exportLoading: boolean
  setExportLoading: Dispatch<SetStateAction<boolean>>
}

export default function DownloadMenu({
  dataSource,
  countMode,
  selectedDomain,
  searchText,
  columnFilters,
  exportLoading,
  setExportLoading,
}: DownloadMenuProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen)
  }

  const handleClose = (event: Event | SyntheticEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return
    }

    setOpen(false)
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "Tab") {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  // return focus to the button when we transitioned from !open -> open
  const prevOpen = useRef(open)
  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current!.focus()
    }

    prevOpen.current = open
  }, [open])

  async function downloadFilteredTsv() {
    setExportLoading(true)
    try {
      const rowsRaw = await dataSource.runQuery(
        buildFullSummaryQuery(countMode, selectedDomain, searchText, columnFilters),
      )
      const tsv = summaryRowsToTsv((rowsRaw as BlockMetricRow[]).map(mapSummaryRow))
      triggerDownload(
        `${getSafeDownloadName(dataSource.sourceLabel).replace(/\.duckdb$/i, "")}_filtered.tsv`,
        tsv,
        "text/tab-separated-values;charset=utf-8",
      )
    } finally {
      setExportLoading(false)
    }
  }

  async function downloadFullTsv() {
    setExportLoading(true)
    try {
      const rowsRaw = await dataSource.runQuery(
        buildFullSummaryQuery(countMode, selectedDomain, searchText, []),
      )
      const tsv = summaryRowsToTsv((rowsRaw as BlockMetricRow[]).map(mapSummaryRow))
      triggerDownload(
        `${getSafeDownloadName(dataSource.sourceLabel).replace(/\.duckdb$/i, "")}_full.tsv`,
        tsv,
        "text/tab-separated-values;charset=utf-8",
      )
    } finally {
      setExportLoading(false)
    }
  }

  function downloadFullDuckDb() {
    triggerDownload(
      getSafeDownloadName(dataSource.sourceLabel),
      dataSource.sourceBytes as Uint8Array<ArrayBuffer>,
      "application/octet-stream",
    )
  }

  return (
    <Stack direction="row" spacing={2} sx={{ zIndex: 999 }}>
      <div>
        <Button
          ref={anchorRef}
          id="composition-button"
          aria-controls={open ? "composition-menu" : undefined}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={handleToggle}
          startIcon={<Download />}
          size="small"
          variant="outlined"
        >
          Download
        </Button>
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          role={undefined}
          placement="bottom-start"
          transition
          // Render into a portal at <body> so the menu escapes the table's
          // overflow:auto / sticky-header containers instead of being clipped.
          disablePortal={false}
          // Sit above MUI modal-level UI (and MRT's sticky toolbar/header) so the
          // portaled menu is never painted behind other content.
          sx={{ zIndex: (theme) => theme.zIndex.modal }}
          modifiers={[
            // Flip to the opposite side when there isn't room below the button.
            { name: "flip", enabled: true },
            // Nudge the menu back inside the viewport instead of overflowing it.
            { name: "preventOverflow", enabled: true, options: { padding: 8 } },
          ]}
        >
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin: placement.startsWith("top") ? "left bottom" : "left top",
              }}
            >
              <Paper>
                <ClickAwayListener onClickAway={handleClose}>
                  <MenuList
                    autoFocusItem={open}
                    id="composition-menu"
                    aria-labelledby="composition-button"
                    onKeyDown={handleListKeyDown}
                  >
                    <MenuItem onClick={downloadFullDuckDb} disabled={exportLoading}>
                      Full DuckDB
                    </MenuItem>
                    <MenuItem onClick={() => void downloadFilteredTsv()} disabled={exportLoading}>
                      Filtered TSV
                    </MenuItem>
                    <MenuItem onClick={() => void downloadFullTsv()} disabled={exportLoading}>
                      Full TSV
                    </MenuItem>
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </div>
    </Stack>
  )
}
