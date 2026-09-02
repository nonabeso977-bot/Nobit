/* ========================================
   NOBIT BRAIN
   فهم الكلام وربطه بالذاكرة
   ======================================== */

const NobitBrain = {

    understand(text) {

        const original = text.trim();
        const lower = original.toLowerCase();

        /* ========================================
           حفظ الاسم
           ======================================== */

        const namePatterns = [
            /(?:احفظ|تذكر|تذكّر|خلي في بالك|خليه في بالك).*?(?:اسمي|إسمي)\s*(?:هو|هي|:)?\s*(.+)/i,
            /(?:اسمي|إسمي)\s*(?:هو|هي|:)?\s*(.+?)\s*(?:وتذكر|وتذكّر|واحفظ|خليه في بالك|خلي في بالك)/i
        ];

        for (const pattern of namePatterns) {

            const match = original.match(pattern);

            if (match) {

                const name = match[1]
                    .trim()
                    .replace(/[،,.!?؟]+$/g, "");

                if (name) {

                    NobitMemory.save("name", name);

                    return {
                        type: "memory_saved",
                        reply: `تم حفظ اسمك: ${name}.`
                    };

                }
            }
        }


        /* ========================================
           السؤال عن الاسم
           ======================================== */

        const askingName =
            /(?:ما|شن|شو|ايش|إيش)\s+(?:هو\s+)?اسمي/i.test(original) ||
            /(?:تتذكر|تذكّر|تذكر|فاكر)\s+(?:شن|ما|ايش|إيش)?\s*اسمي/i.test(original) ||
            /(?:شن|ما|ايش|إيش)\s+الاسم\s+اللي\s+قلتلك/i.test(original);

        if (askingName) {

            const name = NobitMemory.get("name");

            if (name) {

                return {
                    type: "memory_recall",
                    reply: `اسمك ${name}. إيه، متذكره.`
                };

            }

            return {
                type: "memory_missing",
                reply: "ما عنديش اسم محفوظ لك حاليًا."
            };
        }


        /* ========================================
           حفظ معلومة عامة
           ======================================== */

        const informationMatch = original.match(
            /^(?:احفظ|تذكر|تذكّر)\s+(?:أن|ان)\s+(.+)$/i
        );

        if (informationMatch) {

            const information = informationMatch[1].trim();

            NobitMemory.save(
                "memory_" + Date.now(),
                information
            );

            return {
                type: "memory_saved",
                reply: `تم حفظها في ذاكرتي: ${information}`
            };
        }


        /* ========================================
           لا توجد عملية ذاكرة
           ======================================== */

        return null;
    }
};


/* ========================================
   دالة سهلة يستعملها النظام
   ======================================== */

function brainReply(text) {

    const result = NobitBrain.understand(text);

    if (result) {
        return result.reply;
    }

    return null;
}
