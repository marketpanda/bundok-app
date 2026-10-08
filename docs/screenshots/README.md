# UI screenshots

Desktop views use a 1440 × 1000 viewport; mobile views use 390 × 844.
Page captures show the full page. Destination picker and multi-day form captures
show the viewport so the modal matches what a user sees. The homepage scroll
shell is expanded only for capture so memes and hiking guides are included.

The My Climbs gallery uses the 12 local preview entries, including one unfinished
climb, captured in the default Bagtag layout and the optional Circle layout.
About Us is included at both viewport sizes. The form examples show Paminahawa Ridge and the multi-day date inputs.
The mountain explorer captures focus on Mount Ulap with the region zoom control.

To regenerate against a running preview:

```powershell
$env:SCREENSHOT_ORIGIN = 'http://localhost:3000'
node frontend/scripts/capture-screenshots.cjs <path-to-playwright>
```

The capture script checks horizontal overflow, primary/all catalogue counts,
and restoration of the map camera from a shared URL. Use localhost for a Next.js
dev preview unless its configuration explicitly permits another origin.
