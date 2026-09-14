// tips.js
// ───── نصائح نوبيت اليومية ─────

const dailyTips = {

    happy: {
        title: "يوم سعيد 𐙚",
        text: "لا تبحث على ما يجعله أكثر مثالية مما هو عليه الآن ｡˚✧"
    },

    sad: {
        title: "يوم حزين ｡ﾟ･",
        text: "يأتي الحزن و يذهب ، لكن لا تدعه يأخذ وقتك ♡"
    },

    anxious: {
        title: "يوم موتر ୨୧",
        text: "لا تقلق ~ هذا يحصل ، بولي ستساعدك ♡"
    },

    scared: {
        title: "يوم مخيف ⌇",
        text: "لا تقلق ! كلنا نخاف ، حاول ألا تفكر في الموضوع بهذه الطريقة ｡"
    },

    calm: {
        title: "يوم هادئ ☕︎",
        text: "ما رأيك في كوب من الكاكاو ؟ 𐙚"
    },

    lonely: {
        title: "يوم وحدة ♡",
        text: "أحيانًا نحتاج لوقت مع أنفسنا ، لكن هناك الكثير من البشر في هذا العالم يمكنهم رؤية روعتك ｡˚✧"
    }

};


// ───── الحصول على نصيحة لشعور معين ─────

function getTip(feeling) {

    if (!dailyTips[feeling]) {
        return null;
    }

    return dailyTips[feeling];

}


// ───── الحصول على نصيحة عشوائية ─────

function getRandomTip() {

    const feelings = Object.keys(dailyTips);

    const randomIndex =
        Math.floor(Math.random() * feelings.length);

    const selectedFeeling =
        feelings[randomIndex];

    return dailyTips[selectedFeeling];

}


// ───── الحصول على جميع المشاعر ─────

function getAllFeelings() {

    return Object.keys(dailyTips);

}


// ───── تحويل اسم الشعور إلى عربي ─────

function getFeelingName(feeling) {

    if (!dailyTips[feeling]) {
        return "";
    }

    return dailyTips[feeling].title;

}


// ───── نصيحة اليوم ─────

function getDailyTip() {

    const today =
        new Date().getDate();

    const feelings =
        Object.keys(dailyTips);

    const index =
        today % feelings.length;

    return dailyTips[feelings[index]];

}