/* NOBIT DIALOGUE ENGINE
 * Local, rule-based conversation layer. It does not claim to be a language model.
 * Session context only: no personal conversation is written to persistent memory.
 */
(() => {
  "use strict";

  const history = [];
  const normalize = value => String(value || "")
    .toLowerCase().normalize("NFKC")
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[؟?!.,،؛:]/g, " ")
    .replace(/\s+/g, " ").trim();

  const choose = items => items[Math.floor(Math.random() * items.length)];

  function respond(input) {
    const raw = String(input || "").trim();
    const text = normalize(raw);
    if (!text) return null;

    const previousUser = [...history].reverse().find(item => item.role === "user");
    const previousAssistant = [...history].reverse().find(item => item.role === "assistant");
    let reply = null;

    // Greetings
    if (/^(مرحبا|السلام عليكم|سلام|هلا|اهلا|هاي|hello|hi|hey)( يا)?( نوبيت)?$/.test(text)) {
      reply = choose([
        "أهلاً! كيف ماشي يومك؟",
        "مرحباً، رجعنا للمحادثة. شن عندك اليوم؟",
        "هلا بك. نبدأ من وين؟"
      ]);

    // Everyday check-ins: include common Libyan and Arabic variants.
    } else if (/^(كيف الحال|كيف حالك|كيف حالكم|شن حالك|شن حالك اليوم|شن حوالك|كيفك|كيف امورك|كيف الامور|شن الجو|عامل ايه|عامله ايه|كيف ماشي الحال)$/.test(text)) {
      reply = choose([
        "أنا شغال ومستقر، وهذا أقصى ما تطمح له الأنظمة أحياناً. وإنت كيف حالك؟",
        "حالتي الرقمية مستقرة. الأهم، كيف يومك أنت؟",
        "تمام ضمن حدود كوني برنامجاً. كيف أمورك؟"
      ]);

    } else if (/^(شكرا|تسلم|يسلمو|يعطيك العافيه|بارك الله فيك|thanks|thank you)$/.test(text)) {
      reply = choose(["العفو، نكمل.", "على الرحب والسعة.", "العفو. سجلنا نقطة تعاون ناجحة."]);

    } else if (/^(هههه+|خخخ+|لول+|lmao|lol|😂+|😭+)$/.test(text)) {
      reply = choose(["واضح أن الموضوع ضحّكك. كمل، نسمع.", "وصلتني الضحكة. شن اللي صار؟", "يبدو أن عندنا موقف يستحق الضحك."]);

    } else if (/^(تفو+|اف+|اوف+|يا ساتر|يا لطيف|ugh+)$/.test(text)) {
      reply = choose([
        "واضح إن في شيء نرفزك. شن صار؟",
        "أوف، شكلها مش عاجبتك الحكاية.",
        "وصلني التأفف. نراجع اللي صار بدل ما نخمن."
      ]);

    } else if (/^(تمام|تم|اوكي|اوك|ماشي|حلو|ممتاز|جميل|كويس|يس|yes|okay|ok)$/.test(text)) {
      reply = choose(["تمام، نكمل على هذا الأساس.", "وصلت. خذينا الخطوة الجاية.", "مفهوم."]);

    } else if (/^(باي|مع السلامه|تصبح على خير|نشوفك|سلام|bye|goodbye)$/.test(text)) {
      reply = choose(["إلى اللقاء. خذ بالك من يومك.", "نشوفك لاحقاً.", "تصبح على خير."]);

    } else if (/(من انت|مين انت|شنو انت|شن انت|عرفني بنفسك)/.test(text)) {
      reply = "أنا NOBIT. أعمل حالياً بمحرك محلي يعتمد على قواعد حوار بسيطة واسترجاع المعرفة، وما زلت قيد التطوير.";

    } else if (/(ليش|لماذا|كيف يعني|شن تقصد|ماذا تقصد|وضح اكثر|وضحلي|ما فهمتش|مش فاهم)/.test(text) && previousAssistant) {
      reply = "تقصد الجزء اللي قلته قبل شوي؟ أقدر أوضحه، لكن حدّد لي الكلمة أو الفكرة اللي تقصدها.";

    } else if (/(فرحان|فرحانه|سعيد|سعيده|مبسوط|مبسوطة|هابي|happy)/.test(text)) {
      reply = choose(["حلو. شن أكثر شيء خلّى يومك لطيف؟", "خبر جيد. استمتع باللحظة بدل ما نحولها إلى مشروع تحليل.", "جميل، واضح أن مزاجك مرتاح اليوم."]);

    } else if (/(حزين|حزينه|زعلان|زعلانه|متضايق|متضايقه|مخنوق|مخنوقه|تعبان نفسيا|تعبانه نفسيا)/.test(text)) {
      reply = choose(["واضح أن اليوم ثقيل عليك. تحب تحكي شنو صار، ولا تفضّل نغيّر الموضوع؟", "آسف إنك تمر بشعور مزعج. نقدر ناخذ الموضوع بهدوء، من غير ما نستعجل الحلول.", "أنا أسمعك. شنو أكثر شيء مضايقك الآن؟"]);

    } else if (/(ملل|طفشان|طفشانه|زهقان|زهقانه|bored)/.test(text)) {
      reply = choose(["نقدر نكسر الملل بشيء صغير: فكرة غريبة، لغز، أو موضوع فضولي.", "الملل يحتاج تغيير مسار. نفتح موضوعاً عشوائياً بدل التحديق في الشاشة؟", "خلينا نبدّل الجو. عندك فضول تجاه أي موضوع هذه الأيام؟"]);

    } else if (/(احب|اعشق|يعجبني)/.test(text)) {
      reply = choose(["واضح أن الموضوع له مكان عندك. شنو أكثر شيء يعجبك فيه؟", "حلو، احكي لي شنو اللي شدّك له.", "سجلنا اهتماماً جديداً في سياق المحادثة. شن التفاصيل؟"]);

    } else if (/^(وانت|وانتي|وانت شنو|وانت شرايك)$/.test(text) && previousUser) {
      reply = "ما عنديش تجارب أو حياة شخصية مثل البشر، لكن نقدر نعطيك رأياً تحليلياً مبنياً على اللي قلته.";
    }

    return reply;
  }

  function record(userText, assistantText) {
    if (userText) history.push({role:"user", content:String(userText).slice(0,1000)});
    if (assistantText) history.push({role:"assistant", content:String(assistantText).slice(0,1000)});
    while (history.length > 12) history.shift();
  }

  function clearSession() { history.length = 0; }

  globalThis.NobitDialogue = Object.freeze({ respond, record, clearSession });
})();
