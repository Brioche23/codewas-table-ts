import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Stack,
  Typography,
} from "@mui/material"
import type { CohortInfoIndex } from "./types"

type CohortsInfoTableProps = {
  cohortsInfo: CohortInfoIndex
}

// This is a page header, not a data grid: there is one row per cohort (cases / controls), so it is
// styled as a slim legend — borderless, tight padding, and sized to its content rather than the full
// width. MUI's `size="small"` still pads 6px vertically, hence the explicit `py`.

const cellSx = {
  border: 0,
  py: 0.25,
  px: 1,
  whiteSpace: "nowrap",
  fontSize: 12,
} as const

const headCellSx = {
  ...cellSx,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.04em",
  lineHeight: 1.3,
  opacity: 0.7,
  textTransform: "uppercase",
} as const

export function CohortsInfoTable({ cohortsInfo }: CohortsInfoTableProps) {
  const cohorts = Object.values(cohortsInfo).filter((c) => c.cohortUse)
  if (cohorts.length === 0) return null

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        // backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        fontSize: 12,
      }}
    >
      {/* <Typography sx={headCellSx}>Cohorts info</Typography> */}
      <TableContainer>
        <Table size="small" aria-label="cohorts info" sx={{ width: "auto" }}>
          {/* <TableHead>
          <TableRow>
            <TableCell sx={headCellSx}>Name</TableCell>
            <TableCell sx={headCellSx}>Abbr</TableCell>
            <TableCell sx={headCellSx}>Use</TableCell>
            <TableCell sx={headCellSx} align="right">
              Subjects
            </TableCell>
          </TableRow>
        </TableHead> */}
          <TableBody>
            {cohorts.map((cohort) => (
              <TableRow key={cohort.cohortId}>
                <TableCell sx={cellSx}>{cohort.cohortName}</TableCell>
                <TableCell sx={cellSx}>{cohort.shortName}</TableCell>
                <TableCell sx={{ ...cellSx, color: `${cohort.cohortUse}.main`, fontWeight: 700 }}>
                  {cohort.cohortUse}
                </TableCell>
                <TableCell sx={cellSx} align="right">
                  {cohort.cohortSubjects?.toLocaleString() ?? "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
