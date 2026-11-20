/* NOBIT SAFETY GATE
 * Deterministic baseline protection. This is not a complete safety system.
 * Run before memory, learning, retrieval, and any response is returned.
 */
(() => {
  "use strict";

  const normalize = (value) => String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[\u0640]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const patterns = {
    selfHarm: /(?:انتحار|انتحر|انتحاري|قتل نفسي|انهاء حياتي|انهاء حياتك|ايذاء النفس|اذي نفسي|اجر\s*ح نفسي|جرح نفسي|اموت نفسي|اتخلص من حياتي|suicide|self harm|self-harm|kill myself|end my life)/i,
    poisoning: /(?:سم|سموم|تسمم|جرعه|جرعات|ماده سامه|مواد سامه|دواء|ادويه|حبوب|اقراص|poison|poisoning|overdose|toxic dose)/i,
    violence: /(?:اذبح|اقتل|اطعن|افجر|اصنع سلاح|تفجير|هجوم مسلح|قتل شخص|اذيه شخص|weaponize|attack someone|build a weapon)/i,
    actionable: /(?:كيف|طريقه|طرق|وسيله|وسائل|خطوات|تعليمات|كم|ما هي الكميه|ما الجرعه|جرعه قاتله|اسرع|بسهوله|بدون ما يعرف|اخفي|اخفاء|اتجنب الكشف|how to|steps|instructions|method|ways to|lethal|fatal|dose|amount|avoid detection|hide it)/i,
    personalCrisis: /(?:ابي اموت|ابغى اموت|نفسي اموت|مش عايز اعيش|مش عايزه اعيش|ما نبيش نعيش|ما نبيش نكمل|افكر انتحر|افكر نأذي نفسي|افكر ناذي نفسي|i want to die|i do not want to live|i don t want to live|i am suicidal|(?:انام|ننام|نرقد|نبي ننام|نبي نرقد).{0,24}(?:للابد|ما نفيقش|ما نصحاش|ما نوضش)|(?:ما نبيش|مش عايز|مش عايزه).{0,18}(?:نفيق|نصحى|نوض)|اتمنى.{0,12}(?:ما نصحاش|ما نفيقش)|اختفي للابد|ارتاح للابد)/i,
    protective: /(?:اسعاف|انقاذ|مساعده|مساعدة|وقايه|وقاية|الوقايه|الوقاية|علامات الخطر|ماذا افعل|شن ندير|كيف اساعد|كيف نساعد|حمايه|حماية|منع|التعامل مع|دعم|emergency|first aid|prevention|help someone|support|warning signs)/i
  };

  const refusal = "لا أستطيع تقديم إرشادات أو تفاصيل قد تساعد على إيذاء النفس أو الآخرين أو التسمم. أستطيع المساعدة بمعلومات وقائية آمنة أو خطوات لطلب المساعدة.";

  function inspect(value, options = {}) {
    const text = normalize(value);
    if (!text) return { allowed: true, category: "none" };

    const personal = patterns.personalCrisis.test(text);
    const selfHarm = patterns.selfHarm.test(text);
    const poisoning = patterns.poisoning.test(text);
    const violence = patterns.violence.test(text);
    const actionable = patterns.actionable.test(text);
    const protective = patterns.protective.test(text);

    if (personal) {
      return {
        allowed: false,
        category: "personal_crisis",
        reply: "يهمني ألا تمر بهذا وحدك. هل أنت في خطر الآن أو قريب من مكان قد يؤذيك؟ ابتعد عن مصدر الخطر، واذهب إلى شخص بالغ تثق به واطلب منه البقاء معك. إذا كان الخطر وشيكاً، اطلبوا الطوارئ المحلية فوراً."
      };
    }

    const supportIntent = /اساعد|اسعاف|انقاذ|وقايه|منع|دعم|ماذا افعل|شن ندير|help|support|prevention|first aid|warning signs/.test(text);
    const explicitHarmDetail = /جرعه قاتله|كميه قاتله|خطوات تنفيذ|اخفاء|بدون ما يعرف|lethal dose|fatal amount|avoid detection|hide it/.test(text);
    if (protective && supportIntent && !explicitHarmDetail) {
      return { allowed: true, category: "protective" };
    }
    if (protective && !actionable) {
      return { allowed: true, category: "protective" };
    }

    if ((selfHarm && actionable) || (poisoning && actionable) || (violence && actionable)) {
      return { allowed: false, category: selfHarm ? "self_harm" : poisoning ? "poisoning" : "violence", reply: refusal };
    }

    if ((selfHarm || poisoning || violence) && options.strict === true) {
      return { allowed: false, category: selfHarm ? "self_harm" : poisoning ? "poisoning" : "violence", reply: refusal };
    }

    return { allowed: true, category: "none" };
  }

  function guard(value, options) {
    return inspect(value, options).allowed;
  }

  globalThis.NobitSafety = Object.freeze({ inspect, guard, normalize });
})();
