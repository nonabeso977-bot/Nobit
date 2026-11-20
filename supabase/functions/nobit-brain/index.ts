// NOBIT INDEPENDENT KNOWLEDGE ENGINE
// No OpenAI API, model key, or paid AI provider.
// Retrieves public knowledge from Arabic/English Wikipedia and Wikidata.
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

async function wikipediaSearch(query: string, language: "ar" | "en") {
  const endpoint = new URL("https://" + language + ".wikipedia.org/w/api.php");
  endpoint.search = new URLSearchParams({
    action: "query", list: "search", srsearch: query, srlimit: "3",
    format: "json", origin: "*",
  }).toString();
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "NOBIT-Knowledge/1.0 (independent educational project)" },
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
    headers: { "User-Agent": "NOBIT-Knowledge/1.0 (independent educational project)" },
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
    type: "item", limit: "3", format: "json", origin: "*",
  }).toString();
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "NOBIT-Knowledge/1.0 (independent educational project)" },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (Array.isArray(data?.search) ? data.search : []).slice(0, 3).map((item: any) => ({
    title: clean(item.label, 160),
    description: clean(item.description, 300),
    url: "https://www.wikidata.org/wiki/" + encodeURIComponent(clean(item.id, 30)),
  })).filter((item: any) => item.title);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const message = clean(body.message, 1200);
    if (!message) return json({ error: "اكتبي سؤالاً أولاً." }, 400);

    if (/^(مرحبا|مرحباً|السلام عليكم|سلام|هلا|هاي|اهلا|أهلا|كيف حالك|كيفك|شن حالك|شن اخبارك|كيف الأحوال)[؟! .،]*$/i.test(message)) {
      const reply = /كيف حالك|كيفك|شن حالك|شن اخبارك|كيف الأحوال/i.test(message)
        ? "أنا بخير وجاهز للبحث والتعلّم. كيف تسير الأمور عندك؟"
        : "مرحباً! أنا نوبيت. أستطيع البحث في مصادر المعرفة المفتوحة واسترجاع الدروس التي تعلّمينها لي.";
      return json({ reply, sources: [], mode: "conversation" });
    }

    const lessons = Array.isArray(body.lessons) ? body.lessons.slice(0, 50) : [];
    const normalized = message.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
    const terms = normalized.split(/\s+/).filter((word: string) => word.length > 2);
    const lessonMatches = lessons.map((lesson: any) => {
      const text = (clean(lesson.title, 180) + " " + clean(lesson.content, 1200)).toLowerCase()
        .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
      const score = terms.reduce((sum: number, term: string) => sum + (text.includes(term) ? 1 : 0), 0);
      return { lesson, score };
    }).filter((item: any) => item.score > 0).sort((a: any, b: any) => b.score - a.score);

    if (lessonMatches.length && lessonMatches[0].score >= 1) {
      const best = lessonMatches.slice(0, 2).map((item: any) =>
        "• " + clean(item.lesson.title, 180) + ": " + clean(item.lesson.content, 900)
      ).join("\n");
      return json({
        reply: "وجدت هذه المعلومة في الدروس التي علّمتِها لنوبيت:\n" + best,
        sources: [],
        mode: "developer_lessons",
      });
    }

    const query = message.replace(/^(ما هو|ما هي|من هو|من هي|اشرح|حدثني عن|ابحث عن|شن هو|شن هي|من تكون|ما معنى)\s*/i, "").trim() || message;
    let wikiResults = await wikipediaSearch(query, "ar");
    let language: "ar" | "en" = "ar";
    if (!wikiResults.length) {
      wikiResults = await wikipediaSearch(query, "en");
      language = "en";
    }
    const titles = wikiResults.slice(0, 3).map((item: any) => String(item.title));
    const [articles, entities] = await Promise.all([
      wikipediaExtract(titles, language),
      wikidataSearch(query),
    ]);

    const sources = [
      ...articles.map((item: any) => ({ title: "Wikipedia: " + item.title, url: item.url })),
      ...entities.map((item: any) => ({ title: "Wikidata: " + item.title, url: item.url })),
    ].filter((item: any) => /^https:\/\//.test(item.url)).slice(0, 6);

    if (!articles.length && !entities.length) {
      return json({
        reply: "لم أعثر على نتيجة مناسبة في مصادر المعرفة المفتوحة التي أبحث فيها. جرّبي صياغة السؤال باسم أوضح أو بكلمات مختلفة. لن أخمّن الإجابة.",
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
      reply: "وجدت معلومات مرتبطة بسؤالك في مصادر مفتوحة. هذه مقتطفات موثقة وليست استنتاجاً مولّداً؛ اقرئي المصادر المرتبطة للتحقق من التفاصيل.\n\n" + sections.join("\n\n"),
      sources,
      mode: "retrieval",
      language,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "حدث خطأ أثناء البحث في مصادر المعرفة." }, 500);
  }
});
