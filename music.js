// NOBIT | Quiet orbital ambience
// توليد موسيقى محيطية إلكترونية هادئة باستخدام Web Audio.

let audioContext = null;
let masterGain = null;
let musicTimer = null;
let musicPlaying = false;
let activeNodes = [];
let noteIndex = 0;

const orbitalNotes = [110.00, 164.81, 220.00, 146.83, 196.00, 246.94, 130.81, 174.61];

function setupAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.12;
  masterGain.connect(audioContext.destination);
}

function makeDrone() {
  const now = audioContext.currentTime;
  [55, 82.41, 110].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    filter.type = "lowpass";
    filter.frequency.value = 420;
    toneGain.gain.value = index === 0 ? 0.10 : 0.045;
    oscillator.connect(filter);
    filter.connect(toneGain);
    toneGain.connect(masterGain);
    oscillator.start(now);
    activeNodes.push(oscillator);
  });
}

function playOrbitalNote(frequency) {
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const toneGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.detune.setValueAtTime(-4, now);
  filter.type = "lowpass";
  filter.frequency.value = 850;

  toneGain.gain.setValueAtTime(0.0001, now);
  toneGain.gain.linearRampToValueAtTime(0.11, now + 1.1);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.8);

  oscillator.connect(filter);
  filter.connect(toneGain);
  toneGain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + 6);
}

function startMusic() {
  setupAudio();
  if (audioContext.state === "suspended") audioContext.resume();
  if (musicPlaying) return;

  musicPlaying = true;
  noteIndex = 0;
  makeDrone();
  playOrbitalNote(orbitalNotes[noteIndex++]);

  musicTimer = setInterval(() => {
    if (!musicPlaying) return;
    playOrbitalNote(orbitalNotes[noteIndex]);
    noteIndex = (noteIndex + 1) % orbitalNotes.length;
  }, 3600);
}

function stopMusic() {
  musicPlaying = false;
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (audioContext && masterGain) {
    const now = audioContext.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(0, now, 0.18);
    const nodes = activeNodes.slice();
    activeNodes = [];
    setTimeout(() => {
      nodes.forEach(node => {
        try { node.stop(); node.disconnect(); } catch {}
      });
      if (audioContext && masterGain) {
        masterGain.gain.setValueAtTime(0.12, audioContext.currentTime);
      }
    }, 700);
  }
}

function isMusicPlaying() {
  return musicPlaying;
}
