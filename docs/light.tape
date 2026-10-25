# Records the light look with the Claude character, then one quick question, for the README.
#
#   vhs docs/light.tape   # run from the repo root; writes docs/light.gif
#
# Calls the model, so it differs a little on every run. It changes your Pixpal settings; the
# last lines put them back. Claude Code's own theme is not touched: set it to a light one
# (/theme) before recording, or its text will be hard to read on the light background.
# Same requirements as docs/demo.tape.

Output docs/light.gif

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 640
Set Padding 24
Set Theme "Catppuccin Latte"
Set TypingSpeed 50ms

Hide
Type "claude"
Enter
Sleep 8s
Show

Type "/pixpal theme light"
Sleep 500ms
Enter
Sleep 3s

Type "/pixpal skin claude"
Sleep 500ms
Enter
Sleep 3s

# One quick question, no tools needed.
Type "What does 2 + 2 equal?"
Sleep 1s
Enter
Sleep 10s

# Put the settings back, off camera.
Hide
Type "/pixpal theme auto"
Enter
Sleep 2s
Type "/pixpal skin robot"
Enter
Sleep 2s
