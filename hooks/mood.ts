// Pure, instant classifiers that pick a Pixpal scene. They run inside hook
// dispatches, so they must never wait on anything.
//
// Three phases: 1) idle or the person typing, 2) the turn runs and the robot shows what
// it is doing right now (sceneForTool, otherwise thinking), 3) the answer arrives and one
// emotion plays (the classifier, with sceneForExchange as the keyword fallback).
//
// The cue words cover pl, en, de, es, fr, it, pt, uk, ru, ja, zh and ko. A cue matches as
// a whole word ("danke" is not found in "Gedanke"); a trailing '*' marks a stem
// ("entschuldig*", "извин*") that covers its forms. Japanese, Chinese and Korean cues have
// no spaces around them, so they match as plain substrings.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u
const WORD_CHAR = /[\p{L}\p{N}]/u

function cues(words: string[]): RegExp {
  const parts = words.map(word => {
    const isStem = word.endsWith('*')
    const core = isStem ? word.slice(0, -1) : word
    const escaped = core.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    if (CJK.test(core)) {
      return escaped
    }

    const left = WORD_CHAR.test(core[0]!) ? '(?<![\\p{L}\\p{N}])' : ''
    const right = !isStem && WORD_CHAR.test(core.at(-1)!) ? '(?![\\p{L}\\p{N}])' : ''

    return left + escaped + right
  })

  return new RegExp(parts.join('|'), 'u')
}

const has = (text: string, cue: RegExp) => cue.test(text)
// typographic apostrophes are read as plain ones
const normalize = (text: string) => text.toLowerCase().replace(/[’`]/g, "'")

// "still not working": the user tried and it failed again
const STILL_NOT = cues([
  'still not', "still doesn't", "still don't", "still isn't", 'still broken', 'still fail*', 'dalej nie', 'nadal nie', 'wciąż nie', 'ciągle nie',
  'immer noch nicht', 'noch immer nicht', 'immer noch kaputt', 'sigue sin', 'sigue fallando', 'toujours pas',
  'continua a non', 'continua sem', 'всё ещё не', 'все ещё не', 'все еще не', 'до сих пор не', 'досі не', 'все ще не', 'як і раніше не',
  'まだ動かない', 'まだ直って', 'まだダメ', '还是不行', '还是没', '仍然不', '依然不', '아직도 안', '여전히 안',
])
// "again" is plain on its own ("run it again?"); it is frustration only with "!", "??", "?!" or a "not" after it
const AGAIN = /(?<![\p{L}\p{N}])(again|znowu|znów|wieder|otra vez|de nuevo|encore|di nuovo|ancora una volta|de novo|outra vez|опять|снова|знову|又|また|다시|또)[\s,]*(!|！|[?？]{2,}|[?？][!！]|(not|nie|nicht|no|non|pas|não|не|ні|没|不|안)(?![\p{L}\p{N}]))/u
const SORRY = cues([
  'sorry', 'sorki', 'przepraszam', 'wybacz*', 'mój błąd', 'moj blad', 'moja wina', 'my bad', 'my mistake', 'my fault', 'entschuldig*', 'mein fehler',
  'meine schuld', 'perdón', 'perdon', 'lo siento', 'disculp*', 'mi culpa', 'mi error', 'désolé*', 'desole*', 'pardon', 'ma faute', 'mon erreur',
  'scus*', 'colpa mia', 'errore mio', 'desculp*', 'foi mal', 'erro meu', 'извин*', 'прости*', 'моя ошибка', 'моя вина', 'вибач*', 'пробач*',
  'моя помилка', 'すみません', 'ごめん', '申し訳', '抱歉', '对不起', '不好意思', '我的错', '죄송', '미안',
])
const THANKS = cues([
  'dzięk*', 'dziek*', 'thanks', 'thank you', 'thank u', 'thx', 'danke*', 'vielen dank', 'gracias', 'merci', 'grazie', 'obrigad*', 'valeu',
  'спасибо', 'спс', 'благодар*', 'дякую', 'ありがと', '谢谢', '多谢', '感谢', '감사합니다', '감사해요', '감사드', '고마워', '고맙',
  // a compliment to Claude's work is thanks too
  'dobra robota', 'świetna robota', 'swietna robota', 'super robota', 'good job', 'great job', 'nice job', 'great work', 'nice work', 'good work',
  'well done', 'gute arbeit', 'super arbeit', 'buen trabajo', 'gran trabajo', 'bon travail', 'beau travail', 'bien joué', 'ottimo lavoro',
  'bel lavoro', 'bom trabalho', 'ótimo trabalho', 'отличная работа', 'хорошая работа', 'молодец', 'чудова робота', 'гарна робота', 'молодець',
  '干得好', '做得好', '辛苦了', 'お疲れ', '助かり', '수고', '잘했',
])
// thanks with a new task after it ("thanks, now add tests") is a request: the answer decides
const NEXT = cues([
  'now', 'next', 'also', 'teraz', 'jeszcze', 'jetzt', 'nun', 'noch', 'ahora', 'también', 'maintenant', 'aussi', 'ora', 'anche', 'agora', 'também',
  'теперь', 'ещё', 'еще', 'тепер', 'також', '次', 'じゃあ', '接下来', '现在', '再', '이제', '다음', '그리고',
])
// "no thanks" declines an offer; it is not thanks
const DECLINE = /^(no|nie|nein|non|não|нет|ні)[,.!]? *(thanks|thank you|dzięki|dziękuję|danke|gracias|merci|grazie|obrigad|спасибо|дякую)/
// Japanese, Chinese and Korean greetings run straight into the next word, so only the others need a word end
const GREETING = /^((cześć|czesc|hej|siema|witaj|witam|dzień dobry|dzien dobry|dobry wieczór|hello|hi|hiya|hey|good morning|good evening|hallo|moin|servus|guten morgen|guten tag|guten abend|hola|buenas|buenos días|buenos dias|buenas tardes|bonjour|bonsoir|salut|coucou|allo|allô|ciao|buongiorno|buonasera|olá|ola|oi|eae|e aí|bom dia|boa tarde|boa noite|привет|здравствуй|здравствуйте|добрый день|доброе утро|добрый вечер|привіт|вітаю|добрий день|доброго ранку|добрий ранок|добрий вечір)(?![\p{L}\p{N}])|こんにちは|おはよう|こんばんは|やっほ|你好|您好|早上好|晚上好|哈喽|嗨|在吗|안녕|반가|좋은 아침|하이)/u
// a greeting decides only when the message is mostly the greeting
const GREETING_WORDS = 5

// "LEFT JOIN 이랑 INNER JOIN 차이" is no shouting: most of its letters have no case
const isShouting = (text: string) => {
  const letters = [...text].filter(ch => ch.toLowerCase() !== ch.toUpperCase())
  const upper = letters.filter(ch => ch === ch.toUpperCase())

  return letters.length >= 8 && letters.length * 2 >= (text.match(/\p{L}/gu) ?? []).length && upper.length / letters.length > 0.6
}

const isFrustrated = (user: string, lower: string) => isShouting(user) || has(lower, STILL_NOT) || AGAIN.test(lower)

// Social cues in the user's message. Only the keyword fallback of the final emotion uses
// them (the classifier reads the message itself); the work phase ignores the prompt.
function socialCue(user: string): string | undefined {
  const lower = normalize(user).trim()
  const isThanks = has(lower, THANKS) && !DECLINE.test(lower)

  if ((user.includes('!!') && !isThanks) || isFrustrated(user, lower)) {
    return 'contrite'
  }

  if (has(lower, SORRY)) {
    return 'relieved'
  }

  // thanks followed by a new question or task is a request: the answer to it decides
  if (isThanks && !user.includes('?') && !has(lower, NEXT)) {
    return 'shy'
  }

  return GREETING.test(lower) && lower.split(/\s+/).length <= GREETING_WORDS ? 'hello' : undefined
}

// Words that open many answers but carry no verdict ("OK, ...", "Sure! ...", "No problem.").
// They are cut off before the opening is read.
const FILLER = /^([\s,.!:;—–\-、，。！️]+|\p{Extended_Pictographic}+|(ok(ay)?|okej|super|sure|alright|of course|no problem( at all)?|no worries|haha|aww?|gut|alles klar|klar|natürlich|kein problem|spoko|dobra|no dobra|jasne|oczywiście|nie ma sprawy|nie ma problemu|vale|claro|por supuesto|d'accord|bien sûr|va bene|certo|certamente|com certeza|хорошо|ладно|конечно|добре|звісно|звичайно|わかりました|もちろん|好的|当然|알겠습니다|물론)(?=[\s,.!:;—–\-、，。！]|\p{Extended_Pictographic}|$))/u

function openingOf(lower: string): string {
  let text = lower.trimStart()

  for (let match = FILLER.exec(text); match && match[0].length > 0; match = FILLER.exec(text)) {
    text = text.slice(match[0].length)
  }

  return text
}

const STOP = /^[*_]*(before (i|you|we) |zanim |bevor (ich|du|wir) |(stop|stopp|wait|hold on|careful|warning|important|uwaga|czekaj|stój|ostrożnie|ważne|wazne|achtung|vorsicht|warte|moment mal|warnung|wichtig|¡?alto|¡para|¡?espera|¡?cuidado|¡?atención|¡?ojo|importante|attention|attends|halte|prudence|attenzione|aspetta|fermo|ferma|atenção|cuidado|espera|стоп|стой|внимание|осторожно|подожди|важно|увага|обережно|зачекай|стривай|важливо)(?!\p{L})|待って|ストップ|注意|警告|重要|等等|等一下|先别|停[!！]|잠깐|주의|경고|중요)/u
const YES = /^(tak|yes|yep|yeah|owszem|zgadza się|ja|jawohl|genau|richtig|stimmt|exakt|correct|exactly|right|sí|si|exacto|oui|exactement|sì|esatto|sim|exato|да|верно|точно|правильно|はい|そうです|是的|对|對|没错|沒錯|네|맞아요|맞습니다)(?=\s*[,.!:;—–\-、，。！]|$)/u
// "Так" is yes in Ukrainian but "so, ..." in Russian: it counts only in a Ukrainian answer
const UK_YES = /^так(?=\s*[,.!:;—–\-]|$)/u
const UKRAINIAN = /[іїєґ]/u
const NO = /^(nie|nein|nope|non|não|nao|нет|ні)(?!\p{L})|^(いいえ|いや、|아니|不是|不行|不会|不能|不记得|不用|没有)|^no(?!\p{L})(?! (dobra|tak|to|i|więc|wiec)\b)/u
const PRAISE = cues([
  'good catch', 'nice catch', 'great catch', 'good point', 'great point', 'fair point', 'good idea', 'great idea', 'nice idea', 'good call', 'well spotted',
  'good eye', 'sharp eye', 'dobry catch', 'dobra uwaga', 'trafna uwaga', 'słuszna uwaga', 'trafne', 'dobre spostrzeżenie', 'dobre oko', 'dobry pomysł',
  'świetny pomysł', 'swietny pomysl', 'super pomysł', 'guter fang', 'guter punkt', 'guter hinweis', 'gute idee', 'gute beobachtung', 'gut erkannt',
  'gut gesehen', 'buena idea', 'buen punto', 'buena observación', 'buen ojo', 'bien visto', 'bonne idée', 'excellente idée', 'bonne remarque',
  'bonne observation', 'bien vu', 'buona idea', 'ottima idea', 'bella idea', 'buona osservazione', 'ottima osservazione', 'buon punto',
  'boa ideia', 'ótima ideia', 'boa observação', 'bem visto', 'bem observado', 'хорошая идея', 'отличная идея', 'хорошее замечание',
  'верное замечание', 'справедливое замечание', 'гарна ідея', 'чудова ідея', 'слушне зауваження', 'гарне зауваження', 'влучне зауваження',
  '指摘', '良い発想', 'いい発想', '鋭い', 'いいアイデア', '好主意', '说得好', '发现得好', '好发现', '抓得好', '眼尖', '好眼力', '좋은 지적', '좋은 아이디어',
  '좋은 생각', '예리', '잘 잡', '잘 짚',
])
// Claude owns a mistake: an apology or "my fault" in the opening
const CONTRITE = cues([
  'sorry', 'i apologize', 'apologies', 'my mistake', 'my bad', "that's on me", 'that is on me', 'my fault', 'i was wrong', 'i messed up', 'i got it wrong',
  'przepraszam', 'mój błąd', 'moj blad', 'moja wina', 'pomyliłem', 'pomyliłam', 'źle zrozumiałem', 'źle zrozumiałam',
  'entschuldig*', 'tut mir leid', 'mein fehler', 'meine schuld', 'vertan', 'geirrt', 'falsch gelegen',
  'perdón', 'lo siento', 'disculp*', 'mi error', 'mi culpa', 'me equivoqué', 'désolé*', 'mon erreur', 'ma faute', 'je me suis trompé*',
  'mi dispiace', 'scus*', 'errore mio', 'mio errore', 'colpa mia', 'mi sono sbagliat*', 'ho sbagliato', 'desculp*', 'erro meu', 'culpa minha',
  'me enganei', 'errei', 'извин*', 'прошу прощения', 'моя ошибка', 'моя вина', 'я ошиб*', 'виноват*', 'вибач*', 'перепрошую', 'моя помилка',
  'моя провина', 'я помил*', 'すみません', '申し訳', 'ごめん', '私のミス', '私の間違い', '抱歉', '对不起', '我的错', '是我搞错', '죄송', '미안', '제 실수', '제가 잘못',
])
// "Sorry, but that is not possible" is regret about a fact, not an own mistake
const REGRET = cues(['sorry, but', 'sorry but', 'tut mir leid, aber', 'leider', 'niestety', 'przepraszam, ale', 'lo siento, pero', 'désolé, mais', 'mi dispiace, ma', 'desculpe, mas', 'к сожалению', 'на жаль'])
// a fear or a problem turned out fine
const RELIEF = cues([
  'false alarm', 'good news', 'turned out fine', 'nothing is lost', 'nothing was lost', 'nothing broke', "don't worry", 'no harm', 'phew',
  'fałszywy alarm', 'dobra wiadomość', 'nic nie zginęło', 'nic się nie stało', 'spokojnie', 'uff', 'fehlalarm', 'gute nachricht*', 'keine sorge',
  'nichts verloren', 'puh', 'falsa alarma', 'buenas noticias', 'buena noticia', 'no te preocupes', 'menos mal', 'fausse alerte', 'bonne nouvelle',
  'pas de panique', 'ouf', 'falso allarme', 'buone notizie', 'buona notizia', 'non preoccuparti', 'meno male', 'alarme falso', 'boa notícia',
  'boas notícias', 'não se preocupe', 'ainda bem', 'ложная тревога', 'хорошая новость', 'хорошие новости', 'не переживай', 'не волнуйся', 'фух',
  'хибна тривога', 'гарна новина', 'добра новина', 'не хвилюйся', 'ご心配なく', '安心', 'よかった', '虚惊一场', '别担心', '好消息', '放心', '没事', '那就好', '还好',
  '걱정 마', '다행', '휴,',
])
const SURPRISED = cues([
  'unexpected', 'unexpectedly', 'surprising', 'surprisingly', "didn't expect", 'did not expect', 'huh', 'wow', 'whoa', 'strange', 'weird', 'odd',
  'nie spodziewał*', 'zaskakując*', 'zaskocz*', 'dziwne', 'ciekawe', 'unerwartet', 'überrasch*', 'nicht erwartet', 'seltsam', 'merkwürdig',
  'komisch', 'inesperad*', 'sorprend*', 'no esperaba', 'no me lo esperaba', 'vaya', 'qué raro', 'extraño', 'inattendu*', 'surpren*',
  "je ne m'attendais", "je ne m'y attendais", 'étrange', 'bizarre', 'inaspettat*', 'non mi aspettavo', 'strano', 'curioso', 'surpreend*',
  'não esperava', 'estranho', 'неожиданно', 'не ожидал*', 'странно', 'удивительно', 'несподівано', 'не очікував', 'дивно', '意外', '予想外',
  'びっくり', '驚', '没想到', '出乎意料', '奇怪', '惊讶', '의외', '뜻밖', '예상 밖', '놀랐', '놀랍', '이상하네', '이상하게',
])
// a milestone: a hard task is done
const CHEER = cues([
  '🎉', '🥳', '🏆', 'nailed it', 'we did it', 'udało się', 'geschafft', 'lo logramos', 'lo conseguimos', 'on a réussi', "ce l'abbiamo fatta",
  'conseguimos', 'conseguido', 'получилось!', 'вийшло!', 'やった', '搞定了', '해냈',
])
// a rocket or a flexed arm is pride only with an exclamation: "Done! 🚀"
const PROUD = cues(['🚀', '💪'])
// "finally" or "all green" is routine, unless the user came with something failing: then it is a turnaround
const TURNAROUND = cues([
  'finally', 'nareszcie', 'wreszcie', 'endlich', 'por fin', 'enfin', 'finalmente', 'наконец', 'нарешті', 'ついに', 'やっと', '终于', '드디어',
  'green', 'grün*', 'zielon*', 'verde', 'vert', 'verts', 'зелен*', 'зелён*', 'グリーン', '绿', '초록', 'all tests pass*', 'all pass*',
  'wszystkie testy', 'alle tests', 'todos los tests', 'tous les tests', 'tutti i test', 'todos os testes', 'все тесты', 'всі тести',
  '全部通过', '全て通', 'すべて通', '모두 통과', '전부 통과',
])
const FAILING = cues([
  'fail*', 'broken', 'flaky', 'red', 'crash*', 'kaputt', 'rot', 'czerwon*', 'pada*', 'nie przechodz*', 'falla*', 'fallan', 'roj*', 'échou*',
  'rouge*', 'fallisc*', 'ross*', 'falha*', 'vermelh*', 'пада*', 'красн*', 'червон*', '失败', '失敗', '落ち', '红', '실패', '빨간',
])
// a command or a test Claude ran failed
const OOPS = cues([
  'failed', 'fails', 'failing', 'still fail*', 'crashed', 'did not pass', "didn't pass", 'exited with', 'timed out', 'nie przesz*', 'padł*', 'padają', 'wysypał*',
  'zakończył się błędem', 'nie powiód*', 'nie udało się', 'fehlgeschlagen', 'schlägt fehl', 'schlagen fehl', 'abgestürzt', 'abgebrochen',
  'gescheitert', 'falló', 'fallaron', 'ha fallado', 'fallan', 'échoué', 'échoue', 'échouent', 'planté', 'fallit*', 'non è riuscit*', 'falhou',
  'falharam', 'falham', 'deu erro', 'упал*', 'не прош*', 'завершился с ошибкой', 'не получилось', 'впав', 'впали', 'не пройш*',
  'завершився з помилкою', 'не вийшло', '失敗', 'エラーで', '落ちました', '落ちています', '失败', '报错', '出错', '没过', '挂了', '실패',
])
// "fixed it, the failing test passes now" is no failure, unless something still fails
const FIXED = cues([
  'fixed', 'now pass*', '0 failed', 'behoben', 'korrigiert', 'naprawi*', 'poprawi*', 'arreglad*', 'arreglé', 'corrigé*', 'corrett*', 'corrigi*',
  'исправ*', 'виправ*', '修正', '修复', '直しました', '수정',
])
const STILL = cues([
  'still', 'nadal', 'wciąż', 'ciągle', 'dalej', 'immer noch', 'noch immer', 'weiterhin', 'todavía', 'sigue*', 'toujours', 'ancora', 'continua',
  'ainda', 'всё ещё', 'все еще', 'до сих пор', 'досі', 'все ще', 'まだ', '仍', '还是', '依然', '아직', '여전히',
])
const SOSO = cues([
  'almost', 'not quite', 'not exactly', 'not entirely', 'not always', 'partially', 'partly', 'in part', 'more or less', 'sort of', 'kind of', 'close, but',
  'prawie', 'nie do końca', 'nie do konca', 'nie całkiem', 'nie zawsze', 'częściowo', 'czesciowo', 'po części', 'mniej więcej', 'blisko, ale',
  'jein', 'teilweise', 'nicht ganz', 'nicht immer', 'zum teil', 'mehr oder weniger', 'casi', 'en parte', 'parcialmente', 'no del todo',
  'no exactamente', 'no siempre', 'más o menos', 'presque', 'pas tout à fait', 'pas exactement', 'pas toujours', 'en partie', 'partiellement',
  'plus ou moins', 'quasi', 'non del tutto', 'non esattamente', 'non sempre', 'in parte', 'parzialmente', 'più o meno', 'quase', 'em parte',
  'não exatamente', 'não totalmente', 'nem sempre', 'mais ou menos', 'почти', 'не совсем', 'не всегда', 'частично', 'отчасти', 'более или менее',
  'майже', 'не зовсім', 'не завжди', 'частково', 'почасти', 'ほぼ', '惜しい', '部分的', '半分', '一部', '必ずしも', 'だいたい', '差不多', '部分', '不完全',
  '不一定', '一半', '大体', '基本上', '거의', '부분적', '일부', '반쯤', '대부분', '꼭 그렇', '항상 그런',
])
// "yes, but ..." takes the yes back in part
const YES_BUT = /^(tak|yes|ja|sí|si|oui|sì|sim|да|так|はい|是的|对|네)[,.!]?\s*(ale|but|aber|pero|mais|ma|mas|но|але|但|でも|하지만)(?!\p{L})/u
const REJECT = cues([
  ' nie, ', ' nie.', "that's not", 'that is not', "you're mistaken", 'you are mistaken', 'incorrect', 'not correct', 'not true', 'to nie tak', 'mylisz się',
  'mylisz sie', 'nieprawda', 'niestety', 'leider nein', 'leider nicht', 'stimmt nicht', 'du irrst', 'nicht richtig', 'no es así', 'no es correcto',
  'incorrecto', 'te equivocas', "ce n'est pas correct", 'incorrect', 'tu te trompes', 'non è così', 'non è corretto', 'ti sbagli', 'não é assim',
  'não é correto', 'incorreto', 'не так', 'неверно', 'ошибаешься', 'неправильно', 'невірно', 'помиляєшся', 'неправильно', '違います',
  'そうではありません', '不对', '不是这样', '错了', '틀렸', '그렇지 않',
])
// a definite "cannot": a hard limit is a no, not a shrug
const IMPOSSIBLE = cues([
  "isn't possible", 'is not possible', 'not possible', 'nie da się', 'niemożliwe', 'nie można', 'nicht möglich', 'geht nicht',
  'no es posible', 'no se puede', "n'est pas possible", 'impossible', 'non è possibile', 'non si può', 'não é possível', 'não dá', 'невозможно',
  'нельзя', 'неможливо', 'не можна', 'できません', '不可能', '无法', '불가능', '할 수 없',
])
const AGREE = cues([
  "you're right", 'you are right', 'exactly', 'masz rację', 'masz racje', 'dokładnie', 'dokladnie', 'słusznie', 'slusznie', 'trafnie', 'du hast recht',
  'sie haben recht', 'tienes razón', 'tiene razón', 'tu as raison', 'vous avez raison', 'hai ragione', 'ha ragione', 'você tem razão', 'tem razão',
  'tens razão', 'ты прав*', 'вы прав*', 'маєш рацію', 'маєте рацію', 'その通り', 'おっしゃる通り', '你说得对', '您说得对', '没错', '맞습니다', '맞아요', '맞네요',
])
// a clear "I do not know"; it may sit anywhere in the answer
const UNSURE = cues([
  'not sure', "i'm unsure", 'not certain', 'hard to say', "i don't know", "can't say for sure", 'nie jestem pew*', 'nie wiem', 'trudno powiedzieć',
  'trudno stwierdzić', 'nicht sicher', 'schwer zu sagen', 'weiß ich nicht', 'keine ahnung', 'no estoy segur*', 'no lo sé', 'no sé', 'difícil de decir',
  'difícil saber', 'pas sûr', 'je ne sais pas', 'difficile à dire', 'difficile de dire', 'non sono sicur*', 'non lo so', 'non so', 'difficile dire',
  'não tenho certeza', 'não sei', 'difícil dizer', 'не уверен*', 'не знаю', 'трудно сказать', 'сложно сказать', 'не впевнен*', 'не знаю', 'важко сказати',
  'わかりません', '分かりません', '分からない', 'わからない', '確信はない', '確信が持て', 'なんとも言え', '不确定', '不知道', '很难说', '说不准', '不好说', '확실하지', '잘 모르', '모르겠',
])
// a hedge counts only in the opening: these words are common later in an answer
const HEDGE = cues([
  'probably', 'my guess', 'i guess', 'best guess', 'it seems', 'maybe', 'perhaps', 'chyba', 'raczej', 'zgaduj*', 'podejrzewam', 'prawdopodobnie',
  'vermutlich', 'wahrscheinlich', 'vielleicht', 'vermutung', 'quizás', 'quizá', 'tal vez', 'probablemente', 'peut-être', 'probablement', 'forse',
  'probabilmente', 'talvez', 'provavelmente', 'наверное', 'возможно', 'скорее всего', 'мабуть', 'можливо', 'напевно', 'たぶん', 'おそらく', 'かもしれ',
  '可能是', '可能会', '也许', '大概', '아마', '글쎄',
])
// a closing offer ("Want me to...?") is not a question that blocks the work
// "Yes, that can be done" is a plain answer, not a confirmation (MOOD_GUIDE)
const CAN_DO = cues(['can be done', 'that works', 'it works', 'das geht', 'geht das', 'da się', 'można', 'es posible', 'se puede', "c'est possible", 'si può', 'é possível', 'можно', 'можна', 'できます', '可以', '가능'])
// Claude answers thanks or a compliment: "you're welcome", or a thanks with joy
const WELCOME = /^(you're welcome|gern geschehen|gerne?!|nie ma za co|proszę bardzo|de nada|de rien|prego|di nulla|por nada|avec plaisir|con gusto|con piacere|com prazer|с удовольствием|з радістю|не за что|нема за що|どういたしまして|不客气|别客气|천만에요)/u
const THANKED = /^(thanks|thank you|danke|dzięki|dziękuję|gracias|merci|grazie|obrigad|спасибо|дякую|ありがとう|谢谢|감사|고마워)[^.?]{0,40}(!|glad|nice to hear|happy to help|freut mich|miło|cieszę|me alegra|ravi|felice|fico feliz|рад|嬉しい|高兴|기쁘)/u
const OFFER = cues([
  'want me to', 'shall i', 'should i', 'would you like', 'do you want me', 'let me know', 'soll ich', 'möchtest du', 'willst du', 'sollen wir',
  'chcesz', 'czy mam', 'zrobić', 'mogę', '¿quieres', 'quieres que', 'te gustaría', 'veux-tu', 'voulez-vous', 'tu veux', 'vuoi', 'quer que',
  'deseja', 'хочешь', 'хотите', 'хочеш', 'しましょうか', '要我', '需要我', '할까요', '드릴까요',
])

export function sceneForAnswer(answer: string, isAborted: boolean): string {
  if (isAborted) {
    return 'surprised'
  }

  const lower = normalize(answer).trimStart()
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

  if (has(opening, OOPS) && !(has(opening, FIXED) && !has(opening, STILL))) {
    return 'oops'
  }

  const burst = opening.slice(0, 100)

  if (has(burst, CHEER) || (/[!！]/u.test(burst) && (has(burst, PROUD) || has(burst, TURNAROUND)))) {
    return 'cheer'
  }

  if (YES_BUT.test(opening) || has(start, SOSO)) {
    return 'soso'
  }

  // "Nein, ..." is a firm no; "Nie jestem pewien" opens with a no but is a shrug
  if (negates && /^[^\s,.!]+[,.!]/u.test(opening) && !has(opening.slice(0, 40), UNSURE)) {
    return 'no'
  }

  if (has(opening.slice(0, 120), UNSURE) || has(start, HEDGE)) {
    return 'shrug'
  }

  if (YES.test(opening) || (UK_YES.test(opening) && UKRAINIAN.test(lower))) {
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
  const userLower = normalize(user)

  if (scene === 'happy' && has(openingOf(normalize(answer)).slice(0, 100), TURNAROUND) && (has(userLower, FAILING) || isFrustrated(user, userLower))) {
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
