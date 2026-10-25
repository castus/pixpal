# Records a real, short exchange: Pixpal acts out the tools while Claude looks something up,
# shows an emotion when the answer arrives, and reacts to a thank-you, for the README.
#
#   vhs docs/emotions.tape   # run from the repo root; writes docs/emotions.gif
#
# This one calls the model, so it differs a little on every run and takes about a minute.
# The question only needs Grep and Read, which Claude Code runs without asking. Check
# the Sleeps against your own run: the first one must cover the whole answer.
# Same requirements as docs/demo.tape.

Output docs/emotions.gif

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

# Phase 2: while Claude works, Pixpal shows the tool in use (a lens for Grep, a book for Read).
Type "Where are the characters drawn? Answer in one sentence."
Sleep 1s
Enter
Sleep 10s

# Phase 3: the answer is in, Pixpal reacts to it. Thanks make it shy.
Type "thanks, nice!"
Sleep 1s
Enter
Sleep 10s
