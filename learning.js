/* NOBIT LEARNING MEMORY
 * Prototype storage: this browser only. Cloud sync requires authenticated backend.
 */
(() => {
  const KEY = "nobitLessonsV1";
  const categories = {
    language: "اللهجة واللغة",
    culture: "الثقافة والعادات",
    geography: "الجغرافيا والأماكن",
    history: "التاريخ",
    custom: "معرفة أخرى"
  };
  const normalize = value => String(value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[.,!?؟،؛:()[\]{}"'«»]/g, " ").replace(/\s+/g, " ").trim();
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value.filter(item => {
        const safety = globalThis.NobitSafety?.inspect(String(item?.title || "") + " " + String(item?.content || ""), { strict: true });
        return !safety || safety.allowed;
      }) : [];
    } catch { return []; }
  };
  const write = lessons => localStorage.setItem(KEY, JSON.stringify(lessons));
  const api = {
    categories,
    all() { return read().sort((a,b) => b.updatedAt - a.updatedAt); },
    teach({title, content, category="custom", source="", confidence="taught"}) {
      const safety = globalThis.NobitSafety?.inspect(String(title || "") + " " + String(content || ""), { strict: true });
      if (safety && !safety.allowed) throw new Error("تعذّر حفظ الدرس لأنه يتضمن محتوى غير آمن.");
      title = String(title || "").trim();
      content = String(content || "").trim();
      if (!title || !content) throw new Error("اكتب عنوان الدرس ومحتواه.");
      if (!categories[category]) category = "custom";
      const lessons = read();
      const lesson = {
        id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : "lesson-" + Date.now() + "-" + Math.random().toString(36).slice(2),
        title, content, category, source: String(source || "").trim(),
        confidence: confidence === "verified" ? "verified" : "taught",
        origin: "developer_teaching", createdAt: Date.now(), updatedAt: Date.now()
      };
      lessons.unshift(lesson);
      write(lessons);
      return lesson;
    },
    update(id, patch) {
      const lessons = read();
      const index = lessons.findIndex(item => item.id === id);
      if (index < 0) return false;
      const next = {...lessons[index], ...patch, id, updatedAt: Date.now(), origin: "developer_teaching"};
      const safety = globalThis.NobitSafety?.inspect(String(next.title || "") + " " + String(next.content || ""), { strict: true });
      if (safety && !safety.allowed) throw new Error("التعديل يحتوي على محتوى لا يمكن حفظه قبل مراجعته.");
      lessons[index] = next;
      write(lessons);
      return true;
    },
    remove(id) { write(read().filter(item => item.id !== id)); },
    clear() { localStorage.removeItem(KEY); },
    search(query) {
      const safety = globalThis.NobitSafety?.inspect(query);
      if (safety && !safety.allowed) return [];
      const q = normalize(query);
      if (!q) return [];
      const terms = q.split(" ").filter(word => word.length > 1);
      return read().map(lesson => {
        const haystack = normalize(lesson.title + " " + lesson.content + " " + lesson.source);
        const hits = terms.filter(term => haystack.includes(term)).length;
        const exact = haystack.includes(q) ? 3 : 0;
        return {lesson, score: hits + exact};
      }).filter(item => item.score > 0).sort((a,b) => b.score - a.score).slice(0,3).map(item => item.lesson);
    },
    export() {
      return JSON.stringify({format:"nobit-lessons", version:1, exportedAt:new Date().toISOString(), lessons:read()}, null, 2);
    },
    import(data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (Array.isArray(parsed?.lessons) && parsed.lessons.some(item => {
        const check = globalThis.NobitSafety?.inspect(String(item?.title || "") + " " + String(item?.content || ""), { strict: true });
        return check && !check.allowed;
      })) throw new Error("ملف الدروس يحتوي على محتوى لا يمكن استيراده قبل مراجعته.");
      if (!parsed || parsed.format !== "nobit-lessons" || !Array.isArray(parsed.lessons)) throw new Error("ملف المعرفة غير صالح.");
      const current = read();
      const ids = new Set(current.map(item => item.id));
      const incoming = parsed.lessons.filter(item => item && typeof item.title === "string" && typeof item.content === "string");
      let added = 0;
      for (const item of incoming) {
        if (ids.has(item.id)) continue;
        current.push({
          id: String(item.id || "import-" + Date.now() + "-" + added),
          title: item.title.slice(0,180), content: item.content.slice(0,12000),
          category: categories[item.category] ? item.category : "custom",
          source: String(item.source || "").slice(0,1000),
          confidence: item.confidence === "verified" ? "verified" : "taught",
          origin: "developer_teaching", createdAt: Number(item.createdAt) || Date.now(),
          updatedAt: Date.now()
        });
        added++;
      }
      write(current);
      return added;
    },
    answer(query) {
      const safety = globalThis.NobitSafety?.inspect(query);
      if (safety && !safety.allowed) return {text: safety.reply, title:"تنبيه سلامة", origin:"طبقة الحماية", category:"السلامة", source:""};
      const matches = api.search(query);
      if (!matches.length) return null;
      const item = matches[0];
      const origin = item.confidence === "verified" ? "معلومة موثقة ضمن سجل نوبيت" : "من درس علّمته المطوّرة لنوبيت";
      return {text: item.content, title:item.title, origin, category:categories[item.category], source:item.source};
    }
  };
  globalThis.NobitLearning = api;
})();
