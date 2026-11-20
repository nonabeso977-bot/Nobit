/* NOBIT CENTRAL ENGINE
 * Version 0.1 - orchestration layer for the local web prototype.
 * Safety is checked before memory, dialogue, learning, or any future model.
 * No remote model or Supabase request is made by this engine.
 */
(() => {
  "use strict";

  const FALLBACK = "لا أملك إجابة محلية موثوقة لهذا السؤال.";

  function safetyCheck(message) {
    const safety = globalThis.NobitSafety;
    if (!safety || typeof safety.inspect !== "function") {
      return {
        allowed: false,
        category: "safety_unavailable",
        reply: "طبقة الحماية غير متاحة حالياً. أوقفت المعالجة احتياطياً."
      };
    }
    return safety.inspect(message, { strict: true });
  }

  function resolveLocally(message) {
    // Structured understanding and memory actions come first.
    if (typeof NobitBrain !== "undefined" && typeof NobitBrain.understand === "function") {
      const result = NobitBrain.understand(message);
      if (result && result.reply) {
        return { reply: result.reply, route: result.type || "brain" };
      }
    }

    // Compatibility bridge for the existing memory module.
    if (typeof memoryReply === "function") {
      const reply = memoryReply(message);
      if (reply) return { reply, route: "memory" };
    }

    // Dialogue is a local conversational fallback, not a language model.
    const dialogue = globalThis.NobitDialogue;
    if (dialogue && typeof dialogue.respond === "function") {
      const reply = dialogue.respond(message);
      if (reply) return { reply, route: "dialogue" };
    }

    return { reply: FALLBACK, route: "fallback" };
  }

  function process(message) {
    const input = String(message || "").trim();
    if (!input) return { reply: "", route: "empty", allowed: true };

    try {
      const gate = safetyCheck(input);
      if (!gate.allowed) {
        const reply = gate.reply || "لا أستطيع معالجة هذا الطلب بأمان.";
        globalThis.NobitDialogue?.record?.(input, reply);
        return {
          reply,
          route: "safety",
          category: gate.category || "blocked",
          allowed: false
        };
      }

      const result = resolveLocally(input);
      globalThis.NobitDialogue?.record?.(input, result.reply);

      return {
        reply: result.reply,
        route: result.route,
        allowed: true
      };
    } catch (error) {
      return {
        reply: "توقفت المعالجة بسبب خطأ داخلي. لم يتم إرسال رسالتك إلى نموذج خارجي.",
        route: "engine_error",
        allowed: false
      };
    }
  }

  globalThis.NobitEngine = Object.freeze({
    version: "0.1.0",
    process,
    status() {
      return {
        engine: "local_orchestrator",
        safety: Boolean(globalThis.NobitSafety),
        brain: typeof NobitBrain !== "undefined",
        memory: typeof NobitMemory !== "undefined",
        dialogue: Boolean(globalThis.NobitDialogue),
        learning: Boolean(globalThis.NobitLearning),
        remoteModelEnabled: false
      };
    }
  });
})();
