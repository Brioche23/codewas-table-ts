import Box from "@mui/material/Box"
import RadioGroup from "@mui/material/RadioGroup"
import Radio from "@mui/material/Radio"
import FormControl from "@mui/material/FormControl"
import FormControlLabel from "@mui/material/FormControlLabel"
import FormLabel from "@mui/material/FormLabel"
import { useColorScheme } from "@mui/material/styles"

import Button from "@mui/material/Button"
import ClickAwayListener from "@mui/material/ClickAwayListener"
import Grow from "@mui/material/Grow"
import Paper from "@mui/material/Paper"
import Popper from "@mui/material/Popper"
import MenuItem from "@mui/material/MenuItem"
import MenuList from "@mui/material/MenuList"
import Stack from "@mui/material/Stack"
import { useState, useRef, type SyntheticEvent, useEffect } from "react"

export function ThemeToggle() {
  const { mode, setMode } = useColorScheme()
  if (!mode) {
    return null
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "text.primary",
        py: 1,
      }}
    >
      <FormControl sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2 }}>
        <FormLabel id="demo-theme-toggle">Theme</FormLabel>
        <RadioGroup
          aria-labelledby="demo-theme-toggle"
          name="theme-toggle"
          row
          value={mode}
          onChange={(event) => setMode(event.target.value as "system" | "light" | "dark")}
        >
          <FormControlLabel value="system" control={<Radio />} label="System" />
          <FormControlLabel value="light" control={<Radio />} label="Light" />
          <FormControlLabel value="dark" control={<Radio />} label="Dark" />
        </RadioGroup>
      </FormControl>
    </Box>
  )
}

export default function MenuListComposition() {
  const [open, setOpen] = useState(false)
  const { setMode } = useColorScheme()
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

  function handleListKeyDown(event: KeyboardEvent) {
    if (event.key === "Tab") {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  function handleItemClick(menuMode: "light" | "dark" | "system" | undefined) {
    setMode(menuMode)
    setOpen(false)
  }

  // return focus to the button when we transitioned from !open -> open
  const prevOpen = useRef(open)
  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current!.focus()
    }

    prevOpen.current = open
  }, [open])

  return (
    <Stack direction="row" spacing={2}>
      <div>
        <Button
          ref={anchorRef}
          size="small"
          id="composition-button"
          aria-controls={open ? "composition-menu" : undefined}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={handleToggle}
        >
          Theme
        </Button>
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          role={undefined}
          placement="bottom-start"
          transition
          disablePortal
        >
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin: placement === "bottom-start" ? "left top" : "left bottom",
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
                    <MenuItem onClick={handleItemClick("system")}>Auto</MenuItem>
                    <MenuItem onClick={handleItemClick("light")}>Light</MenuItem>
                    <MenuItem onClick={handleItemClick("dark")}>Dark</MenuItem>
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
