# Records Pixpal falling asleep and waking up, for the README.
#
#   brew install vhs        # also installs ttyd and ffmpeg
#   vhs docs/demo.tape      # run from the repo root; writes docs/demo.gif
#
# Needs Claude Code logged in, with Pixpal loaded (see CONTRIBUTING.md) and its choices
# set to what you want on screen (/pixpal skin, /pixpal theme). The folder Claude opens in
# must already be trusted, or the trust dialog lands in the recording.

Output docs/demo.gif

Set Shell "bash"
Set FontSize 18
Set Width 1200
Set Height 640
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 120ms

# Hide stops the recording, not the session. Claude starts and the minute of quiet runs
# unseen (SLEEP_AFTER_MS in hooks/register.tsx counts from the start); Show comes about
# 2 s before Pixpal falls asleep. Tune the first Sleep: it must end ~2 s before the 60 s.
Hide
Type "claude"
Enter
Sleep 58s
Show

# Two seconds awake, then Pixpal falls asleep and stays asleep for a while.
Sleep 14s

# Typing wakes it: it peeks over the fence at the prompt.
Type "Wake up, Neo..."
Sleep 5s

# Leave the draft unsent. To see the reaction instead, add `Enter` here and a long `Sleep`.
