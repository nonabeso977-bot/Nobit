// music.js
// ♡ Nobit Kalimba Music ｡˚✧

let audioContext = null;
let masterGain = null;
let musicTimer = null;
let musicPlaying = false;

let currentNote = 0;


// نغمات كاليمبا هادئة
const kalimbaNotes = [
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    783.99, // G5
    659.25, // E5
    587.33, // D5

    523.25, // C5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    987.77, // B5
    880.00, // A5
    783.99, // G5
    659.25  // E5
];


// إنشاء الصوت
function setupAudio() {

    if (audioContext) return;

    audioContext = new (
        window.AudioContext ||
        window.webkitAudioContext
    )();

    masterGain = audioContext.createGain();

    // صوت مرتفع وواضح
    masterGain.gain.value = 0.75;

    masterGain.connect(audioContext.destination);
}


// نغمة كاليمبا
function playKalimbaNote(frequency) {

    if (!audioContext || !masterGain) return;

    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
        frequency,
        now
    );

    // بداية سريعة مثل رنة الكاليمبا
    gain.gain.setValueAtTime(
        0,
        now
    );

    gain.gain.linearRampToValueAtTime(
        0.42,
        now + 0.015
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 1.8
    );


    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start(now);
    oscillator.stop(now + 1.9);


    // طبقة رنين خفيفة
    const harmonic = audioContext.createOscillator();
    const harmonicGain = audioContext.createGain();

    harmonic.type = "triangle";

    harmonic.frequency.setValueAtTime(
        frequency * 2,
        now
    );

    harmonicGain.gain.setValueAtTime(
        0,
        now
    );

    harmonicGain.gain.linearRampToValueAtTime(
        0.08,
        now + 0.01
    );

    harmonicGain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 1.1
    );

    harmonic.connect(harmonicGain);
    harmonicGain.connect(masterGain);

    harmonic.start(now);
    harmonic.stop(now + 1.2);
}


// خلفية صوتية ناعمة جدًا
function playBackground() {

    if (!audioContext || !masterGain) return;

    const now = audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(
        130.81,
        now
    );

    gain.gain.setValueAtTime(
        0.025,
        now
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start(now);

    // الخلفية تستمر أثناء الموسيقى
    oscillator._nobitBackground = true;
}


// تشغيل الموسيقى
function startMusic() {

    setupAudio();

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    if (musicPlaying) return;

    musicPlaying = true;

    currentNote = 0;

    playBackground();

    // أول نغمة فورًا
    playKalimbaNote(
        kalimbaNotes[currentNote]
    );

    currentNote++;

    // كل 550ms نغمة
    musicTimer = setInterval(() => {

        if (!musicPlaying) return;

        playKalimbaNote(
            kalimbaNotes[currentNote]
        );

        currentNote++;

        if (currentNote >= kalimbaNotes.length) {
            currentNote = 0;
        }

    }, 550);
}


// إيقاف الموسيقى
function stopMusic() {

    musicPlaying = false;

    if (musicTimer) {

        clearInterval(musicTimer);

        musicTimer = null;
    }
}


// السماح لـ index.html بمعرفة حالة الموسيقى
function isMusicPlaying() {

    return musicPlaying;
}