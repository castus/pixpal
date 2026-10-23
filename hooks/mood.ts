// Pure, instant classifiers that pick a Pixpal scene. They run inside hook
// dispatches, so they must never wait on anything.
//
// Three phases: 1) idle or the person typing, 2) the turn runs and the robot shows what
// it is doing right now (sceneForTool, otherwise thinking), 3) the answer arrives and one
// emotion plays (the classifier, with sceneForExchange as the keyword fallback).
//
// The cue words cover pl, en, de, es, fr, it, pt, uk, ru, ja, zh and ko. They are plain
// substrings of the lowercased text, so a stem ("entschuldig", "извин") covers its forms.
const has = (text: string, words: string[]) => words.some(word => text.includes(word))

const FRUSTRATED = [
  'kurwa', 'cholera', 'wkurw', 'znowu', 'dalej nie', 'nadal nie', 'still not', 'wtf', 'ugh', 'damn', 'again?!', 'again??',
  'schon wieder', 'immer noch nicht', 'verdammt', 'scheiße', 'scheisse', 'otra vez', 'sigue sin', 'toujours pas', 'putain',
  'di nuovo', 'ancora non', 'de novo', 'ainda não', 'опять', 'всё ещё не', 'все еще не', 'досі не', 'まだ動かない', '还是不行', '又坏了', '아직도 안',
]
const SORRY = [
  'sorry', 'przepraszam', 'mój błąd', 'moj blad', 'my bad', 'entschuldig', 'mein fehler', 'perdón', 'perdon', 'lo siento', 'disculpa',
  'désolé', 'desole', 'scusa', 'desculp', 'извини', 'простите', 'вибач', 'пробач', 'すみません', 'ごめん', '抱歉', '对不起', '不好意思', '죄송', '미안',
]
const THANKS = [
  'dzięki', 'dzieki', 'dziękuję', 'dziekuje', 'thanks', 'thank you', 'thx', 'danke', 'vielen dank', 'gracias', 'merci', 'grazie',
  'obrigad', 'спасибо', 'благодарю', 'дякую', 'ありがとう', '谢谢', '多谢', '感谢', '감사', '고마워',
  // a compliment to Claude's work is thanks too
  'świetna robota', 'swietna robota', 'super robota', 'dobra robota', 'great job', 'great work', 'nice work', 'well done', 'gute arbeit',
  'buen trabajo', 'bon travail', 'ottimo lavoro', 'bom trabalho', 'отличная работа', 'чудова робота', '干得好', '수고',
]
// "no thanks" declines an offer; it is not thanks
const DECLINE = /^(no|nie|nein|non|não|нет|ні)[,.!]? *(thanks|thank you|dzięki|dziękuję|danke|gracias|merci|grazie|obrigad|спасибо|дякую)/
const GREETING = /^(cześć|czesc|hej|siema|witaj|dzień dobry|dzien dobry|hello|hi|hiya|hey|good morning|good evening|hallo|moin|servus|guten morgen|guten tag|hola|buenos días|buenos dias|bonjour|salut|ciao|buongiorno|olá|ola|oi|bom dia|привет|здравствуй|добрый день|доброе утро|привіт|вітаю|добрий день|доброго ранку|こんにちは|おはよう|こんばんは|你好|您好|早上好|嗨|안녕하세요|안녕)(?!\p{L})/u
// a greeting decides only when the message is mostly the greeting
const GREETING_WORDS = 5

const isShouting = (text: string) => {
  const letters = [...text].filter(ch => ch.toLowerCase() !== ch.toUpperCase())
  const upper = letters.filter(ch => ch === ch.toUpperCase())

  return letters.length >= 8 && upper.length / letters.length > 0.6
}

// Social cues in the user's message. Only the keyword fallback of the final emotion uses
// them (the classifier reads the message itself); the work phase ignores the prompt.
function socialCue(user: string): string | undefined {
  const lower = user.toLowerCase().trim()
  const isThanks = has(lower, THANKS) && !DECLINE.test(lower)

  if ((user.includes('!!') && !isThanks) || isShouting(user) || has(lower, FRUSTRATED)) {
    return 'contrite'
  }

  if (has(lower, SORRY)) {
    return 'relieved'
  }

  // thanks followed by a new question is a request: the answer to it decides
  if (isThanks && !user.includes('?')) {
    return 'shy'
  }

  return GREETING.test(lower) && lower.split(/\s+/).length <= GREETING_WORDS ? 'hello' : undefined
}

// Words that open many answers but carry no verdict ("OK, ...", "Sure! ...", "No problem.").
// They are cut off before the opening is read.
const FILLER = /^([\s,.!:;—–\-、，。！\uFE0F]+|\p{Extended_Pictographic}+|(ok(ay)?|okej|super|sure|alright|of course|no problem( at all)?|no worries|haha|aww?|gut|alles klar|klar|natürlich|kein problem|spoko|dobra|no dobra|jasne|oczywiście|nie ma sprawy|nie ma problemu|vale|claro|por supuesto|d'accord|bien sûr|va bene|certo|certamente|com certeza|хорошо|ладно|конечно|добре|звісно|звичайно|わかりました|もちろん|好的|当然|알겠습니다|물론)(?=[\s,.!:;—–\-、，。！]|\p{Extended_Pictographic}|$))/u

function openingOf(lower: string): string {
  let text = lower.trimStart()

  for (let match = FILLER.exec(text); match && match[0].length > 0; match = FILLER.exec(text)) {
    text = text.slice(match[0].length)
  }

  return text
}

const STOP = /^(before (i|you|we) |zanim |bevor (ich|du|wir) |(stop|stopp|wait|hold on|careful|warning|important:|uwaga|czekaj|ważne:|wazne:|achtung|vorsicht|warte|moment mal|warnung|¡?alto|¡?cuidado|¡?atención|attention|attends|attenzione|aspetta|atenção|стоп|стой|внимание|осторожно|подожди|увага|обережно|зачекай|待って|ストップ|警告|等等|잠깐|주의|경고)(?!\p{L}))/u
const YES = /^(tak|yes|yep|yeah|owszem|zgadza się|ja|jawohl|genau|richtig|stimmt|exakt|correct|exactly|right|sí|si|exacto|oui|exactement|sì|esatto|sim|exato|да|верно|точно|так|правильно|はい|そうです|是的|对|對|没错|沒錯|네|맞아요|맞습니다)(?=\s*[,.!:;—–\-、，。！]|$)/u
const NO = /^(nie|nein|nope|non|não|nao|нет|ні|いいえ|아니요|아뇨|아니오|不是|没有|不行)(?!\p{L})|^no(?!\p{L})(?! (dobra|tak|to|i|więc|wiec)\b)/u
const PRAISE = [
  'dobry catch', 'good catch', 'nice catch', 'great catch', 'dobra uwaga', 'trafna uwaga', 'słuszna uwaga', 'trafne', 'dobre spostrzeżenie',
  'good point', 'great point', 'świetny pomysł', 'swietny pomysl', 'dobry pomysł', 'super pomysł', 'great idea', 'good idea', 'nice idea',
  'guter fang', 'guter punkt', 'gute idee', 'gute beobachtung', 'buena idea', 'buena observación', 'bien visto', 'bonne idée', 'bonne remarque',
  'bien vu', 'buona idea', 'ottima idea', 'buona osservazione', 'boa ideia', 'boa observação', 'bem visto', 'хорошая идея', 'отличная идея',
  'хорошее замечание', 'верное замечание', 'гарна ідея', 'чудова ідея', 'слушне зауваження', 'гарне зауваження', 'いい指摘', '良い指摘',
  'いいアイデア', '好主意', '说得好', '发现得好', '좋은 지적', '좋은 아이디어', '좋은 생각',
]
// Claude owns a mistake: an apology or "my fault" in the opening
const CONTRITE = [
  'sorry', 'i apologize', 'apologies', 'my mistake', 'my bad', "that's on me", 'that is on me', 'my fault', 'i was wrong',
  'przepraszam', 'mój błąd', 'moj blad', 'moja wina', 'pomyliłem się', 'pomyliłam się', 'źle zrozumiałem',
  'entschuldig', 'tut mir leid', 'mein fehler', 'meine schuld', 'habe mich vertan', 'habe mich geirrt', 'lag ich falsch',
  'perdón', 'lo siento', 'disculpa', 'mi error', 'me equivoqué', 'désolé', 'mon erreur', 'je me suis trompé', 'mi dispiace', 'scusa',
  'errore mio', 'mio errore', 'mi sono sbagliato', 'desculp', 'erro meu', 'me enganei', 'извин', 'прошу прощения', 'моя ошибка', 'я ошибся',
  'вибач', 'перепрошую', 'моя помилка', 'я помилився', 'すみません', '申し訳', 'ごめん', '私のミス', '抱歉', '对不起', '我的错', '죄송', '미안', '제 실수',
]
// "Sorry, but that is not possible" is regret about a fact, not an own mistake
const REGRET = ['sorry, but', 'sorry but', 'tut mir leid, aber', 'leider', 'niestety', 'przepraszam, ale', 'lo siento, pero', 'désolé, mais', 'mi dispiace, ma', 'desculpe, mas', 'к сожалению', 'на жаль']
// a fear or a problem turned out fine
const RELIEF = [
  'false alarm', 'turned out fine', 'nothing is lost', 'nothing was lost', "don't worry", 'phew', 'fałszywy alarm', 'nic nie zginęło',
  'nic się nie stało', 'spokojnie', 'uff,', 'uff.', 'uff!', 'fehlalarm', 'keine sorge', 'nichts verloren', 'falsa alarma', 'no te preocupes', 'fausse alerte',
  'pas de panique', 'falso allarme', 'non preoccuparti', 'alarme falso', 'não se preocupe', 'ложная тревога', 'не переживай', 'не волнуйся',
  'хибна тривога', 'не хвилюйся', 'ご心配なく', '虚惊一场', '别担心', '걱정 마',
]
const SURPRISED = [
  'unexpected', 'surprising', "didn't expect", 'did not expect', 'huh', 'nie spodziewałem', 'nie spodziewałam', 'zaskakując', 'to dziwne',
  'unerwartet', 'überrasch', 'nicht erwartet', 'inesperad', 'sorprend', 'no esperaba', 'inattendu', 'surpren', "je ne m'attendais",
  'inaspettat', 'non mi aspettavo', 'surpreend', 'não esperava', 'неожиданно', 'не ожидал', 'несподівано', 'не очікував', '意外', '予想外',
  '没想到', '出乎意料', '의외', '뜻밖', '예상 밖',
]
// a turnaround or a milestone: something failed before and works now
const CHEER = [
  '🎉', '🚀', '🥳', '💪', '🏆', 'green again', 'finally', 'found and fixed', 'nailed it', 'we did it', 'udało się', 'mamy to',
  'nareszcie', 'znowu zielon', 'wieder grün', 'endlich', 'geschafft', 'gefunden und behoben', 'por fin', 'lo logramos', 'on a réussi',
  "ce l'abbiamo fatta", 'conseguimos', 'наконец', 'нарешті', 'やった', 'ついに', '终于', '搞定了', '드디어', '해냈',
]
// "all green" is routine, unless the user came with something failing: then it is a turnaround
const GREEN = ['all green', 'all tests pass', 'wszystko zielon', 'wszystkie testy przechodz', 'alles grün', 'alle tests grün', 'todo en verde', 'tout est vert', 'tutto verde', 'tudo verde', 'всё зелёное', 'все зелен', 'усе зелен', '全部通过', '全部グリーン']
const FAILING = ['fail', 'broken', 'flaky', 'kaputt', 'sind rot', 'ist rot', 'czerwon', 'padaj', 'nie przechodz', 'falla', 'échou', 'fallisc', 'falha', 'пада', '失败', '失敗', '실패']
// a command or a test Claude ran failed
const OOPS = [
  'failed', 'fails', 'crashed', 'did not pass', "didn't pass", 'exited with', 'nie przeszed', 'nie przeszł', 'padł', 'wywalił', 'wysypał',
  'zakończył się błędem', 'nie powiódł', 'nie udało się', 'не получилось', 'не вийшло', 'fehlgeschlagen', 'schlägt fehl', 'abgestürzt', 'abgebrochen', 'nicht durchgelaufen', 'gescheitert',
  'falló', 'fallaron', 'ha fallado', 'échoué', 'è fallit', 'sono fallit', 'non è riuscit', 'falhou', 'falharam', 'упал', 'не прошл', 'завершился с ошибкой', 'впав', 'не пройш',
  'завершився з помилкою', '失敗しました', 'エラーで', '失败了', '报错', '실패했',
]
// "fixed it, the failing test passes now" is no failure
const FIXED = ['fixed', 'now pass', ' 0 failed', 'behoben', 'korrigiert', 'naprawi', 'poprawi', 'arreglad', 'corrigé', 'corrett', 'corrigid', 'исправ', 'виправ', '修正', '修复', '수정']
const SOSO = [
  'prawie', 'almost', 'nie do końca', 'nie do konca', 'not quite', 'not exactly', 'partially', 'częściowo', 'czesciowo', 'partly', 'mostly',
  'close, but', 'blisko, ale', 'jein', 'teilweise', 'nicht ganz', 'zum teil', 'größtenteils', 'casi', 'en parte', 'no del todo', 'presque',
  'pas tout à fait', 'en partie', 'quasi', 'non del tutto', 'in parte', 'quase', 'em parte', 'não exatamente', 'почти', 'не совсем',
  'частично', 'отчасти', 'майже', 'не зовсім', 'частково', 'ほぼ', '惜しい', '部分的', '差不多', '不完全', '거의', '부분적',
]
// "yes, but ..." takes the yes back in part
const YES_BUT = /^(tak|yes|ja|sí|si|oui|sì|sim|да|так|はい|是的|对|네)[,.!]?\s*(ale|but|aber|pero|mais|ma|mas|но|але|但|でも|하지만)(?!\p{L})/u
const REJECT = [' nie, ', ' nie.', 'actually', 'właściwie', 'wlasciwie', 'niestety', "that's not", 'that is not', 'to nie tak', "you're mistaken", 'you are mistaken', 'mylisz się', 'mylisz sie', 'nieprawda', 'incorrect', 'not correct', 'leider nein', 'leider nicht', 'stimmt nicht', 'du irrst']
// a definite "cannot": a hard limit is a no, not a shrug
const IMPOSSIBLE = [
  "isn't possible", 'is not possible', 'not possible', 'nie da się', 'niemożliwe', 'nicht möglich', 'geht nicht', 'no es posible', 'no se puede',
  "n'est pas possible", 'impossible', 'non è possibile', 'não é possível', 'невозможно', 'нельзя', 'неможливо', 'できません', '不可能', '无法', '불가능',
]
const AGREE = [
  'masz rację', 'masz racje', "you're right", 'you are right', 'exactly', 'dokładnie', 'dokladnie', 'słusznie', 'slusznie', 'trafnie',
  'du hast recht', 'sie haben recht', 'genau so', 'tienes razón', 'tu as raison', 'vous avez raison', 'hai ragione', 'você tem razão',
  'tens razão', 'ты прав', 'вы правы', 'маєш рацію', 'маєте рацію', 'その通り', '你说得对', '您说得对', '맞습니다',
]
// a clear "I do not know"; it may sit anywhere in the answer
const UNSURE = [
  'nie jestem pewien', 'nie jestem pewna', 'not sure', "i'm unsure", 'not certain', 'hard to say', 'nie wiem', "i don't know", 'trudno powiedzieć',
  'nicht sicher', 'schwer zu sagen', 'weiß ich nicht', 'keine ahnung', 'no estoy segur', 'difícil de decir', 'pas sûr', 'difficile à dire',
  'non sono sicur', 'difficile dire', 'não tenho certeza', 'difícil dizer', 'не уверен', 'трудно сказать', 'не впевнен', 'важко сказати',
  'わかりません', '分かりません', '不确定', '很难说', '확실하지', '잘 모르',
]
// a hedge counts only in the opening: these words are common later in an answer
const HEDGE = [
  'probably', 'my guess', 'i guess', 'it seems', 'maybe', 'perhaps', 'chyba', 'raczej', 'zgaduj', 'podejrzewam', 'prawdopodobnie',
  'vermutlich', 'wahrscheinlich', 'vielleicht', 'vermutung', 'quizás', 'tal vez', 'probablemente', 'peut-être', 'probablement', 'forse',
  'probabilmente', 'talvez', 'provavelmente', 'наверное', 'возможно', 'скорее всего', 'мабуть', 'можливо', 'たぶん', 'おそらく', 'かもしれ',
  '可能', '也许', '大概', '아마', '글쎄',
]
// a closing offer ("Want me to...?") is not a question that blocks the work
// "Yes, that can be done" is a plain answer, not a confirmation (MOOD_GUIDE)
const CAN_DO = ['can be done', 'that works', 'it works', 'das geht', 'geht das', 'da się', 'można', 'es posible', 'se puede', "c'est possible", 'si può', 'é possível', 'можно', 'можна', 'できます', '可以', '가능']
// Claude answers thanks or a compliment: "you're welcome", or a thanks with joy
const WELCOME = /^(you're welcome|gern geschehen|gerne?!|nie ma za co|proszę bardzo|de nada|de rien|prego|di nulla|por nada|avec plaisir|con gusto|con piacere|com prazer|с удовольствием|з радістю|не за что|нема за що|どういたしまして|不客气|别客气|천만에요)/u
const THANKED = /^(thanks|thank you|danke|dzięki|dziękuję|gracias|merci|grazie|obrigad|спасибо|дякую|ありがとう|谢谢|감사|고마워)[^.?]{0,40}(!|glad|nice to hear|happy to help|freut mich|miło|cieszę|me alegra|ravi|felice|fico feliz|рад|嬉しい|高兴|기쁘)/u
const OFFER = [
  'want me to', 'shall i', 'should i', 'would you like', 'do you want me', 'let me know', 'soll ich', 'möchtest du', 'willst du', 'sollen wir',
  'chcesz', 'czy mam', 'zrobić', 'mogę', '¿quieres', 'te gustaría', 'veux-tu', 'voulez-vous', 'tu veux', 'vuoi', 'quer que',
  'deseja', 'хочешь', 'хотите', 'хочеш', 'しましょうか', '要我', '需要我', '할까요', '드릴까요',
]

export function sceneForAnswer(answer: string, isAborted: boolean): string {
  if (isAborted) {
    return 'surprised'
  }

  const lower = answer.toLowerCase().trimStart()
  const head = lower.slice(0, 300)
  const rest = openingOf(lower)
  const opening = rest.slice(0, 150)
  const start = opening.slice(0, 80)
  // "Sure, I won't open a PR" agrees first: the "no" after the filler is no verdict
  const negates = NO.test(opening) && !/\p{L}/u.test(lower.slice(0, lower.length - rest.length))
  const tail = lower.trimEnd().slice(-120)
  const asks = /[?？]([\s)"'*_]|$)/u.test(tail) && !has(tail, OFFER)

  // "Before I start: A or B?" waits for the user; without a question it is a warning
  if (STOP.test(opening)) {
    return asks ? 'ponder' : 'stop'
  }

  // the opening decides first: praise, an own mistake, relief, surprise, failure, success
  if (has(lower.slice(0, 80), PRAISE) || has(start, PRAISE)) {
    return 'praise'
  }

  if (has(start, CONTRITE) && !has(start, REGRET)) {
    return 'contrite'
  }

  if (WELCOME.test(opening) || THANKED.test(opening)) {
    return 'shy'
  }

  if (has(start, RELIEF)) {
    return 'relieved'
  }

  if (has(start, SURPRISED)) {
    return 'surprised'
  }

  if (has(opening, OOPS) && !has(opening, FIXED)) {
    return 'oops'
  }

  if (has(opening.slice(0, 100), CHEER)) {
    return 'cheer'
  }

  if (YES_BUT.test(opening) || has(start, SOSO)) {
    return 'soso'
  }

  // "Nein, ..." is a firm no; "Nie jestem pewien" opens with a no but is a shrug
  if (negates && /^[^\s,.!]+[,.!]/u.test(opening)) {
    return 'no'
  }

  if (has(opening.slice(0, 120), UNSURE) || has(start, HEDGE)) {
    return 'shrug'
  }

  if (YES.test(opening)) {
    return has(opening.slice(0, 30), CAN_DO) ? 'happy' : 'yes'
  }

  if (negates || has(opening.slice(0, 120), REJECT) || has(opening.slice(0, 120), IMPOSSIBLE)) {
    return 'no'
  }

  if (has(head, AGREE)) {
    return 'yes'
  }

  if (has(lower.slice(0, 2000), UNSURE)) {
    return 'shrug'
  }

  return asks ? 'ponder' : 'happy'
}

// The keyword fallback of the final emotion: the answer decides, and when it says nothing
// special the user's own words (thanks, an apology, a greeting, frustration) may. A thanks
// or a greeting also wins over a closing question ("Hi! What are we working on?").
export function sceneForExchange(user: string, answer: string, isAborted: boolean): string {
  const scene = sceneForAnswer(answer, isAborted)
  const cue = socialCue(user)

  if (scene === 'happy' && has(openingOf(answer.toLowerCase()).slice(0, 100), GREEN) && has(user.toLowerCase(), FAILING)) {
    return 'cheer'
  }

  if (scene === 'happy') {
    return cue ?? 'happy'
  }

  return scene === 'ponder' && (cue === 'shy' || cue === 'hello') ? cue : scene
}

// Tool groups, each with the scene that shows Claude using them (see MOOD_GUIDE.md).
const TOOL_SCENES: Record<string, string[]> = {
  read: ['Read', 'ReadMcpResourceTool', 'ReadMcpResourceDirTool', 'ListMcpResourcesTool', 'LSP', 'WebFetch', 'FetchInboxMessage'],
  lens: ['WebSearch', 'ToolSearch', 'SearchSkills', 'SearchPlugins', 'SearchMcpRegistry', 'ListSkills', 'ListPlugins', 'ListAgents', 'ListConnectors', 'SuggestSkills', 'SuggestPluginInstall', 'SuggestConnectors'],
  idea: ['Skill'],
  type: ['Edit', 'Write', 'NotebookEdit', 'Monitor'],
  // a subagent or a workflow runs: the robot hands work around
  juggle: ['Agent', 'Workflow'],
  plan: ['TodoWrite', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate', 'GetTask', 'EnterPlanMode', 'ExitPlanMode', 'ProposeGoal'],
  ask: ['AskUserQuestion'],
  clock: ['CronCreate', 'CronDelete', 'CronList', 'ScheduleWakeup', 'RemoteTrigger', 'Poll'],
  send: ['SendFile', 'SendUserFile', 'SendUserMessage', 'SendMessage', 'PublishPlugin', 'ShareOnboardingGuide', 'SendFeedback', 'ReportFindings'],
  bell: ['PushNotification', 'ReadNotifications'],
  paint: ['Artifact', 'ArtifactCheck', 'ArtifactComments', 'ArtifactData', 'DesignSync', 'ClaudeDesign', 'AppifactRepl'],
  door: ['EnterWorktree', 'ExitWorktree'],
}

const SCENE_OF_TOOL = new Map(Object.entries(TOOL_SCENES).flatMap(([scene, tools]) => tools.map(tool => [tool, scene] as const)))

const TEST_COMMAND = /(pytest|jest|vitest|mocha|npm (run )?test|yarn test|pnpm test|go test|cargo test|plugin test|unittest)/
const TEST_SCENES = ['checklist', 'stamp']

export const isTestCommand = (command: string) => TEST_COMMAND.test(command)

// Bash is shown as what the command really does, first match wins. Anything else is
// plain typing of a command.
const COMMAND_SCENES: Array<[scene: string, pattern: RegExp]> = [
  ['git', /\bgit\b/],
  ['send', /\b(curl|wget|http|httpie|nc|ping|dig|nslookup|ssh|scp)\b/],
  ['lens', /\b(grep|rg|ag|ack|find|fd|locate)\b/],
  ['read', /\b(cat|head|tail|less|more|ls|tree|stat|wc|file|du|df|pwd)\b/],
  ['run', /\b(make|npm|pnpm|yarn|docker|kubectl|helm|terraform|pip|pip3|brew|cargo|python3?|node|bun|uv)\b/],
]

export function sceneForCommand(command: string, random: () => number = Math.random): string {
  if (isTestCommand(command)) {
    return TEST_SCENES[Math.floor(random() * TEST_SCENES.length)]!
  }

  return COMMAND_SCENES.find(([, pattern]) => pattern.test(command))?.[0] ?? 'type'
}

// The scene of one running tool; any tool outside the table (an MCP tool, a new built-in)
// gets the general scene.
export const sceneForTool = (tool: string, command = '', random: () => number = Math.random): string =>
  tool === 'Bash' ? sceneForCommand(command, random) : (SCENE_OF_TOOL.get(tool) ?? 'thinking')

type PromptEdit = { text: string; start: number; end: number; inputText: string }

export const draftAfter = (e: PromptEdit) => e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end)

// Rest scene for the moment: night cap after 22:00, coffee on Monday, party hat on Friday.
export function restForDate(date: Date): string {
  const hour = date.getHours()

  if (hour >= 22 || hour < 6) {
    return 'night'
  }

  return date.getDay() === 1 ? 'monday' : date.getDay() === 5 ? 'friday' : 'idle'
}
