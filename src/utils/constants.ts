import type { ColumnsOption } from "./types"

export const COLUMNS_COLORS = { color1: "#ffffff", color2: "#e3e3e3" }

export const COLUMNS: ColumnsOption[] = [
  { key: "t_Binary", label: "Binary" },
  { key: "t_Counts", label: "Counts" },
  { key: "t_AgeFirstEvent", label: "Age at First Event" },
  { key: "t_DaysToFirstEvent", label: "Days to First Event" },
  { key: "t_Continuous", label: "Continuous" },
  { key: "t_Categorical", label: "Categorical" },
] satisfies ColumnsOption[]
