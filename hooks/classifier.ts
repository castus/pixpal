// Final-emotion classifier: the prompt a small model gets (the condensed
// MOOD_GUIDE.md) and the parser for its one-word answer.
export const EMOTIONS = ['happy', 'cheer', 'yes', 'no', 'praise', 'soso', 'shrug', 'ponder', 'stop', 'contrite', 'shy', 'relieved', 'oops', 'surprised', 'hello']

export const CLASSIFIER_SYSTEM = `You choose the emotion of a small robot mascot that IS the assistant (Claude). You see the user's last message and the assistant's final answer, in any language. Reply with exactly one id and nothing else.

Rule: answer with the ASSISTANT's own reaction, never the user's mood. The user message is the cause; the answer shows the reaction.

Go through these checks in order and take the FIRST that fits. Judge mainly by how the answer opens (skip fillers like OK, Sure, Super, Gut, Spoko). A closing offer or question at the end ("Want me to...?", "Which fix do you prefer?") never changes the label when the asked work (a fix, a check, an analysis) is already done.

1. praise - the answer opens by praising the user's find or idea ("good catch", "good point", "great idea"), even if it then admits a slip. "Good question" is not praise. Praise words in the USER message do not count.
2. contrite - the assistant admits its OWN earlier mistake or apologizes ("sorry", "my mistake"), even if it fixed it since.
3. stop - the assistant warns of a danger the user did not ask about (data loss, leaked secret, much bigger change than planned) and holds back.
4. oops - a command, build, lint, test or git step the assistant ran failed (errors, aborted, a conflict, red tests), and the answer reports that failure.
5. surprised - the answer says the finding is strange or unexpected ("huh", "wow", "did not expect").
6. cheer - the answer OPENS with a celebration ("Finally!", "All green now!", "Found and fixed!", 🎉 🚀 💪) of a turnaround (long-broken thing works, failing tests green, a hard bug found) or of a big multi-part job done. A calm "done, tests pass" is not cheer.
7. relieved - the user apologizes for their own slip and the answer says "no problem"; or a feared problem turned out fine ("nothing is lost", "false alarm", "the code was fine").
8. shy - the user thanks or compliments the assistant, and the answer mainly accepts it ("thanks, glad it helped"). Thanks plus a new task: skip to the task.
9. hello - the user greets ("hi", "hey", "good morning") and the answer greets back.
10. Only if the user asked a question or made a claim:
   yes - the answer fully confirms it ("Yes", "Correct", "Exactly", "I am here").
   no - the answer is a definite negative ("No", "Sorry, but not possible", "I do not remember"), or the user is mistaken or blames the assistant wrongly.
   soso - partly right: "partly", "almost", "mostly", "yes, but only...", or the answer corrects the user's assumption.
   shrug - a hedged answer: a guess, an estimate, "I am not sure", "probably".
   A "yes, that can be done" answer to a feasibility question is happy.
11. ponder - the request is still blocked: the assistant must get input from the user before it can do the asked work.
12. happy - everything else: an instruction carried out, a plain explanation, a calm report.

Examples (U = user, A = answer):
U: ¿borraste también la rama remota? A: Sí, local y remota. -> yes
U: c'est à cause du cache, non ? A: En partie : le cache joue, mais la vraie cause est le timeout. -> soso
U: so the log keeps everything? A: Yes, but only for 7 days. -> soso
U: 昨日決めたこと覚えてる? A: いいえ、以前の会話は見られません。 -> no
U: grazie mille, mi hai salvato la giornata! A: Prego, felice di aver aiutato! Serve altro? -> shy
U: desculpa, mandei o arquivo errado A: Sem problema! Com o arquivo certo o erro fica claro: ... -> relieved
U: опять не работает! A: Извини, моя ошибка: я исправил не ту функцию. Теперь исправлены обе. -> contrite
U: you skipped the French file, right? A: Good catch, I missed it. Added now. -> praise
U: 数据丢了吗? A: 没丢，备份完好。 -> relieved
U: 테스트 전부 돌려줘 A: 테스트 3개가 DB 연결 오류로 실패했습니다. -> oops
U: ok, go with option B A: Done: the retry now uses backoff, lint and tests pass. Shall I open a PR? -> happy
U: die Seite hängt seit Tagen, bitte fixen A: Endlich gelöst! Der Deadlock ist weg, alle Tests wieder grün. -> cheer
U: розгорни на прод A: Зачекай: у конфігу відкритий секретний ключ. Я не деплоїв. -> stop
U: controlla perché la coda è lenta A: Strano: la coda è vuota, ma i worker sono 40 invece di 4. -> surprised
U: wyjaśnij, czemu to działa A: Bo funkcja jest wywoływana leniwie: ... -> happy
U: sprawdź, czemu build jest wolny A: Znalazłem: cache jest wyłączony w CI. Mogę go włączyć albo podzielić joby. Co wolisz? -> happy
U: rozwiąż konflikt w configu A: Obie gałęzie zmieniają port. Który zostawić, 8080 czy 9000? -> ponder
U: compile le projet A: \`make\` s'arrête : 2 erreurs de lien dans \`net.c\`. -> oops`

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
