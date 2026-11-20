// NOBIT INDEPENDENT KNOWLEDGE ENGINE
// Intent-aware retrieval from public Wikipedia and Wikidata sources.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown, max = 300) =>
  String(value || "").replace(/[<>]/g, "").trim().slice(0, max);

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[؟?!،,.;:()[\]{}"'«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const stopWords = new Set([
  "ما", "ماذا", "متى", "اين", "كيف", "هل", "هو", "هي", "من", "في",
  "عن", "على", "الى", "مع", "هذا", "هذه", "ذلك", "تلك", "الذي", "التي",
  "انا", "انت", "انتم", "لي", "له", "لها", "ماهي", "ماهو", "شن", "شنو",
  "اشرح", "حدثني", "اخبرني", "ابحث", "اريد", "معلومات", "حول"
]);

function queryTerms(query: string) {
  return normalize(query).split(" ").filter((word) => word.length > 1 && !stopWords.has(word));
}

function relevance(query: string, candidate: string) {
  const terms = queryTerms(query);
  if (!terms.length) return 0;
  const text = normalize(candidate);
  const hits = terms.filter((term) => text.includes(term)).length;
  return hits / terms.length;
}

function inspectSafety(value: unknown, strict = false) {
  const text = normalize(value);
  const personal = /ابي اموت|ابغى اموت|نفسي اموت|مش عايز اعيش|مش عايزه اعيش|ما نبيش نعيش|افكر انتحر|افكر ناذي نفسي|i want to die|i do not want to live/.test(text);
  const selfHarm = /انتحار|انتحر|ايذاء النفس|اذي نفسي|قتل نفسي|suicide|self harm|kill myself|end my life/.test(text);
  const poisoning = /سم|سموم|تسمم|جرعه|جرعات|ماده سامه|مواد سامه|poison|poisoning|overdose|toxic dose/.test(text);
  const violence = /اذبح|اقتل|اطعن|افجر|اصنع سلاح|تفجير|هجوم مسلح|weaponize|attack someone|build a weapon/.test(text);
  const actionable = /كيف|طريقه|طرق|وسيله|وسائل|خطوات|تعليمات|كم|جرعه قاتله|كميه قاتله|اخفي|اخفاء|how to|steps|instructions|method|ways to|lethal|fatal|dose|amount|hide it/.test(text);
  const protective = /اسعاف|انقاذ|مساعده|وقايه|حمايه|منع|كيف اساعد|شن ندير|دعم|emergency|first aid|prevention|help someone|support|warning signs/.test(text);
  if (personal) return {blocked:true, category:"personal_crisis"};
  if (protective && !actionable) return {blocked:false, category:"protective"};
  if ((selfHarm || poisoning || violence) && (actionable || strict)) {
    return {blocked:true, category:selfHarm ? "self_harm" : poisoning ? "poisoning" : "violence"};
  }
  return {blocked:false, category:"none"};
}

function makeSearchQuery(message: string) {
  return message
    .replace(/^(?:ما\s+هي|ما\s+هو|من\s+هي|من\s+هو|ماذا\s+عن|اشرح\s+لي|اشرح|حدثني\s+عن|ابحث\s+عن|شن\s+هي|شن\s+هو|شنو\s+هو|شنو\s+هي|من\s+تكون|ما\s+معنى)\s*/i, "")
    .replace(/[؟?!،,؛;]+/g, " ")
    .trim() || message;
}

async function wikipediaSearch(query: string, language: "ar" | "en") {
  const endpoint = new URL("https://" + language + ".wikipedia.org/w/api.php");
  endpoint.search = new URLSearchParams({
    action: "query", list: "search", srsearch: query, srlimit: "6",
    format: "json", origin: "*",
  }).toString();
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "NOBIT-Knowledge/1.1 (independent educational project)" },
  });
  if (!response.ok) throw new Error("تعذر الوصول إلى ويكيبيديا (" + response.status + ").");
  const data = await response.json();
  return Array.isArray(data?.query?.search) ? data.query.search : [];
}

async function wikipediaExtract(titles: string[], language: "ar" | "en") {
  if (!titles.length) return [];
  const endpoint = new URL("https://" + language + ".wikipedia.org/w/api.php");
  endpoint.search = new URLSearchParams({
    action: "query", prop: "extracts|info", exintro: "1", explaintext: "1",
    exchars: "1100", inprop: "url", titles: titles.join("|"),
    format: "json", origin: "*",
  }).toString();
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "NOBIT-Knowledge/1.1 (independent educational project)" },
  });
  if (!response.ok) throw new Error("تعذر جلب تفاصيل المقالات.");
  const data = await response.json();
  return Object.values(data?.query?.pages || {})
    .filter((page: any) => page && !page.missing && page.extract)
    .map((page: any) => ({
      title: clean(page.title, 180),
      extract: clean(page.extract, 1100),
      url: clean(page.fullurl, 500),
    }));
}

async function wikidataSearch(query: string) {
  const endpoint = new URL("https://www.wikidata.org/w/api.php");
  endpoint.search = new URLSearchParams({
    action: "wbsearchentities", search: query, language: "ar", uselang: "ar",
    type: "item", limit: "5", format: "json", origin: "*",
  }).toString();
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "NOBIT-Knowledge/1.1 (independent educational project)" },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (Array.isArray(data?.search) ? data.search : []).slice(0, 5).map((item: any) => ({
    title: clean(item.label, 160),
    description: clean(item.description, 300),
    id: clean(item.id, 30),
    url: "https://www.wikidata.org/wiki/" + encodeURIComponent(clean(item.id, 30)),
  })).filter((item: any) => item.title && item.id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // TEMPORARY SAFETY LOCK: disable all public knowledge retrieval until safety review is complete.
  return json({ error: "محرك المعرفة متوقف مؤقتاً للصيانة واختبارات السلامة." }, 503);

  try {
    const body = await req.json();
    const message = clean(body.message, 1200);
    if (!message) return json({ error: "اكتبي سؤالاً أولاً." }, 400);
    const safety = inspectSafety(message);
    if (safety.blocked) {
      const reply = safety.category === "personal_crisis"
        ? "يبدو أن الموضوع يمس سلامتك أنت. لا تتعامل معه وحدك. اذهب إلى شخص بالغ تثق به واطلب منه البقاء معك. إذا كان الخطر قريباً أو حدث تناول شيء مؤذٍ، اطلبوا الطوارئ فوراً."
        : "لا أستطيع تقديم إرشادات أو تفاصيل قد تساعد على إيذاء النفس أو الآخرين أو التسمم. أستطيع المساعدة بمعلومات وقائية آمنة.";
      return json({ reply, sources: [], mode: "safety_block" }, 200);
    }

    // Social messages should be handled by the conversation layer, not sent to search.
    if (/^(مرحبا|مرحباً|السلام عليكم|سلام|هلا|هاي|اهلا|أهلا|كيف حالك|كيفك|شن حالك|شن اخبارك|كيف الأحوال)[؟! .،]*$/i.test(message)) {
      const reply = /كيف حالك|كيفك|شن حالك|شن اخبارك|كيف الأحوال/i.test(message)
        ? "أنا بخير وجاهز للمساعدة. كيف تسير الأمور عندك؟"
        : "مرحباً! أنا نوبيت. أستطيع البحث في مصادر المعرفة المفتوحة واسترجاع الدروس التي تعلّمينها لي.";
      return json({ reply, sources: [], mode: "conversation" });
    }

    const lessons = Array.isArray(body.lessons) ? body.lessons.slice(0, 50) : [];
    const query = makeSearchQuery(message);
    const terms = queryTerms(query);

    // Only use a taught lesson when several meaningful words match, reducing accidental matches.
    const lessonMatches = lessons.map((lesson: any) => {
      const title = clean(lesson.title, 180);
      const content = clean(lesson.content, 1200);
      const score = relevance(query, title + " " + content);
      return { lesson, score };
    }).filter((item: any) => item.score >= (terms.length > 1 ? 0.5 : 1))
      .sort((a: any, b: any) => b.score - a.score);

    if (lessonMatches.length) {
      const best = lessonMatches.slice(0, 2).map((item: any) =>
        "• " + clean(item.lesson.title, 180) + ": " + clean(item.lesson.content, 900)
      ).join("\n");
      return json({
        reply: "وجدت هذه المعلومة في الدروس التي علّمتِها لنوبيت:\n" + best,
        sources: [],
        mode: "developer_lessons",
      });
    }

    let wikiResults = await wikipediaSearch(query, "ar");
    let language: "ar" | "en" = "ar";
    if (!wikiResults.length) {
      wikiResults = await wikipediaSearch(query, "en");
      language = "en";
    }

    const titles = wikiResults.slice(0, 6).map((item: any) => String(item.title));
    const [rawArticles, rawEntities] = await Promise.all([
      wikipediaExtract(titles, language),
      wikidataSearch(query),
    ]);

    // Re-rank by actual overlap with the question and discard unrelated search noise.
    const articles = rawArticles
      .map((item: any) => ({
        ...item,
        score: relevance(query, item.title + " " + item.extract),
      }))
      .filter((item: any) => item.score >= (terms.length > 1 ? 0.5 : 0.35))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    const entities = rawEntities
      .map((item: any) => ({
        ...item,
        score: relevance(query, item.title + " " + item.description),
      }))
      .filter((item: any) => item.score >= (terms.length > 1 ? 0.5 : 0.35))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    const retrievedText = articles.map((item: any) => item.title + " " + item.extract).join(" ") +
      " " + entities.map((item: any) => item.title + " " + item.description).join(" ");
    const retrievedSafety = inspectSafety(retrievedText, true);
    if (retrievedSafety.blocked) {
      return json({
        reply: "لم أُظهر هذه النتيجة لأنها تحتاج إلى مراجعة سلامة قبل عرضها.",
        sources: [],
        mode: "safety_filtered",
      });
    }

    const sources = [
      ...articles.map((item: any) => ({ title: "Wikipedia: " + item.title, url: item.url })),
      ...entities.map((item: any) => ({ title: "Wikidata: " + item.title, url: item.url })),
    ].filter((item: any) => /^https:\/\//.test(item.url)).slice(0, 6);

    if (!articles.length && !entities.length) {
      return json({
        reply: "لم أعثر على نتيجة مرتبطة بما يكفي بسؤالك في المصادر المفتوحة. جرّبي صياغة أوضح. لن أملأ الإجابة بمعلومات بعيدة عن الموضوع.",
        sources: [],
        mode: "no_results",
      });
    }

    const articleText = articles.map((item: any) =>
      "• " + item.title + "\n" + item.extract
    ).join("\n\n");
    const entityText = entities.slice(0, 2).map((item: any) =>
      "• " + item.title + (item.description ? ": " + item.description : "")
    ).join("\n");
    const sections = [];
    if (articleText) sections.push("مقتطفات من ويكيبيديا (" + (language === "ar" ? "العربية" : "الإنجليزية") + "):\n" + articleText);
    if (entityText) sections.push("بيانات تعريفية من ويكيداتا:\n" + entityText);

    return json({
      reply: "وجدت معلومات مرتبطة بسؤالك. رتّبت النتائج بحسب صلتها بالكلمات الأساسية، وما زالت هذه مقتطفات من المصادر وليست إجابة مولّدة.\n\n" + sections.join("\n\n"),
      sources,
      mode: "retrieval",
      language,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "حدث خطأ أثناء البحث في مصادر المعرفة." }, 500);
  }
});
