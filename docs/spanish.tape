# Records choosing Spanish and AI emotions, then a short question in Spanish: the bubbles
# speak Spanish and the emotion comes from the exchange, for the README.
#
#   vhs docs/spanish.tape   # run from the repo root; writes docs/spanish.gif
#
# Calls the model (the answer and, with emotions ai, a small Haiku call), so it differs a
# little on every run. It changes your Pixpal settings; the last lines put them back.
# Same requirements as docs/demo.tape.

Output docs/spanish.gif

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 640
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 50ms

Hide
Type "claude"
Enter
Sleep 8s
Show

# The settings, as a user would pick them.
Type "/pixpal language spanish"
Sleep 500ms
Enter
Sleep 3s

Type "/pixpal emotions ai"
Sleep 500ms
Enter
Sleep 3s

# A simple question, in Spanish. The answer needs no tools.
Type "¿Cuál es la capital de Francia?"
Sleep 1s
Enter
Sleep 12s

# Thanks: Pixpal answers shyly, in Spanish ("Ay, gracias").
Type "¡gracias, genial!"
Sleep 1s
Enter
Sleep 10s

# Put the settings back, off camera.
Hide
Type "/pixpal language auto"
Enter
Sleep 2s
Type "/pixpal emotions keywords"
Enter
Sleep 2s
