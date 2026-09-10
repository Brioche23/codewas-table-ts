import Box from "@mui/material/Box"
import RadioGroup from "@mui/material/RadioGroup"
import Radio from "@mui/material/Radio"
import FormControl from "@mui/material/FormControl"
import FormControlLabel from "@mui/material/FormControlLabel"
import FormLabel from "@mui/material/FormLabel"
import { useColorScheme } from "@mui/material/styles"

import Button from "@mui/material/Button"

import { useState, useRef, useEffect } from "react"
import { DarkMode, LightMode } from "@mui/icons-material"

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
  const { mode, setMode } = useColorScheme()
  const anchorRef = useRef<HTMLButtonElement>(null)

  function handleItemClick(menuMode: "light" | "dark" | "system") {
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
    <Box>
      {mode === "dark" ? (
        <Button
          ref={anchorRef}
          size="small"
          // id="composition-button"
          // aria-controls={open ? "composition-menu" : undefined}
          // aria-expanded={open}
          // aria-haspopup="true"
          onClick={() => handleItemClick("light")}
          sx={{ minWidth: 0 }}
        >
          <DarkMode sx={{ fontSize: 12 }} />
        </Button>
      ) : (
        <Button
          size="small"
          id="composition-button"
          onClick={() => handleItemClick("dark")}
          sx={{ minWidth: 0 }}
        >
          <LightMode sx={{ fontSize: 12 }} />
        </Button>
      )}

      {/* <Popper
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
                    <MenuItem onClick={() => handleItemClick("system")}>Auto</MenuItem>
                    <MenuItem onClick={() => handleItemClick("light")}>Light</MenuItem>
                    <MenuItem onClick={() => handleItemClick("dark")}>Dark</MenuItem>
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper> */}
    </Box>
  )
}
