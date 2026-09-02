/* ========================================
   NOBIT MEMORY SYSTEM
   ======================================== */

const NobitMemory = {

    data: {},

    save(key, value) {

        this.data[key] = value;

        localStorage.setItem(
            "nobitMemory",
            JSON.stringify(this.data)
        );

    },

    get(key) {

        return this.data[key];

    },

    remove(key) {

        delete this.data[key];

        localStorage.setItem(
            "nobitMemory",
            JSON.stringify(this.data)
        );

    },

    clear() {

        this.data = {};

        localStorage.removeItem("nobitMemory");

    },

    load() {

        const saved = localStorage.getItem("nobitMemory");

        if (saved) {

            try {

                this.data = JSON.parse(saved);

            } catch {

                this.data = {};

            }

        }

    }

};


/* تشغيل الذاكرة */

NobitMemory.load();



/* ========================================
   MEMORY UNDERSTANDING
   ======================================== */

function memoryReply(text) {

    const originalText = text.trim();
    const lower = originalText.toLowerCase();


    /* ========================================
       حفظ الاسم
       ======================================== */

    if (
        (
            lower.includes("تذكر") ||
            lower.includes("احفظ") ||
            lower.includes("خلي في بالك")
        )
        &&
        lower.includes("اسمي")
    ) {

        const match = originalText.match(
            /(?:اسمي|إسمي)\s+(.+)/i
        );

        if (match) {

            const name = match[1].trim();

            NobitMemory.save("name", name);

            return `تم حفظ المعلومة. اسمك ${name}.`;

        }

    }



    /* ========================================
       سؤال عن الاسم
       ======================================== */

    if (
        lower.includes("ما اسمي") ||
        lower.includes("شن اسمي") ||
        lower.includes("ايش اسمي") ||
        lower.includes("إيش اسمي") ||
        lower.includes("تتذكر اسمي")
    ) {

        const name = NobitMemory.get("name");

        if (name) {

            return `اسمك ${name}. إيه، متذكره.`;

        }

        return "ما عنديش اسم محفوظ لك حاليًا.";

    }



    /* ========================================
       حفظ معلومة عامة
       ======================================== */

    if (
        lower.startsWith("تذكر أن ") ||
        lower.startsWith("تذكر ان ") ||
        lower.startsWith("احفظ أن ") ||
        lower.startsWith("احفظ ان ")
    ) {

        let information = originalText
            .replace(/^تذكر أن\s*/i, "")
            .replace(/^تذكر ان\s*/i, "")
            .replace(/^احفظ أن\s*/i, "")
            .replace(/^احفظ ان\s*/i, "")
            .trim();


        if (information) {

            const key = "memory_" + Date.now();

            NobitMemory.save(key, information);

            return `تم حفظها في ذاكرتي: ${information}`;

        }

    }



    /* ========================================
       لا توجد عملية ذاكرة
       ======================================== */

    return null;

}
