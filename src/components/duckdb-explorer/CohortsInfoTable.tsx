import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material"
import type { CohortInfoIndex } from "./types"

type CohortsInfoTableProps = {
  cohortsInfo: CohortInfoIndex // optional
}

export function CohortsInfoTable({ cohortsInfo }: CohortsInfoTableProps) {
  return (
    <TableContainer component={Stack}>
      <Table sx={{ minWidth: 250 }} size="small" aria-label="cohorts info table">
        <TableHead>
          <TableRow>
            <TableCell component={"th"}>Name</TableCell>
            <TableCell component={"th"}>Abbr</TableCell>
            <TableCell component={"th"}>Use</TableCell>
            <TableCell component={"th"}>Subjects</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(cohortsInfo).map(([k, i]) => (
            <TableRow key={k} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
              <TableCell>{i.cohortName}</TableCell>
              <TableCell>{i.shortName}</TableCell>
              <TableCell>{i.cohortUse}</TableCell>
              <TableCell align="right">{i.cohortSubjects}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
