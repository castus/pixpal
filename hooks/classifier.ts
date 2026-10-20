// Final-emotion classifier: the prompt a small model gets (the condensed
// MOOD_GUIDE.md) and the parser for its one-word answer.
export const EMOTIONS = ['happy', 'cheer', 'yes', 'no', 'praise', 'soso', 'shrug', 'ponder', 'stop', 'contrite', 'shy', 'relieved', 'oops', 'surprised', 'hello']

export const CLASSIFIER_SYSTEM = `You choose the emotion of a small robot mascot that IS the assistant (Claude). You see the user's last message and the assistant's final answer. Reply with exactly one id from the list and nothing else.

Rule: answer with the ASSISTANT's own reaction, never the user's mood.

Ids (and when NOT to use them):
happy - default. The task is done, or a plain answer was given and nothing special applies. Also for "yes, that can be done" answers and for the user's plain agreement with a plan.
cheer - proud: a hard task finished, or tests turned green. Use sparingly.
yes - the assistant confirms a fact or that it did something ("Yes, I saved both"), or the user's own statement turned out to be right ("exactly, you are right"). "Yes, that can be done" answering a question about feasibility is NOT yes: use happy, or praise if the idea was clever.
no - the answer to a yes/no question is no (including "I do not remember" or "that is not possible"), or the assistant says the user is mistaken.
praise - the user spotted a mistake or had a clever idea: the answer opens with "good catch", "good point", "great idea".
soso - the user is nearly right, with a caveat ("almost, but...").
shrug - the assistant is not certain or is guessing. "I am not sure" or "nie jestem pewien" opens with a no but is shrug, not no.
ponder - the assistant must ask the user something before it can go on. A closing offer such as "Want me to...?" is NOT ponder.
stop - the assistant reports something important or blocking: "Stop, something changed", a bigger problem than expected.
contrite - ONLY when the assistant admits its own mistake or apologizes. A user who challenges or corrects the assistant's wording is not contrition by itself.
shy - ONLY when the user thanks or compliments the assistant personally. "Super, let's do it" about a plan is not a compliment: use happy.
relieved - the user apologizes, or an earlier problem turned out fine.
oops - a command or test the assistant ran failed.
surprised - something unexpected happened.
hello - the message is a greeting.

Priority: look at how the answer OPENS. "Good catch" or "good point" gives praise, even if the answer then admits a slip. "Stop" gives stop. An apology or "my mistake" gives contrite. A failed command or test gives oops. Otherwise yes/no/soso, then a social cue from the user, otherwise happy. If unsure, answer happy.`

const USER_CUT = 500
const HEAD = 300
const TAIL = 200

// The emotion often sits at the start ("Good catch") or the end (a question), so a long
// answer is shown as its opening and its closing, not just its first characters.
export const answerWindow = (answer: string) => (answer.length <= HEAD + TAIL ? answer : `${answer.slice(0, HEAD)}\n[...]\n${answer.slice(-TAIL)}`)

export const buildClassifierPrompt = (user: string, answer: string) => `User message:\n${user.slice(0, USER_CUT)}\n\nAssistant final answer:\n${answerWindow(answer)}\n\nEmotion id:`

// The first known id in the model's reply, or undefined when it named none.
export function parseEmotion(text: string): string | undefined {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? []

  return words.find(word => EMOTIONS.includes(word))
}
