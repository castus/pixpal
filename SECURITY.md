# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private reporting instead: **Security -> Report a vulnerability** on this repository. You will get an answer within a few days.

## What Pixpal touches

Pixpal runs inside Claude Code and makes no network calls of its own. Text leaves your machine only through Claude Code's own model client, and only when you turn on `/pixpal emotions ai` or choose a language without built-in lines. The README's [Privacy](README.md#privacy) section lists exactly what is sent. On macOS it also runs `defaults read -g AppleInterfaceStyle` to read the system theme.

A report is in scope if Pixpal sends more than that, runs something it should not, or can be made to leak the content of a conversation.

## Supported versions

Only the latest release gets fixes.
