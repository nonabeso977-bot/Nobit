/* NOBIT KNOWLEDGE CLIENT
 * Independent retrieval engine: Supabase Edge Function + Wikimedia sources.
 * No OpenAI key, model API, or paid AI provider is used.
 */
(() => {
  const KEY = "nobitAiConfigV1";
  const readConfig = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  };
  const api = {
    config: readConfig,
    isConfigured() {
      const c = readConfig();
      return Boolean(c.projectUrl && c.anonKey);
    },
    saveConfig(projectUrl, anonKey) {
      const url = String(projectUrl || "").trim().replace(/\/+$/, "");
      const key = String(anonKey || "").trim();
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
        throw new Error("رابط مشروع Supabase غير صحيح. استخدمي رابط المشروع الأساسي.");
      }
      if (!key) throw new Error("أضيفي مفتاح anon العام.");
      localStorage.setItem(KEY, JSON.stringify({ projectUrl: url, anonKey: key }));
      return true;
    },
    async chat(message, history = []) {
      const c = readConfig();
      if (!c.projectUrl || !c.anonKey) throw new Error("لم يتم إعداد اتصال Supabase بعد.");
      const lessons = window.NobitLearning ? NobitLearning.all().slice(0, 50) : [];
      const response = await fetch(c.projectUrl + "/functions/v1/nobit-brain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": c.anonKey,
          "Authorization": "Bearer " + c.anonKey
        },
        body: JSON.stringify({
          message: String(message).slice(0, 1200),
          history: history.slice(-6).map(item => ({
            role: item.role === "assistant" ? "assistant" : "user",
            content: String(item.content || "").slice(0, 1000)
          })),
          lessons
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || ("تعذر الاتصال بمحرك المعرفة (" + response.status + ")."));
      if (!data.reply) throw new Error("وصل رد غير مكتمل من محرك معرفة نوبيت.");
      return data;
    }
  };
  globalThis.NobitAI = api;
})();
