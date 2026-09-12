const GameState = {
  hp: 100,
  savedEsme: null,
  inventory: [],
  flags: {},
  set(key, value) {
    this[key] = value;
    this._save();
  },
  addItem(item) {
    if (!this.inventory.includes(item)) this.inventory.push(item);
    this._save();
  },
  setFlag(name, value) {
    this.flags[name] = value;
    this._save();
  },
  _save() {
    try {
      sessionStorage.setItem('jurassicIsleState', JSON.stringify(this));
    } catch (e) {  }
  },
  _load() {
    try {
      const saved = sessionStorage.getItem('jurassicIsleState');
      if (saved) Object.assign(this, JSON.parse(saved));
    } catch (e) {  }
  }
};
GameState._load();
const titleScreen    = document.getElementById('title-screen');
const chapterCard    = document.getElementById('chapter-card');
const objectiveHint   = document.getElementById('objective-hint');
const envelopeWrap    = document.getElementById('envelope-wrap');
const envelope        = document.getElementById('envelope');
const letterOverlay   = document.getElementById('letter-overlay');
const closeLetterBtn  = document.getElementById('close-letter');
const dialogueBox     = document.getElementById('dialogue-box');
const dialogueText    = document.getElementById('dialogue-text');
const continueArrow   = document.getElementById('continue-indicator');
const speakerName     = document.getElementById('speaker-name');
const speakerPortrait = document.getElementById('speaker-portrait');
const DARIUS_LINE = "Wow, this is gonna be the perfect day.";
let typing = false;
let typeTimer = null;
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
let ringOsc = null, ringGain = null, ringPulse = null;
function startRingBuzz() {
  ensureAudio();
  if (!audioCtx) return;
  stopRingBuzz();
  ringOsc = audioCtx.createOscillator();
  ringGain = audioCtx.createGain();
  ringOsc.type = 'square';
  ringOsc.frequency.value = 210;
  ringGain.gain.value = 0;
  ringOsc.connect(ringGain).connect(audioCtx.destination);
  ringOsc.start();
  let on = false;
  ringPulse = setInterval(() => {
    on = !on;
    ringGain.gain.setTargetAtTime(on ? 0.12 : 0, audioCtx.currentTime, 0.015);
  }, 170);
}
function stopRingBuzz() {
  clearInterval(ringPulse);
  ringPulse = null;
  if (ringOsc) { try { ringOsc.stop(); } catch (e) {} ringOsc.disconnect(); ringOsc = null; }
  if (ringGain) { ringGain.disconnect(); ringGain = null; }
}
let staticSource = null, staticGain = null;
function startStaticNoise() {
  ensureAudio();
  if (!audioCtx) return;
  stopStaticNoise();
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  staticSource = audioCtx.createBufferSource();
  staticSource.buffer = buffer;
  staticSource.loop = true;
  staticGain = audioCtx.createGain();
  staticGain.gain.value = 0.09;
  staticSource.connect(staticGain).connect(audioCtx.destination);
  staticSource.start();
}
function stopStaticNoise() {
  if (staticSource) { try { staticSource.stop(); } catch (e) {} staticSource.disconnect(); staticSource = null; }
  if (staticGain) { staticGain.disconnect(); staticGain = null; }
}
let panicNoiseSource = null, panicNoiseGain = null;
let panicToneOsc = null, panicToneGain = null, panicLFO = null;
let panicBurstTimer = null;
function startPanicTransmission() {
  ensureAudio();
  if (!audioCtx) return;
  stopPanicTransmission();
  const bufferSize = audioCtx.sampleRate * 2;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  panicNoiseSource = audioCtx.createBufferSource();
  panicNoiseSource.buffer = buffer;
  panicNoiseSource.loop = true;
  panicNoiseGain = audioCtx.createGain();
  panicNoiseGain.gain.value = 0.16;
  panicNoiseSource.connect(panicNoiseGain).connect(audioCtx.destination);
  panicNoiseSource.start();
  panicToneOsc = audioCtx.createOscillator();
  panicToneOsc.type = 'sawtooth';
  panicToneOsc.frequency.value = 340;
  panicToneGain = audioCtx.createGain();
  panicToneGain.gain.value = 0.05;
  panicToneOsc.connect(panicToneGain).connect(audioCtx.destination);
  panicToneOsc.start();
  panicLFO = audioCtx.createOscillator();
  panicLFO.frequency.value = 5.5;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 60;
  panicLFO.connect(lfoGain).connect(panicToneOsc.frequency);
  panicLFO.start();
  panicToneOsc._lfo = panicLFO;
  function scheduleBurst() {
    const cutDuration = 60 + Math.random() * 140;
    const nextIn = 220 + Math.random() * 420;
    const now = audioCtx.currentTime;
    panicNoiseGain.gain.setTargetAtTime(0.02, now, 0.01);
    panicToneGain.gain.setTargetAtTime(0.01, now, 0.01);
    setTimeout(() => {
      const t = audioCtx.currentTime;
      panicNoiseGain.gain.setTargetAtTime(0.16, t, 0.01);
      panicToneGain.gain.setTargetAtTime(0.05, t, 0.01);
    }, cutDuration);
    panicBurstTimer = setTimeout(scheduleBurst, nextIn);
  }
  panicBurstTimer = setTimeout(scheduleBurst, 300);
}
function stopPanicTransmission() {
  clearTimeout(panicBurstTimer);
  panicBurstTimer = null;
  if (panicNoiseSource) { try { panicNoiseSource.stop(); } catch (e) {} panicNoiseSource.disconnect(); panicNoiseSource = null; }
  if (panicNoiseGain) { panicNoiseGain.disconnect(); panicNoiseGain = null; }
  if (panicToneOsc) {
    try { panicToneOsc._lfo.stop(); } catch (e) {}
    try { panicToneOsc.stop(); } catch (e) {}
    panicToneOsc.disconnect();
    panicToneOsc = null;
  }
  if (panicToneGain) { panicToneGain.disconnect(); panicToneGain = null; }
}
titleScreen.addEventListener('click', () => {
  ensureAudio();
  chapterCard.style.transition = 'none';
  chapterCard.classList.add('visible');
  void chapterCard.offsetWidth;
  chapterCard.style.transition = '';
  titleScreen.classList.add('hidden');
  updateHUD('Scene 01');
  setTimeout(() => {
    chapterCard.classList.remove('visible');
    setTimeout(showObjective, 600);
  }, 3200);
});
function showObjective() {
  objectiveHint.classList.remove('hidden');
}
envelope.addEventListener('click', openLetter);
function openLetter() {
  envelopeWrap.classList.add('opened');
  envelope.disabled = true;
  objectiveHint.classList.add('hidden');
  letterOverlay.classList.remove('hidden');
}
const journalSearchWrap = document.getElementById('journal-search-wrap');
const papersPile = document.getElementById('papers-pile');
const journalHotspot = document.getElementById('journal-hotspot');
let journalFoundNext = null;
function showJournalSearch(nextBeatId) {
  journalFoundNext = nextBeatId;
  journalSearchWrap.classList.remove('hidden', 'dismissed');
  papersPile.classList.remove('cleared');
  papersPile.disabled = false;
  journalHotspot.classList.add('hidden');
  journalHotspot.disabled = false;
}
papersPile.addEventListener('click', () => {
  papersPile.classList.add('cleared');
  papersPile.disabled = true;
  journalSearchWrap.classList.add('dismissed');
  setTimeout(() => journalHotspot.classList.remove('hidden'), 350);
});
journalHotspot.addEventListener('click', () => {
  journalHotspot.disabled = true;
  journalSearchWrap.classList.add('hidden');
  if (journalFoundNext) goTo(journalFoundNext);
});
closeLetterBtn.addEventListener('click', closeLetter);
function closeLetter() {
  letterOverlay.classList.add('hidden');
  showDialogue(DARIUS_LINE);
}
const dialogueHint = document.getElementById('dialogue-hint');
let dialogueHintDismissed = false;
function showDialogue(line) {
  dialogueBox.classList.remove('hidden');
  typeLine(line);
  if (!dialogueHintDismissed) {
    dialogueHint.classList.remove('hidden');
  }
}
let currentLineText = DARIUS_LINE;
function typeLine(line) {
  currentLineText = line;
  clearTimeout(typeTimer);
  dialogueText.textContent = '';
  continueArrow.style.visibility = 'hidden';
  typing = true;
  let i = 0;
  const speed = 32;
  function step() {
    if (i < line.length) {
      dialogueText.textContent += line.charAt(i);
      i++;
      typeTimer = setTimeout(step, speed);
    } else {
      typing = false;
      continueArrow.style.visibility = 'visible';
    }
  }
  step();
}
dialogueBox.addEventListener('click', () => {
  if (minigameActive) return;
  if (!journalSearchWrap.classList.contains('hidden')) return;
  if (!passwordWallWrap.classList.contains('hidden')) return;
  if (!watchWrap.classList.contains('hidden')) return;
  if (!terminalOverlay.classList.contains('hidden')) return;
  if (!ammoSearchWrap.classList.contains('hidden')) return;
  if (!hijackOverlay.classList.contains('hidden')) return;
  if (!dialogueHintDismissed) {
    dialogueHintDismissed = true;
    dialogueHint.classList.add('hidden');
  }
  if (typing) {
    clearTimeout(typeTimer);
    dialogueText.textContent = currentLineText;
    typing = false;
    continueArrow.style.visibility = 'visible';
    return;
  }
  if (queueActive) {
    if (pendingNext) {
      goTo(pendingNext);
    } else {
      sceneComplete();
    }
    return;
  }
  console.log('Scene 1 complete → load Scene 2');
  loadScene2();
});
const chapterNum      = document.getElementById('chapter-num');
const chapterTitle    = document.getElementById('chapter-title');
const chapterLocation = document.getElementById('chapter-location');
const chapterRole     = document.getElementById('chapter-role');
const bg              = document.getElementById('bg');
const bgFrame         = document.getElementById('bg-frame');
const distortionOverlay = document.getElementById('distortion-overlay');
const jeepSprite      = document.getElementById('jeep-sprite');
const sceneEl         = document.getElementById('scene');
function setDistortion(active) {
  distortionOverlay.classList.toggle('active', !!active);
}
let footstepTimer = null;
function killPinnedMap() {
  if (!mapPinned) return;
  mapOverlay.classList.add('power-dying');
  setTimeout(() => {
    mapPinned = false;
    mapOverlay.classList.add('hidden');
    mapOverlay.classList.remove('power-dying', 'pinned');
  }, 500);
}
function startFootstepShakes(count) {
  stopFootstepShakes();
  killPinnedMap();
  let done = 0;
  function pulse() {
    if (done >= count) return;
    sceneEl.classList.remove('shake-pulse');
    void sceneEl.offsetWidth;
    sceneEl.classList.add('shake-pulse');
    done++;
    footstepTimer = setTimeout(pulse, 1500 + Math.random() * 500);
  }
  pulse();
}
function stopFootstepShakes() {
  clearTimeout(footstepTimer);
  footstepTimer = null;
  sceneEl.classList.remove('shake-pulse');
}
function setDriving(active) {
  jeepSprite.classList.toggle('hidden', !active);
  bg.classList.toggle('drive-pan', !!active);
  if (active) bg.classList.remove('pan');
}
const trexChaseSprite = document.getElementById('trex-chase-sprite');
const trexChaseWrap = document.getElementById('trex-chase-wrap');
const TREX_RUN_FRAMES = [
  'assets/run_08.png', 'assets/run_09.png', 'assets/run_10.png',
  'assets/run_11.png', 'assets/run_12.png', 'assets/run_13.png',
  'assets/run_14.png'
];
let trexRunInterval = null;
let trexFrameIdx = 0;
let trexRoamTimer = null;
function startTrexRoam() {
  stopTrexRoam();
  function roam() {
    const bottomPct = 4 + Math.random() * 26;
    trexChaseWrap.style.bottom = bottomPct + '%';
    trexRoamTimer = setTimeout(roam, 1300 + Math.random() * 1200);
  }
  roam();
}
function stopTrexRoam() {
  clearTimeout(trexRoamTimer);
  trexRoamTimer = null;
}
function setTrexChasing(active) {
  trexChaseWrap.classList.toggle('hidden', !active);
  bg.classList.toggle('chase-pan', !!active);
  if (active) {
    bg.classList.remove('pan');
    trexChaseWrap.style.left = '2%';
  }
  clearTimeout(trexRunInterval);
  trexRunInterval = null;
  if (active) {
    (function cycleFrame() {
      trexFrameIdx = (trexFrameIdx + 1) % TREX_RUN_FRAMES.length;
      trexChaseSprite.src = TREX_RUN_FRAMES[trexFrameIdx];
      trexRunInterval = setTimeout(cycleFrame, 55 + Math.random() * 110);
    })();
  }
}
const chaseFormation = document.getElementById('chase-formation');
const runSprites = ['kira-run', 'darius-run', 'ace-run', 'esme-run'].map(id => document.getElementById(id));
function setChaseFormation(active) {
  chaseFormation.classList.toggle('hidden', !active);
  runSprites.forEach(el => el.classList.toggle('bobbing', active));
  dialogueBox.classList.toggle('chase-top', active);
}
function retreatTrex() {
  clearInterval(threatTimer);
  if (threatKeyHandler) document.removeEventListener('keydown', threatKeyHandler);
  trexChaseWrap.style.transition = 'left 1.4s ease-in, opacity 1.2s ease-in 0.3s, transform 1.4s ease-in';
  trexChaseWrap.style.left = '-40%';
  trexChaseWrap.style.opacity = '0';
  trexChaseWrap.style.transform = 'scaleX(-1) scale(0.6)';
  setTimeout(() => trexChaseWrap.classList.add('hidden'), 1500);
}
function burstSpeed() {
  runSprites.forEach(el => el.classList.add('bursting'));
  setTimeout(() => runSprites.forEach(el => el.classList.remove('bursting')), 1800);
}
function setAceOvertakes(active) {
  document.getElementById('ace-run').classList.toggle('overtaking', active);
  document.getElementById('darius-run').classList.toggle('overtaken', active);
}
function setEsmeTrips(tripped) {
  const esme = document.getElementById('esme-run');
  esme.classList.remove('bobbing', 'saved', 'left-behind');
  if (tripped) {
    esme.classList.add('tripped');
  } else {
    esme.classList.add('bobbing');
  }
}
function resolveEsme(saved) {
  const esme = document.getElementById('esme-run');
  esme.classList.remove('tripped');
  if (saved) {
    esme.classList.add('saved');
  } else {
    esme.classList.add('left-behind');
  }
}
function showGunHandoff() {
  const esme = document.getElementById('esme-run');
  const darius = document.getElementById('darius-run');
  esme.style.transition = 'left 0.7s ease';
  const dRect = darius.getBoundingClientRect();
  const formationRect = chaseFormation.getBoundingClientRect();
  const leftPct = ((dRect.left - formationRect.left) / formationRect.width) * 100 - 6;
  esme.style.left = Math.max(0, leftPct) + '%';
  setTimeout(() => esme.classList.add('bobbing'), 1400);
}
function showCrackedGun() {
  chaseShapeEl.className = 'obstacle-shape gundrop';
  chaseObstacleEl.classList.remove('hidden', 'dodged');
  chaseObstacleEl.style.transition = 'none';
  chaseObstacleEl.style.right = '55%';
  chaseObstacleEl.style.bottom = '5%';
  void chaseObstacleEl.offsetWidth;
  setTimeout(() => {
    chaseObstacleEl.classList.add('hit');
    setTimeout(() => {
      chaseObstacleEl.classList.add('hidden');
      chaseObstacleEl.classList.remove('hit');
    }, 400);
  }, 500);
}
let minigameActive = false;
let chaseDying = false;
const CHASE_RESTART_ID = 's4_10';
const chaseObstacleEl = document.getElementById('chase-obstacle');
const chaseShapeEl = chaseObstacleEl.querySelector('.obstacle-shape');
const dodgePrompt = document.getElementById('dodge-prompt');
const dodgePromptText = document.getElementById('dodge-prompt-text');
const dodgeTimerFill = document.getElementById('dodge-timer-fill');
const threatMeterWrap = document.getElementById('threat-meter-wrap');
const threatBarFill = document.getElementById('threat-bar-fill');
const playerSprite = document.getElementById('darius-run');
const controlsLegend = document.getElementById('controls-legend');
const CHASE_OBSTACLES = [
  { shape: 'log', kind: 'jump' },
  { shape: 'rock', kind: 'jump' },
  { shape: 'wreckage', kind: 'jump' },
  { shape: 'branch', kind: 'dodge' },
  { shape: 'lowbeam', kind: 'hide' }
];
let threatValue = 25;
let threatTimer = null;
let threatKeyHandler = null;
function updateThreatVisuals() {
  threatBarFill.style.width = threatValue + '%';
  const high = threatValue >= 65;
  threatMeterWrap.classList.toggle('high', high);
  const closeness = threatValue / 100;
  trexChaseWrap.style.left = (2 + closeness * 32) + '%';
  const depthScale = 0.85 + closeness * 0.35;
  trexChaseWrap.style.transform = `scaleX(-1) scale(${depthScale.toFixed(2)})`;
}
function adjustThreat(amount) {
  threatValue = Math.max(0, Math.min(100, threatValue + amount));
  updateThreatVisuals();
  if (threatValue >= 100) {
    applyDamage(-8, 'The T-Rex closes the distance');
    trexChaseWrap.classList.add('lunge');
    setTimeout(() => trexChaseWrap.classList.remove('lunge'), 400);
    threatValue = 55;
    updateThreatVisuals();
    if (GameState.hp <= 0) triggerChaseDeath();
  }
}
function startThreatMeter() {
  threatValue = 25;
  updateThreatVisuals();
  threatMeterWrap.classList.remove('hidden');
  clearInterval(threatTimer);
  threatTimer = setInterval(() => {
    adjustThreat(3);
    if (threatValue < 20) applyDamage(1, 'Keeping ahead');
  }, 900);
  threatKeyHandler = (e) => {
    if (e.key.toLowerCase() === 'e') adjustThreat(-5);
  };
  document.addEventListener('keydown', threatKeyHandler);
}
function stopThreatMeter() {
  clearInterval(threatTimer);
  threatTimer = null;
  if (threatKeyHandler) document.removeEventListener('keydown', threatKeyHandler);
  threatKeyHandler = null;
  threatMeterWrap.classList.add('hidden');
  threatMeterWrap.classList.remove('high');
}
function trexSurge(amount) {
  adjustThreat(amount);
}
function showControlsLegend() {
  controlsLegend.classList.remove('hidden', 'small');
  setTimeout(() => controlsLegend.classList.add('small'), 3200);
}
function hideControlsLegend() {
  controlsLegend.classList.add('hidden');
  controlsLegend.classList.remove('small');
}
function playerReact(kind) {
  const cls = kind === 'jump' ? 'player-jump'
            : kind === 'left' ? 'player-dodge-left'
            : kind === 'right' ? 'player-dodge-right'
            : 'player-hide';
  playerSprite.classList.remove('bobbing', 'player-jump', 'player-dodge-left', 'player-dodge-right', 'player-hide');
  void playerSprite.offsetWidth;
  playerSprite.classList.add(cls);
  setTimeout(() => {
    playerSprite.classList.remove(cls);
    playerSprite.classList.add('bobbing');
  }, 500);
}
function triggerChaseDeath(restartId) {
  if (chaseDying) return;
  chaseDying = true;
  stopThreatMeter();
  minigameActive = false;
  dodgePrompt.classList.add('hidden');
  chaseObstacleEl.classList.add('hidden');
  hideControlsLegend();
  bg.style.transition = 'none';
  bg.style.opacity = 0;
  bgFrame.classList.add('blackout');
  currentBg = 'BLACK';
  dialogueBox.classList.remove('hidden', 'chase-top');
  dialogueBox.classList.add('narration');
  typeLine("It catches up. Everything goes dark.");
  setTimeout(() => {
    GameState.set('hp', 60);
    updateHPBar();
    bgFrame.classList.remove('blackout');
    chaseDying = false;
    goTo(restartId || CHASE_RESTART_ID);
  }, 2400);
}
let dodgeStreak = 0;
const streakPopup = document.getElementById('streak-popup');
const STREAK_MESSAGES = ['Nice!', 'Nice!', 'Great!', 'Great!', 'Excellent!', 'Perfect streak!'];
function showStreakPopup(text) {
  streakPopup.textContent = text;
  streakPopup.classList.remove('show');
  void streakPopup.offsetWidth;
  streakPopup.classList.add('show');
}
const obstacleTelegraph = document.getElementById('obstacle-telegraph');
function runChaseMinigame(rounds, hpCostOnFail, next) {
  minigameActive = true;
  choiceBox.classList.add('hidden');
  showControlsLegend();
  startThreatMeter();
  dodgeStreak = 0;
  let round = 0;
  const order = [];
  for (let i = 0; i < rounds; i++) {
    let pick;
    do { pick = CHASE_OBSTACLES[Math.floor(Math.random() * CHASE_OBSTACLES.length)]; }
    while (order.length && pick === order[order.length - 1]);
    order.push(pick);
  }
  function nextRound() {
    if (chaseDying) return;
    if (round >= rounds) {
      hideControlsLegend();
      minigameActive = false;
      goTo(next);
      return;
    }
    const ob = order[round];
    const progress = round / Math.max(1, rounds - 1);
    const travelMs = Math.round(1500 - progress * 650);
    const restMs = Math.round(500 - progress * 280);
    round++;
    obstacleTelegraph.classList.remove('flash');
    void obstacleTelegraph.offsetWidth;
    obstacleTelegraph.classList.add('flash');
    setTimeout(() => spawnObstacle(ob, nextRound, hpCostOnFail, travelMs, restMs), 260);
  }
  nextRound();
}
function spawnObstacle(ob, onDone, hpCostOnFail, travelMs, restMs) {
  const dodgeDir = ob.kind === 'dodge' ? (Math.random() < 0.5 ? 'left' : 'right') : null;
  const dodgeKey = dodgeDir === 'left' ? 'a' : 'd';
  chaseShapeEl.className = 'obstacle-shape ' + ob.shape;
  chaseObstacleEl.classList.remove('hidden', 'hit', 'dodged');
  chaseObstacleEl.style.transition = 'none';
  chaseObstacleEl.style.right = '-14%';
  void chaseObstacleEl.offsetWidth;
  chaseObstacleEl.style.transition = `right ${travelMs}ms linear`;
  chaseObstacleEl.style.right = '68%';
  dodgePromptText.textContent = ob.kind === 'jump' ? 'JUMP! (SPACE / W)'
    : ob.kind === 'hide' ? 'DUCK! (X)'
    : dodgeDir === 'left' ? '◀ DODGE LEFT (A)' : 'DODGE RIGHT (D) ▶';
  dodgePrompt.classList.remove('hidden');
  dodgeTimerFill.style.transition = 'none';
  dodgeTimerFill.style.width = '100%';
  void dodgeTimerFill.offsetWidth;
  dodgeTimerFill.style.transition = `width ${travelMs}ms linear`;
  dodgeTimerFill.style.width = '0%';
  let resolved = false;
  function onKey(e) {
    if (resolved) return;
    const k = e.key.toLowerCase();
    const isJumpKey = k === ' ' || k === 'w' || e.code === 'Space';
    if (ob.kind === 'jump' && isJumpKey) {
      resolved = true; succeed('jump');
    } else if (ob.kind === 'hide' && k === 'x') {
      resolved = true; succeed('hide');
    } else if (ob.kind === 'dodge' && k === dodgeKey) {
      resolved = true; succeed(dodgeDir);
    }
  }
  document.addEventListener('keydown', onKey);
  const failTimer = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    fail();
  }, travelMs);
  function succeed(kind) {
    document.removeEventListener('keydown', onKey);
    clearTimeout(failTimer);
    dodgePrompt.classList.add('hidden');
    playerReact(kind);
    chaseObstacleEl.style.transition = 'none';
    chaseObstacleEl.classList.add('dodged');
    dodgeStreak++;
    showStreakPopup(STREAK_MESSAGES[Math.min(dodgeStreak - 1, STREAK_MESSAGES.length - 1)]);
    trexSurge(-14);
    finish();
  }
  function fail() {
    document.removeEventListener('keydown', onKey);
    dodgePrompt.classList.add('hidden');
    applyDamage(-hpCostOnFail, 'Hit an obstacle');
    chaseObstacleEl.classList.add('hit');
    dodgeStreak = 0;
    trexSurge(18);
    finish();
  }
  function finish() {
    setTimeout(() => {
      chaseObstacleEl.classList.add('hidden');
      chaseObstacleEl.classList.remove('dodged', 'hit');
      if (GameState.hp <= 0) {
        triggerChaseDeath();
        return;
      }
      setTimeout(onDone, restMs);
    }, 350);
  }
}
let ammoCount = 0;
let raptorInjured = false;
const ammoWrap = document.getElementById('ammo-wrap');
const ammoCountEl = document.getElementById('ammo-count');
const raptorSprite = document.getElementById('raptor-sprite');
const raptorLungeSprite = document.getElementById('raptor-lunge-sprite');
const ammoSearchWrap = document.getElementById('ammo-search-wrap');
const ammoSearchHotspot = document.getElementById('ammo-search-hotspot');
let ammoSearchNext = null;
function updateAmmoDisplay() {
  ammoCountEl.textContent = ammoCount;
  ammoWrap.classList.toggle('empty', ammoCount <= 0);
}
function giveAmmo(amount) {
  ammoCount = amount;
  ammoWrap.classList.remove('hidden');
  updateAmmoDisplay();
}
function showAmmoSearch(nextBeatId) {
  if (GameState.flags.savedEsme) {
    giveAmmo(8);
    goTo(nextBeatId);
    return;
  }
  ammoSearchNext = nextBeatId;
  ammoSearchWrap.classList.remove('hidden');
}
ammoSearchHotspot.addEventListener('click', () => {
  ammoSearchWrap.classList.add('hidden');
  giveAmmo(5);
  showItemPickup('', 'Found 5 Darts');
  if (ammoSearchNext) goTo(ammoSearchNext);
});
function triggerRaptorLunge(next) {
  raptorLungeSprite.classList.remove('hidden');
  void raptorLungeSprite.offsetWidth;
  raptorLungeSprite.classList.add('show');
  startFootstepShakes(1);
  triggerImpactFlash(1);
  applyDamage(-10, 'Raptor lunge');
  raptorInjured = true;
  setTimeout(() => {
    raptorLungeSprite.classList.remove('show');
    setTimeout(() => {
      raptorLungeSprite.classList.add('hidden');
      goTo(next);
    }, 300);
  }, 900);
}
function triggerStumble() {
  const darius = document.getElementById('darius-run');
  darius.classList.remove('stumbling');
  void darius.offsetWidth;
  darius.classList.add('stumbling');
  setTimeout(() => darius.classList.remove('stumbling'), 820);
}
function runRaptorGauntlet(rounds, hpCostOnFail, next) {
  minigameActive = true;
  let round = 0;
  function nextRound() {
    if (round >= rounds) {
      minigameActive = false;
      goTo(next);
      return;
    }
    round++;
    spawnRaptor(nextRound, hpCostOnFail);
  }
  nextRound();
}
function spawnRaptor(onDone, hpCostOnFail) {
  raptorSprite.classList.remove('hidden', 'hit', 'flinch');
  raptorSprite.style.transition = 'none';
  raptorSprite.style.right = '-30%';
  void raptorSprite.offsetWidth;
  const travelMs = raptorInjured ? 1600 : 2000;
  raptorSprite.style.transition = `right ${travelMs}ms linear`;
  raptorSprite.style.right = '55%';
  let resolved = false;
  let hitsLeft = 2;
  function onClick() {
    if (resolved || ammoCount <= 0) return;
    ammoCount--;
    updateAmmoDisplay();
    hitsLeft--;
    if (hitsLeft <= 0) {
      resolved = true;
      succeed();
    } else {
      raptorSprite.classList.remove('flinch');
      void raptorSprite.offsetWidth;
      raptorSprite.classList.add('flinch');
    }
  }
  raptorSprite.addEventListener('click', onClick);
  function onKey(e) {
    if (resolved || ammoCount > 0) return;
    if (e.key.toLowerCase() === 'x') {
      resolved = true;
      succeed();
    }
  }
  document.addEventListener('keydown', onKey);
  const failTimer = setTimeout(() => {
    if (resolved) return;
    resolved = true;
    fail();
  }, travelMs);
  function cleanup() {
    raptorSprite.removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
    clearTimeout(failTimer);
  }
  function succeed() {
    cleanup();
    raptorSprite.style.transition = 'none';
    raptorSprite.classList.remove('flinch');
    raptorSprite.classList.add('hit');
    setTimeout(() => {
      raptorSprite.classList.add('hidden');
      raptorSprite.classList.remove('hit');
      setTimeout(onDone, 350);
    }, 300);
  }
  function fail() {
    cleanup();
    applyDamage(-hpCostOnFail, 'Raptor got too close');
    raptorSprite.classList.add('hidden');
    if (GameState.hp <= 0) { triggerChaseDeath('s7_01'); return; }
    setTimeout(onDone, 350);
  }
}
function stopGateTimer() {
  clearInterval(gateTimerInterval);
  gateTimerInterval = null;
  gateTimerWrap.classList.add('hidden');
}
function setRunning(active) {
  bg.classList.toggle('chase-pan', !!active);
  if (active) bg.classList.remove('pan');
}
const hijackOverlay = document.getElementById('hijack-overlay');
const hijackLines = document.getElementById('hijack-lines');
const hijackFightFill = document.getElementById('hijack-fight-fill');
let hijackKeyHandler = null;
let hijackNext = null;

const HIJACK_TAUNTS = [
  "SYSTEM OVERRIDE — SOURCE UNKNOWN",
  "Oh. You found the manual override. Cute.",
  "That's not how any of this works.",
  "Nice try, though."
];

function runHijackSequence(next) {
  hijackNext = next;
  hijackOverlay.classList.remove('hidden');
  hijackLines.innerHTML = '';
  let lineIdx = 0;
  let fightAttempt = 0;
  const maxAttempts = 2;

  function showNextLine() {
    if (lineIdx < HIJACK_TAUNTS.length) {
      const p = document.createElement('p');
      if (lineIdx > 0) p.className = 'taunt';
      p.textContent = HIJACK_TAUNTS[lineIdx];
      hijackLines.appendChild(p);
      lineIdx++;
      setTimeout(showNextLine, 750);
    } else {
      startFightBar();
    }
  }

  function startFightBar() {
    let progress = 0;
    hijackFightFill.style.width = '0%';
    hijackKeyHandler = (e) => {
      if (e.key.toLowerCase() !== 'e') return;
      progress = Math.min(100, progress + 9);
      hijackFightFill.style.width = progress + '%';
      if (progress >= 100) {
        document.removeEventListener('keydown', hijackKeyHandler);
        sabotage();
      }
    };
    document.addEventListener('keydown', hijackKeyHandler);
  }

  function sabotage() {
    fightAttempt++;
    if (fightAttempt <= maxAttempts) {
      const p = document.createElement('p');
      p.className = 'taunt';
      p.textContent = fightAttempt === 1 ? "Nope." : "Still no.";
      hijackLines.appendChild(p);
      setTimeout(startFightBar, 700);
    } else {
      finishHijack();
    }
  }

  function finishHijack() {
    const p = document.createElement('p');
    p.className = 'taunt';
    p.textContent = "Sleep tight.";
    hijackLines.appendChild(p);
    setTimeout(() => {
      hijackOverlay.classList.add('hidden');
      goTo(hijackNext);
    }, 1300);
  }

  showNextLine();
}

const poseSprite = document.getElementById('pose-sprite');
function setPoseSprite(src) {
  if (src) {
    poseSprite.src = src;
    poseSprite.classList.remove('hidden');
  } else {
    poseSprite.classList.add('hidden');
  }
}
const itemPickup = document.getElementById('item-pickup');
const itemPickupIcon = document.getElementById('item-pickup-icon');
const itemPickupLabel = document.getElementById('item-pickup-label');
let itemPickupTimer = null;
function showItemPickup(icon, label) {
  itemPickupIcon.style.display = icon ? '' : 'none';
  if (icon) itemPickupIcon.src = icon;
  itemPickupLabel.textContent = label;
  itemPickup.classList.remove('show');
  void itemPickup.offsetWidth;
  itemPickup.classList.add('show');
  clearTimeout(itemPickupTimer);
  itemPickupTimer = setTimeout(() => itemPickup.classList.remove('show'), 2600);
}
const passwordWallWrap = document.getElementById('password-wall-wrap');
const passwordHotspotEl = document.getElementById('password-hotspot');
const watchWrap = document.getElementById('watch-wrap');
const watchHotspotEl = document.getElementById('watch-hotspot');
let passwordFoundNext = null;
let watchFoundNext = null;
function showPasswordWall(nextBeatId) {
  passwordFoundNext = nextBeatId;
  passwordWallWrap.classList.remove('hidden');
  passwordHotspotEl.disabled = false;
}
passwordHotspotEl.addEventListener('click', () => {
  passwordHotspotEl.disabled = true;
  passwordWallWrap.classList.add('hidden');
  showItemPickup('', 'Password Found: EDEN-Ω7');
  GameState.setFlag('foundPassword', true);
  if (passwordFoundNext) goTo(passwordFoundNext);
});
function showWatchPickup(nextBeatId) {
  watchFoundNext = nextBeatId;
  watchWrap.classList.remove('hidden');
  watchHotspotEl.disabled = false;
}
watchHotspotEl.addEventListener('click', () => {
  watchHotspotEl.disabled = true;
  watchWrap.classList.add('hidden');
  equipWatch();
  showItemPickup('', 'Backup Watch Equipped');
  if (watchFoundNext) goTo(watchFoundNext);
});
const PADDOCK_LEGEND = { T: 'Tyrannosaurus', X: 'Velociraptor', C: 'Diplodocus', A: 'Ankylosaurus', R: 'Triceratops', J: 'Juvenile Mixed' };
const PADDOCK_DATA = {
  T: [{ code: 'ASSET-T1104', x: 50, y: 55 }],
  X: [
    { code: 'ASSET-X4471', x: 28, y: 62 },
    { code: 'ASSET-X4472', x: 52, y: 42 },
    { code: 'ASSET-X4473', x: 72, y: 66, anomalous: true }
  ],
  C: [{ code: 'ASSET-C2201', x: 38, y: 50 }, { code: 'ASSET-C2202', x: 66, y: 38 }],
  A: [{ code: 'ASSET-A3312', x: 50, y: 55 }],
  R: [{ code: 'ASSET-R5501', x: 44, y: 48 }, { code: 'ASSET-R5502', x: 62, y: 62 }],
  J: [{ code: 'ASSET-J0091', x: 50, y: 50 }]
};
const terminalOverlay = document.getElementById('terminal-overlay');
const terminalTabs = document.getElementById('terminal-tabs');
const terminalView = document.getElementById('terminal-view');
const terminalLegendList = document.getElementById('terminal-legend-list');
let terminalCloseNext = null;
function renderTerminalPaddock(letter) {
  terminalView.innerHTML = '';
  (PADDOCK_DATA[letter] || []).forEach((a) => {
    const dot = document.createElement('div');
    dot.className = 'terminal-asset-dot' + (a.anomalous ? ' anomalous' : '');
    dot.style.left = a.x + '%';
    dot.style.top = a.y + '%';
    const label = document.createElement('span');
    label.className = 'terminal-asset-label';
    label.textContent = a.code;
    dot.appendChild(label);
    terminalView.appendChild(dot);
  });
  terminalTabs.querySelectorAll('.terminal-tab').forEach((t) => t.classList.toggle('active', t.dataset.paddock === letter));
}
function openTerminal(nextBeatId) {
  terminalCloseNext = nextBeatId;
  terminalTabs.innerHTML = '';
  terminalLegendList.innerHTML = '';
  Object.keys(PADDOCK_LEGEND).forEach((letter) => {
    const tab = document.createElement('button');
    tab.className = 'terminal-tab';
    tab.textContent = letter;
    tab.dataset.paddock = letter;
    tab.addEventListener('click', () => renderTerminalPaddock(letter));
    terminalTabs.appendChild(tab);
    const li = document.createElement('li');
    li.innerHTML = `<b>${letter}</b> — ${PADDOCK_LEGEND[letter]}`;
    terminalLegendList.appendChild(li);
  });
  renderTerminalPaddock('X');
  codeRedAlert.classList.remove('hidden', 'downloaded');
  codeRedAlert.textContent = '⚠ CODE RED: PLAN83E7H — UNAUTHORIZED ACCESS DETECTED';
  commsLogBtn.classList.remove('hidden', 'unlocked');
  commsLogBtn.textContent = '🔒 Archived Transmission — locked';
  terminalOverlay.classList.remove('hidden');
}
document.getElementById('terminal-close').addEventListener('click', () => {
  terminalOverlay.classList.add('hidden');
  if (terminalCloseNext) goTo(terminalCloseNext);
});
const codeRedAlert = document.getElementById('code-red-alert');
const downloadPanel = document.getElementById('download-panel');
const downloadBarFill = document.getElementById('download-bar-fill');
let downloadProgress = 0;
let downloadKeyHandler = null;
codeRedAlert.addEventListener('click', () => {
  if (codeRedAlert.classList.contains('downloaded')) return;
  downloadProgress = 0;
  downloadBarFill.style.width = '0%';
  downloadPanel.classList.remove('hidden');
  downloadKeyHandler = (e) => {
    if (e.key.toLowerCase() !== 'e') return;
    downloadProgress = Math.min(100, downloadProgress + 8);
    downloadBarFill.style.width = downloadProgress + '%';
    if (downloadProgress >= 100) finishDownload();
  };
  document.addEventListener('keydown', downloadKeyHandler);
});
function finishDownload() {
  document.removeEventListener('keydown', downloadKeyHandler);
  downloadKeyHandler = null;
  downloadPanel.classList.add('hidden');
  GameState.setFlag('planDownloaded', true);
  codeRedAlert.classList.add('downloaded');
  codeRedAlert.textContent = '✓ PLAN83E7H — Downloaded';
  showItemPickup('', 'Route Plan Downloaded');
  commsLogBtn.classList.add('unlocked');
  commsLogBtn.textContent = '📡 Archived Transmission';
}
const commsLogBtn = document.getElementById('comms-log-btn');
const commsLogPanel = document.getElementById('comms-log-panel');
const commsLogLines = document.getElementById('comms-log-lines');
const HANDLER_LOG = [
  { speaker: 'HANDLER', text: "Status." },
  { speaker: 'VOSS', text: "The samples are packed. Cold-chain, standard protocol. Nothing that reads as unusual on a manifest." },
  { speaker: 'HANDLER', text: "And the notes?" },
  { speaker: 'VOSS', text: "Sanitized. What's left in the physical files is enough to look like standard research. Nothing that survives scrutiny." },
  { speaker: 'HANDLER', text: "Good. You have everything you need to proceed on your end. Good luck." },
  { speaker: 'VOSS', text: "Thank you. For all of it." },
  { speaker: 'HANDLER', text: "Don't thank me. Just get clear." },
  { speaker: 'VOSS', text: "Containment risk is handled on my end. The perimeter reads as a natural fault. Nobody's looking past that." },
  { speaker: 'HANDLER', text: "Somebody's already looking, Voss. That's the whole reason for this call." },
  { speaker: 'VOSS', text: "...Right." },
  { speaker: 'HANDLER', text: "Good. I go dark after this. No more contact, in either direction. You understand what that means." },
  { speaker: 'VOSS', text: "I understand." },
  { speaker: 'HANDLER', text: "For what it's worth — this was good work. Whatever else it turns into." },
  { speaker: 'VOSS', text: "It didn't feel like a choice, most days." },
  { speaker: 'HANDLER', text: "It rarely does. That's not an excuse. Just an observation." },
  { speaker: 'VOSS', text: "...No. I suppose it isn't." },
  { speaker: 'HANDLER', text: "...Voss. If it doesn't hold on your end—" },
  { speaker: 'VOSS', text: "It will." },
  { speaker: 'HANDLER', text: "[transmission ends]" }
];
commsLogBtn.addEventListener('click', () => {
  if (!commsLogBtn.classList.contains('unlocked')) return;
  commsLogLines.innerHTML = HANDLER_LOG.map((l) =>
    `<p><span class="speaker">${l.speaker}:</span> ${l.text}</p>`).join('');
  commsLogPanel.classList.remove('hidden');
});
document.getElementById('comms-log-close').addEventListener('click', () => {
  commsLogPanel.classList.add('hidden');
});
function equipWatch() {
  mapUpgraded = true;
  setRadioState('idle', 'STANDBY');
}
let gateTimerValue = 0;
let gateTimerInterval = null;
const gateTimerWrap = document.getElementById('gate-timer-wrap');
const gateTimerValueEl = document.getElementById('gate-timer-value');
function startGateTimer(seconds) {
  gateTimerValue = seconds || 240;
  gateTimerWrap.classList.remove('hidden');
  updateGateTimerDisplay();
  clearInterval(gateTimerInterval);
  gateTimerInterval = setInterval(() => {
    gateTimerValue = Math.max(0, gateTimerValue - 1);
    updateGateTimerDisplay();
    if (gateTimerValue <= 0) {
      clearInterval(gateTimerInterval);
      gateTimerInterval = null;
    }
  }, 1000);
}
function updateGateTimerDisplay() {
  const m = Math.floor(gateTimerValue / 60);
  const s = gateTimerValue % 60;
  gateTimerValueEl.textContent = m + ':' + String(s).padStart(2, '0');
  gateTimerWrap.classList.toggle('critical', gateTimerValue <= 60);
}
const powerFlash = document.getElementById('power-flash');
function triggerPowerFlash(onMid, onDone) {
  powerFlash.classList.remove('flash');
  void powerFlash.offsetWidth;
  powerFlash.classList.add('flash');
  setTimeout(() => { if (onMid) onMid(); }, 150);
  setTimeout(() => { if (onDone) onDone(); }, 700);
}
const dariusSprite    = document.getElementById('darius-sprite');
const continueBtn     = document.getElementById('scene-continue-btn');
const skipBtn         = document.getElementById('skip-btn');
const backBtn         = document.getElementById('back-btn');
const hud             = document.getElementById('hud');
const hudScene        = document.getElementById('hud-scene');
const choiceBox       = document.getElementById('choice-box');
const choiceOptions   = document.getElementById('choice-options');
let queueActive = false;
let pendingNext = null;
let lastSpeaker = 'Darius';
let currentBg = '';
let currentSceneId = 1;
let currentBeatId = null;
let beatHistory = [];
const PORTRAIT = {
  Darius: 'assets/Darius.jpeg',
  Ace:    'assets/Ace.jpeg',
  Esme:   'assets/Esme.jpeg',
  Kira:   'assets/Kira.jpeg',
  Sana:   'assets/Guide-1.png',
  Theo:   'assets/Guide-2.png'
};
const CHAR_THEME = {
  Darius: '#8bbf6c',
  Ace:    '#f2a900',
  Esme:   '#e0728f',
  Kira:   '#6fa8c9',
  Sana:   '#c99b4a',
  Theo:   '#7fae8f'
};
function applySpeakerTheme(name) {
  const color = CHAR_THEME[name] || '#f2a900';
  speakerPortrait.style.borderColor = color;
  speakerPortrait.style.boxShadow =
    `0 0 0 3px var(--wood-dark), 0 0 24px ${color}66, 0 12px 24px rgba(0,0,0,0.55)`;
  speakerName.style.color = color;
  speakerName.style.borderColor = color;
}
function updateHUD(label) {
  hud.classList.remove('hidden');
  hudScene.textContent = label;
}
const hpWrap        = document.getElementById('hp-wrap');
const hpBarFill      = document.getElementById('hp-bar-fill');
const mapBtn        = document.getElementById('map-btn');
const mapOverlay    = document.getElementById('map-overlay');
const mapClose      = document.getElementById('map-close');
const radioIcon     = document.getElementById('radio-icon');
const radioStatus   = document.getElementById('radio-icon-status');
const radioCallOverlay = document.getElementById('radio-call-overlay');
const radioCallText    = document.getElementById('radio-call-text');
const radioCallClose   = document.getElementById('radio-call-close');
const radioCallHeaderText = document.getElementById('radio-call-header-text');
let travelUIRevealed = false;
let mapDestination = null;
let restrictedZoneRevealed = false;
let mapPowerLost = false;
let mapUpgraded = false;
let currentCheckpoint = 0;
let pendingRadioBeat = null;
const CHECKPOINTS = [
  'Landing', 'Guide Intro', 'Exhibit A', 'Exhibit B', 'Exhibit C',
  'Vehicle Bay', 'Paddock 1', 'Paddock 2', 'The Road', 'Return Route'
];
let mapPinned = false;
function revealTravelUI() {
  if (travelUIRevealed) return;
  travelUIRevealed = true;
  hpWrap.classList.remove('hidden');
  mapBtn.classList.remove('hidden');
  radioIcon.classList.remove('hidden');
  updateHPBar();
}
function setRadioState(state, label) {
  radioIcon.classList.remove('idle', 'ringing', 'active', 'offline', 'lost');
  radioIcon.classList.add(state);
  radioStatus.textContent = label;
}
function ringRadio(beat) {
  pendingRadioBeat = beat;
  setRadioState('ringing', beat.critical ? 'URGENT' : 'INCOMING');
  radioIcon.classList.toggle('critical', !!beat.critical);
  startRingBuzz();
}
function openRadioPanel() {
  const state = radioIcon.classList.contains('ringing') ? 'ringing'
              : radioIcon.classList.contains('offline') ? 'offline'
              : radioIcon.classList.contains('lost') ? 'lost'
              : 'idle';
  radioCallOverlay.classList.remove('hidden');
  radioCallOverlay.classList.remove('mode-idle', 'mode-ringing', 'mode-offline', 'mode-lost');
  radioCallOverlay.classList.add('mode-' + state);
  radioCallOverlay.classList.toggle('critical', state === 'ringing' && !!(pendingRadioBeat && pendingRadioBeat.critical));
  if (state === 'ringing') {
    stopRingBuzz();
    setRadioState('active', pendingRadioBeat.critical ? 'LIVE — URGENT' : 'LIVE');
    radioCallHeaderText.textContent = pendingRadioBeat.critical ? 'EMERGENCY TRANSMISSION' : 'INCOMING TRANSMISSION';
    radioCallText.textContent = pendingRadioBeat.text;
    if (pendingRadioBeat.critical) startPanicTransmission();
    else startStaticNoise();
    if (pendingRadioBeat.audioSrc) {
      try {
        const player = new Audio(pendingRadioBeat.audioSrc);
        player.volume = 0.8;
        player.play().catch(() => {});
        radioCallOverlay._audioPlayer = player;
      } catch (e) {  }
    }
  } else if (state === 'offline') {
    radioCallHeaderText.textContent = 'NO SIGNAL';
    radioCallText.textContent = "...no signal. Channel's dead.";
  } else if (state === 'lost') {
    radioCallHeaderText.textContent = 'SIGNAL LOST';
    radioCallText.textContent = "...static. The channel's still open, but nothing's coming through clean.";
  } else {
    radioCallHeaderText.textContent = 'CHANNEL STANDBY';
    radioCallText.textContent = "Channel clear. No incoming transmissions.";
  }
}
radioIcon.addEventListener('click', openRadioPanel);
radioCallClose.addEventListener('click', () => {
  radioCallOverlay.classList.add('hidden');
  radioCallOverlay.classList.remove('critical');
  radioIcon.classList.remove('critical');
  stopStaticNoise();
  stopPanicTransmission();
  stopRingBuzz();
  if (radioCallOverlay._audioPlayer) {
    radioCallOverlay._audioPlayer.pause();
    radioCallOverlay._audioPlayer = null;
  }
  const next = pendingRadioBeat ? pendingRadioBeat.next : null;
  const wasAnswering = !!pendingRadioBeat;
  pendingRadioBeat = null;
  if (wasAnswering && next) goTo(next);
});
function updateHPBar() {
  hpBarFill.style.width = GameState.hp + '%';
  hpBarFill.classList.toggle('low', GameState.hp <= 30);
}
const damageFlash = document.getElementById('damage-flash');
function applyDamage(amount, reason) {
  GameState.set('hp', Math.max(0, Math.min(100, GameState.hp + amount)));
  updateHPBar();
  if (amount < 0) triggerImpactFlash(Math.abs(amount) / 50);
}
function triggerImpactFlash(intensity) {
  damageFlash.style.setProperty('--flash-peak', 0.25 + Math.min(1, intensity) * 0.55);
  damageFlash.classList.remove('flash');
  void damageFlash.offsetWidth;
  damageFlash.classList.add('flash');
}
const RESTRICTED_PLACES = ['Tyrannosaurus Paddock', 'Laboratory', 'Raptor Paddock', 'Emergency Helipad'];
let restrictedListOpen = false;
let trexGlitching = false;
function selectMapPlace(name) {
  const path = document.getElementById('map-route-path');
  const marker = document.getElementById('map-dest-marker');
  const label = document.getElementById('map-dest-label');
  label.textContent = name;
  marker.classList.add('visible');
  path.classList.remove('visible');
  void path.getBoundingClientRect();
  path.classList.add('visible');
}
function toggleRestrictedList() {
  const list = document.getElementById('map-restricted-list');
  if (!restrictedZoneRevealed) {
    list.classList.remove('hidden');
    list.innerHTML = '<li class="denied">ACCESS DENIED</li>';
    return;
  }
  restrictedListOpen = !restrictedListOpen;
  renderRestrictedList();
}
function renderRestrictedList() {
  const list = document.getElementById('map-restricted-list');
  list.classList.toggle('hidden', !restrictedListOpen);
  if (!restrictedListOpen) return;
  list.innerHTML = '';
  RESTRICTED_PLACES.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    if (trexGlitching && name === 'Tyrannosaurus Paddock') li.classList.add('trex-glitch');
    list.appendChild(li);
  });
}
function openMap() {
  const outbreak = !!GameState.flags.outbreakStarted;
  mapOverlay.classList.toggle('outbreak', outbreak);
  mapOverlay.classList.toggle('power-lost', mapPowerLost && !outbreak);
  mapOverlay.classList.toggle('upgraded', mapUpgraded);
  mapOverlay.classList.toggle('pinned', mapPinned);
  document.getElementById('map-banner').textContent =
    outbreak ? 'PERIMETER FAILURE' : mapPowerLost ? 'POWER LOST' : 'TOUR IN PROGRESS';
  document.getElementById('map-dest-marker').classList.remove('visible');
  document.getElementById('map-route-path').classList.remove('visible');
  const restrictedBtn = document.getElementById('map-restricted-btn');
  restrictedBtn.classList.toggle('unlocked', restrictedZoneRevealed);
  restrictedBtn.textContent = restrictedZoneRevealed ? '⚠ Restricted Area' : '🔒 Restricted Area';
  renderRestrictedList();
  const mapRoute = document.getElementById('map-route');
  mapRoute.innerHTML = '';
  CHECKPOINTS.forEach((label, i) => {
    const row = document.createElement('div');
    row.className = 'checkpoint ' +
      (i < currentCheckpoint ? 'visited' : i === currentCheckpoint ? 'current' : 'upcoming');
    row.innerHTML = `<span class="checkpoint-dot"></span><span class="checkpoint-label">${label}</span>`;
    row.addEventListener('click', () => selectMapPlace(label));
    mapRoute.appendChild(row);
  });
  if (mapDestination && !outbreak) {
    const exhibits = Array.isArray(mapDestination) ? mapDestination : [mapDestination];
    exhibits.forEach((name) => {
      const row = document.createElement('div');
      row.className = 'checkpoint exhibit';
      row.innerHTML = `<span class="checkpoint-dot"></span><span class="checkpoint-label">${name}</span>`;
      row.addEventListener('click', () => selectMapPlace(name));
      mapRoute.appendChild(row);
    });
  }
  requestAnimationFrame(() => {
    const current = mapRoute.querySelector('.checkpoint.current');
    if (current) current.scrollIntoView({ block: 'center' });
  });
  if (GameState.flags.planDownloaded) selectMapPlace('Emergency Helipad');
  mapOverlay.classList.remove('hidden');
}
mapBtn.addEventListener('click', openMap);
mapClose.addEventListener('click', () => mapOverlay.classList.add('hidden'));
document.getElementById('map-restricted-btn').addEventListener('click', toggleRestrictedList);
const SCENE2_BEATS = {
  s1_01: { type: 'narration', bg: 'assets/aircraft-interior.png',
    text: "The aircraft hums as it carries the four guests toward Jurassic Isle.", next: 's1_02' },
  s1_02: { speaker: 'Ace',    line: "So, uh what'd everyone get invited for?", next: 's1_03' },
  s1_03: { speaker: 'Esme',   line: "I'm here for the promotional campaign", next: 's1_04' },
  s1_04: { speaker: 'Ace',    line: "Ah, makes sense.", next: 's1_05' },
  s1_05: { speaker: 'Esme',   line: "yeah, you?", next: 's1_06' },
  s1_06: { speaker: 'Ace',    line: "My family's one of the park's affiliates.", next: 's1_07' },
  s1_07: { speaker: 'Kira',   line: "pfft, must be nice.", next: 's1_08' },
  s1_08: { speaker: 'Ace',    line: "It is.", next: 's1_09' },
  s1_09: { speaker: 'Kira',   line: "Huh, at least you're honest.", next: 's1_10' },
  s1_10: { speaker: 'Ace',    line: "I don't really see a reason not to be.", next: 's1_11' },
  s1_11: { speaker: 'Esme',   line: "okay...and you two?", next: 's1_12' },
  s1_12: { speaker: 'Kira',   line: "Athletics program, Jurassic Isle is my sponsor", next: 's1_13' },
  s1_13: { speaker: 'Ace',    line: "Damn, cool. and you?", next: 'cp1_intro' },
  cp1_intro: { type: 'choice', options: [
    { text: "some contest, research paper", next: 'cp1_a1' },
    { text: "Just some dinosaur research. It's not a big deal.", next: 'cp1_b1' },
    { text: "Let's just say I know more about T. rex bite force than most adults.", next: 'cp1_c1' }
  ]},
  cp1_a1: { speaker: 'Ace',    line: "On?", next: 'cp1_a2' },
  cp1_a2: { speaker: 'Darius', line: "Tyrannosauridae", next: 'cp1_a3' },
  cp1_a3: { speaker: 'Ace',    line: "...Dinosaurs?", next: 'cp1_a4' },
  cp1_a4: { speaker: 'Darius', line: "uh yes", next: 's1_18' },
  cp1_b1: { speaker: 'Ace',    line: "Come on, don't undersell it. On what?", next: 'cp1_b2' },
  cp1_b2: { speaker: 'Darius', line: "Tyrannosauridae. Bite mechanics, mostly.", next: 'cp1_b3' },
  cp1_b3: { speaker: 'Kira',   line: "Sounds intense.", next: 's1_18' },
  cp1_c1: { speaker: 'Ace',    line: "...okay, didn't expect that answer.", next: 'cp1_c2' },
  cp1_c2: { speaker: 'Esme',   line: "I like the confidence.", next: 's1_18' },
  s1_18: { speaker: 'Ace',    line: "Okay. I respect it.", next: 's1_19' },
  s1_19: { speaker: 'Kira',   line: "Hah, you clearly have no idea what he just said.", next: 's1_20' },
  s1_20: { speaker: 'Ace',    line: "I know it's a dinosaur.", next: 'cp2_rant' },
  cp2_rant: { type: 'choice', options: [
    { text: "Technically, Tyrannosauridae is the family. Tyrannosaurus is the genus-", next: 'cp2_a1' },
    { text: "It's a whole family of dinosaurs, not just one.", next: 'cp2_b1' },
    { text: "Relax, I'll dumb it down for you later.", next: 'cp2_c1' }
  ]},
  cp2_a1: { speaker: 'Kira',   line: "Never mind.", next: 's1_22' },
  cp2_b1: { speaker: 'Kira',   line: "Huh. Didn't know dinosaurs had family trees.", next: 's1_22' },
  cp2_c1: { speaker: 'Ace',    line: "Wow, okay. Didn't know you had jokes.", next: 's1_22' },
  s1_22: { speaker: 'Esme',   line: "Hah, i guess we got a dino nerd with us", next: 's1_23' },
  s1_23: { speaker: 'Darius', line: "Yeah, I guess", next: 's1_24' },
  s1_24: { speaker: 'Ace',    line: "So you actually know a lot about them?", next: 's1_25' },
  s1_25: { speaker: 'Darius', line: "I mean, maybe?", next: 's1_26' },
  s1_26: { speaker: 'Ace',    line: "'Maybe' is basically a yes. So if this goes sideways — which it won't — you're on dino-that-eats-us-first duty.", next: 'cp3_eat' },
  cp3_eat: { type: 'choice', options: [
    { text: "Sure.", next: 'cp3_a1' },
    { text: "I'll try not to let anyone become a snack.", next: 'cp3_b1' },
    { text: "Depends which enclosure we're closest to.", next: 'cp3_c1' }
  ]},
  cp3_a1: { speaker: 'Kira',   line: "Comforting.", next: 's2_01' },
  cp3_b1: { speaker: 'Esme',   line: "Please don't jinx us.", next: 's2_01' },
  cp3_c1: { speaker: 'Ace',    line: "...that's not as reassuring as you think it is.", next: 's2_01' },
  s2_01: { type: 'narration', bg: 'assets/isle-aerial.png', fit: 'contain',
    text: "The aircraft passes over Jurassic Isle.", next: 's2_02' },
  s2_02: { speaker: 'Esme',   line: "Okay... wow.", next: 's2_03' },
  s2_03: { speaker: 'Kira',   line: "That's bigger than I expected.", next: 's2_04' },
  s2_04: { speaker: 'Ace',    line: "Impressive, right?", next: 's2_05' },
  s2_05: { speaker: 'Kira',   line: "I guess your family picked a decent investment.", next: 's2_06' },
  s2_06: { speaker: 'Ace',    line: "Obviously.", next: 's2_07' },
  s2_07: { speaker: 'Esme',   line: "Look at that.", next: 'cp4_herb' },
  cp4_herb: { type: 'choice', options: [
    { text: "Those are herbivores, some of them can be friendly", next: 'cp4_a1' },
    { text: "Well, most of them, anyway.", next: 'cp4_b1' },
    { text: "That's a whole migrating herd. I've read about their movement patterns for years.", next: 'cp4_c1' }
  ]},
  cp4_a1: { speaker: 'Ace',    line: "You can tell from up here?", next: 's2_09' },
  cp4_b1: { speaker: 'Kira',   line: "...most?", next: 's2_09' },
  cp4_c1: { speaker: 'Esme',   line: "Okay, that's actually kind of impressive.", next: 's2_09' },
  s2_09: { speaker: 'Darius', line: "the enclosures are labelled, and yeah easy to tell.", next: 's2_10' },
  s2_10: { speaker: 'Darius', line: "The herd behavior gives it away.", next: 's2_11' },
  s2_11: { speaker: 'Kira',   line: "Of course it does.", next: 's2_12' },
  s2_12: { speaker: 'Esme',   line: "You're really into this.", next: 'cp5_cool' },
  cp5_cool: { type: 'choice', options: [
    { text: "They're cool, i kind of like cool", next: 'cp5_a1' },
    { text: "Yeah, I love this stuff. No shame in it.", next: 'cp5_b1' },
    { text: "I mean, I stare at teeth measurements for fun, so... yeah.", next: 'cp5_c1' }
  ]},
  cp5_a1: { speaker: 'Ace',    line: "Kind of?", next: 'cp5_a2' },
  cp5_a2: { speaker: 'Darius', line: "Yeah yeah, really cool.", next: 's2_15' },
  cp5_b1: { speaker: 'Ace',    line: "Didn't say there was.", next: 's2_15' },
  cp5_c1: { speaker: 'Esme',   line: "Okay that's a LITTLE concerning, but sure.", next: 's2_15' },
  s2_15: { speaker: 'Kira',   line: "Thought so.", next: 's2_16' },
  s2_16: { speaker: 'Esme',   line: "We're almost there.", next: 's2_17' },
  s2_17: { speaker: 'Darius', line: "Wow.", next: 's2_18' },
  s2_18: { speaker: 'Darius', line: "This is gonna be the perfect day.", next: null }
};
const SCENE3_BEATS = {
  b1_01: { type: 'narration', bg: 'assets/Landing.png', fit: 'contain', checkpoint: 0,
    text: "The helicopter descends toward Jurassic Isle. Below them, the park unfolds — glass domes, terraced resorts, a coastline that doesn't end.", next: 'b1_02' },
  b1_02: { speaker: 'Esme', line: "Okay, I need like fifteen photos of this before we even land.", next: 'b1_03' },
  b1_03: { speaker: 'Kira', line: "We haven't even landed and you're already working.", next: 'b1_04' },
  b1_04: { speaker: 'Esme', line: "It's not work if I like it.", next: 'b2_00' },
  b2_00: { type: 'narration', bg: 'assets/Intro.png', checkpoint: 1,
    text: "Inside, the visitor center opens into a vast atrium — timber and glass arching overhead, jungle mountains visible through the far wall. Two guides wait near the entrance.", next: 'b2_01' },
  b2_01: { speaker: 'Sana', line: "Welcome to Jurassic Isle. I'm Sana, and I'll be leading your tour today.", next: 'b2_02' },
  b2_02: { speaker: 'Theo', line: "And I'm Theo. Basically her assistant, but don't tell her I said 'basically.'", next: 'b2_03' },
  b2_03: { speaker: 'Sana', line: "(smiling) He carries the water.", next: 'b2_04' },
  b2_04: { speaker: 'Ace',  line: "Great. So like how's this work? Do we just follow you guys around all day?", next: 'b2_05' },
  b2_05: { speaker: 'Theo', line: "Pretty much. Museum stuff first, some inner enclosures, then the fun part — actual paddocks, actual dinosaurs.", next: 'cp_b2' },
  cp_b2: { type: 'choice', options: [
    { text: "Actual paddocks? Like, drive-through?", next: 'b2_a1' },
    { text: "I've read the brochure thrice. Do you guys really have originals on display?", next: 'b2_b1' },
    { text: "...hah, are the fences electric?", next: 'b2_c1' }
  ]},
  b2_a1: { speaker: 'Theo', line: "Drive-through, ranger-guided, the whole deal. You're gonna love it.", next: 'b2_final' },
  b2_b1: { speaker: 'Sana', line: "(amused) Read it thrice? I like him already — and yes, a few originals.", next: 'b2_b2' },
  b2_b2: { speaker: 'Kira', line: "Damn, I'm taking that's hard to display.", next: 'b2_b3' },
  b2_b3: { speaker: 'Esme', line: "And I'm taking that that's an exclusive. You're welcome for all the geeks I'll bring in with that.", next: 'b2_final' },
  b2_c1: { speaker: 'Theo', line: "(laughing) Relax, nothing's getting out. Promise.", next: 'b2_final' },
  b2_final: { speaker: 'Sana', line: "Right this way — let's start with some history before we meet the residents.", next: 'b3_01' },
  b3_01: { type: 'narration', bg: 'assets/Exhibit_1.png', checkpoint: 2,
    text: "Sana leads them into a dim, cathedral-quiet hall. A massive skeleton looms over a red carpet.", next: 'b3_02' },
  b3_02: { speaker: 'Esme', line: "Okay this is actually kind of beautiful.", next: 'b3_03' },
  b3_03: { speaker: 'Ace',  line: "Kind of creepy too.", next: 'b3_04' },
  b3_04: { speaker: 'Sana', line: "That's the idea. Respect first, excitement second.", next: 'cp_b3' },
  cp_b3: { type: 'choice', options: [
    { text: "The skull alone would've been three meters long.", next: 'b3_a1' },
    { text: "I've seen replicas. This one's better.", next: 'b3_b1' }
  ]},
  b3_a1: { speaker: 'Kira', line: "Didn't ask, but okay.", next: 'b3_final' },
  b3_b1: { speaker: 'Sana', line: "Most people don't know the difference. You do.", next: 'b3_final' },
  b3_final: { speaker: 'Theo', line: "Wait til you see the live ones. Way less dusty.", next: 'b4_01' },
  b4_01: { type: 'narration', bg: 'assets/Exhibit_B.png', checkpoint: 3,
    text: "A gentler exhibit — a duck-billed dinosaur grazing near a low fence.", next: 'b4_02' },
  b4_02: { speaker: 'Kira', line: "This one's actually kind of cute.", next: 'b4_03' },
  b4_03: { speaker: 'Ace',  line: "It's massive.", next: 'b4_04' },
  b4_04: { speaker: 'Kira', line: "Massive and cute aren't mutually exclusive, Ace.", next: 'b4_05' },
  b4_05: { speaker: 'Esme', line: "(reading sign) 'Beaks may be sharp.' Noted.", next: 'cp_b4' },
  cp_b4: { type: 'choice', options: [
    { text: "Parasaurolophus. Totally harmless, herd animal.", next: 'b4_a1' },
    { text: "I wouldn't get too close anyway.", next: 'b4_b1' }
  ]},
  b4_a1: { speaker: 'Ace',  line: "See, this is why we bring the nerd.", next: 'b5_01' },
  b4_b1: { speaker: 'Theo', line: "Smart. Not everyone here got that memo.", next: 'b5_01' },
  b5_01: { type: 'narration', bg: 'assets/Exhibit_C.png', checkpoint: 4,
    text: "A massive glass wall. Something enormous glides past in blue light.", next: 'b5_02' },
  b5_02: { speaker: 'Esme', line: "...okay, THIS is the photo.", next: 'b5_03' },
  b5_03: { speaker: 'Ace',  line: "That thing could eat the T-Rex.", next: 'b5_04' },
  b5_04: { speaker: 'Sana', line: "Different era, but I like your enthusiasm.", next: 'b5_05' },
  b5_05: { speaker: 'Theo', line: "Save some of that energy — tonight you guys get to see the lab. Behind-the-scenes stuff, most guests never see it.", next: 'b5_06' },
  b5_06: { speaker: 'Ace',  line: "Wait, seriously?", next: 'b5_07' },
  b5_07: { speaker: 'Sana', line: "Seriously. But that's later. Let's get you into the vehicles — the real tour's about to start.", next: 'b5_map' },
  b5_map: { speaker: 'Theo', line: "Oh — you've each got a live park map on your wrist unit now that the tour's starting. Tap it anytime, shows exactly where you are on the island.", revealTravelUI: true, next: 'b5_map2' },
  b5_map2: { speaker: 'Kira', line: "Handy.", next: 'b6_01' },
  b6_01: { type: 'narration', bg: 'assets/Vehicle_rea.png', checkpoint: 5,
    text: "A tour vehicle waits, engine idling.", next: 'b6_02' },
  b6_02: { speaker: 'Theo', line: "Everyone pile in. Sana and I will be right up front the whole time.", next: 'b6_03' },
  b6_03: { speaker: 'Kira', line: "Are these things safe?", next: 'b6_04' },
  b6_04: { speaker: 'Sana', line: "Reinforced, tracked, and I've done this drive more times than I can count. You're in good hands.", next: 'b6_05' },
  b6_05: { speaker: 'Ace',  line: "Called it. Actual paddocks.", next: 'b7_01' },
  b7_01: { type: 'narration', bg: 'assets/BEAT_7.png',
    text: "The vehicle pulls onto a tree-lined path. Everything is calm, golden, perfect.", next: 'b7_02' },
  b7_02: { speaker: 'Esme',   line: "Okay, this already beats every theme park I've been to.", next: 'b7_03' },
  b7_03: { speaker: 'Darius', line: "Wait til we actually see something move.", next: 'b7_radio' },
  b7_radio: { type: 'radio',
    text: "—control, be advised, we're seeing a Sector 4 fault on the north—[static]—repeat, containment integrity check failing on—[static]—advise hold on tour routing until—", next: 'b7_04' },
  b7_04: { speaker: 'Theo', line: "(reaching for the radio) ...that's not great.", next: 'b7_05' },
  b7_05: { speaker: 'Sana', line: "(calm, unfazed) Happens more than you'd think. Systems flag conservatively out here.", next: 'b7_06' },
  b7_06: { speaker: 'Theo', line: "You wanna call it in?", next: 'b7_07' },
  b7_07: { speaker: 'Sana', line: "Keep going. If it's serious, dispatch will radio direct.", next: 'b7_08' },
  b7_08: { type: 'narration', radioState: 'idle', radioLabel: 'STANDBY',
    text: "The radio falls silent again. The vehicle keeps moving.", next: 'b8_01' },
  b8_01: { type: 'narration', bg: 'assets/Paddock_1.png', checkpoint: 6,
    text: "The vehicle stops beside a vast netted enclosure. Shapes wheel overhead, then drop low over the path.", next: 'b8_02' },
  b8_02: { speaker: 'Esme', line: "Oh my god, are those—", next: 'b8_03' },
  b8_03: { speaker: 'Ace',  line: "OKAY. Okay, THIS is what I'm talking about.", next: 'b8_04' },
  b8_04: { speaker: 'Kira', line: "...yeah, alright, that's cool.", next: 'b8_05' },
  b8_05: { speaker: 'Ace',  line: "Darius, what are those?", next: 'cp_b8' },
  cp_b8: { type: 'choice', options: [
    { text: "Pterosaurs. Not technically dinosaurs, but nobody wants to hear that.", next: 'b8_a1' },
    { text: "Those wingspans could probably take your hat off.", next: 'b8_b1' },
    { text: "Ask Sana, she probably knows more than me here.", next: 'b8_c1' }
  ]},
  b8_a1: { speaker: 'Esme', line: "Wait, THAT'S not a dinosaur? Then what have I been posting all day.", next: 'b9_01' },
  b8_b1: { speaker: 'Ace',  line: "...noted. Keeping the window up.", next: 'b9_01' },
  b8_c1: { speaker: 'Sana', line: "(smiling) He's not wrong to ask you first, but go ahead.", next: 'b9_01' },
  b9_01: { type: 'narration', bg: 'assets/Paddock_2.png', checkpoint: 7,
    text: "The vehicle stops at a stone gate leading into dense jungle. Small shapes dart past the tree line, just out of clear view.", next: 'b9_02' },
  b9_02: { speaker: 'Kira', line: "This one feels different.", next: 'b9_03' },
  b9_03: { speaker: 'Theo', line: "Different terrain, different residents.", next: 'b9_04' },
  b9_04: { type: 'narration', lightFlicker: true,
    text: "A perimeter light flickers, once, then steadies.", next: 'b9_05' },
  b9_05: { speaker: 'Esme', line: "Did anyone else see that?", next: 'b9_06' },
  b9_06: { speaker: 'Theo', line: "(too quickly) Just the light. Old wiring out here.", next: 'b9_07' },
  b9_07: { speaker: 'Sana', line: "...Right. Old wiring.", next: 'cp_b9' },
  cp_b9: { type: 'choice', options: [
    { text: "Is that normal?", next: 'b9_a1' },
    { text: "(say nothing — just watch Sana's face)", silent: true, next: 'b9_b1' }
  ]},
  b9_a1: { speaker: 'Theo', line: "Totally normal. Promise.", next: 'b10_01' },
  b9_b1: { type: 'narration',
    text: "No one answers. Sana just keeps driving — a little faster than before.", next: 'b10_01' },
  b10_01: { type: 'narration', bg: 'assets/Road.png', checkpoint: 8,
    text: "The road curves past a sign marking the next enclosure. The trees close in, and the tracked path presses deeper into the reserve.", next: 'b10_flash' },
  b10_flash: { type: 'narration', powerFlash: true, bg: 'assets/BRROM_BROOM.png', fit: 'cover', distortion: true, driving: true,
    mapPowerLost: true, radioState: 'lost', radioLabel: 'SIGNAL LOST',
    text: "Then, all at once, the road lights die.", next: 'b10a_01' },
  b10a_01: { speaker: 'Sana', line: "We're heading back. Now.", next: 'b10a_02' },
  b10a_02: { speaker: 'Theo',
    line: "There's still good stuff on the way back — Diplodocus, Ankylosaurus, Triceratops, the baby dinos. All close to base camp.",
    revealRestrictedZone: true,
    setMapDestination: ['Diplodocus Paddock', 'Ankylosaurus Paddock', 'Triceratops Paddock', 'Baby Dinosaur Exhibit'],
    next: 'b10a_03' },
  b10a_03: { type: 'narration',
    text: "Sana keeps glancing at the dashboard. Worth checking the map.", next: 'b10a_call' },
  b10a_call: { type: 'radio', critical: true,
    text: "—can't get a clean signal, say again— maintenance logs don't match the outage. Numbers were touched before the storm even hit. Sana, copy? We need you back at— [heavy static] —now. Not later.", next: 'b10a_04' },
  b10a_04: { speaker: 'Sana', line: "...I need to get to the control room.", next: 'b10a_05' },
  b10a_05: { speaker: 'Theo', line: "Go, go — I've got them.", next: 'b10a_06' },
  b10a_06: { type: 'narration',
    text: "Sana's out of the vehicle, already sprinting for the service path before anyone can argue.", next: 'b10a_07' },
  b10a_07: { speaker: 'Theo', line: "Okay. Okay! Everyone buckled? We're going straight back.", next: 'b10a_08' },
  b10a_08: { speaker: 'Theo', line: "Keep an eye on your maps — tell me if your trackers drop.",
    pinMapOpen: true, glitchTrexEntry: true, next: 'b10a_09' },
  b10a_09: { type: 'narration',
    text: "The road bends — and the fence line out here belongs to a paddock that was never on today's schedule.", next: 'b10a_10' },
  b10a_10: { speaker: 'Esme', line: "...guys? What is that?", next: 'b11_01' },
  b11_01: { type: 'narration', bg: 'BLACK', checkpoint: 9, radioState: 'offline', radioLabel: 'NO SIGNAL', distortion: false, driving: false, footstepShakes: 3,
    text: "The vehicle stops. The radio at the dash goes dark mid-crackle. Something enormous moves just past the fence — barely visible in the dying light.", next: 'b11_02' },
  b11_02: { speaker: 'Esme',   line: "(barely a whisper) ...oh my god.", next: 'b11_03' },
  b11_03: { speaker: 'Ace',    line: "That's... okay. That's a T-Rex.", next: 'b11_04' },
  b11_04: { speaker: 'Kira',   line: "Nobody get out of the car.", next: 'b11_05' },
  b11_05: { speaker: 'Darius', line: "(quiet) ...Wow.", next: 'b11_06' },
  b11_06: { speaker: 'Darius', line: "Oh god.", next: 'b11_reveal' },
  b11_reveal: { type: 'reveal', bg: 'assets/paddock-3.png', fit: 'cover', holdMs: 2800 }
};
const SCENE4_BEATS = {
  s4_01: { type: 'narration', shakeOnce: true,
    text: "The T-Rex lunges before anyone can move.", next: 's4_02' },
  s4_02: { speaker: 'Theo', line: "GET BACK!", poseSprite: 'assets/theo-push.png', next: 's4_03' },
  s4_03: { type: 'narration', shakeOnce: true,
    text: "He plants himself between Ace and the T-Rex, one arm braced up — as if that could stop it.", next: 's4_04' },
  s4_04: { type: 'narration', bg: 'BLACK', impactFlash: 1, poseSprite: null,
    text: "It's over before anyone can process it. Theo doesn't get up.", next: 's4_05' },
  s4_05: { type: 'narration', poseSprite: 'assets/ace-frozen.png',
    text: "Ace doesn't move. Can't.", next: 's4_06' },
  s4_06: { speaker: 'Kira', line: "We have to go — Ace, come ON—", next: 's4_07' },
  s4_07: { type: 'narration', poseSprite: 'assets/darius-pull.png',
    text: "He doesn't respond. Darius grabs his arm and hauls him upright.", next: 's4_08' },
  s4_08: { speaker: 'Darius', line: "Ace! MOVE!", shakeOnce: true, next: 's4_09' },
  s4_09: { type: 'narration', poseSprite: null,
    text: "For a second, nothing. Then Ace's legs remember how to work — and they're running.",
    bg: 'assets/chase-bg.png', trexChasing: true, chaseFormation: true, next: 's4_10' },
  s4_10: { type: 'narration', bg: 'assets/chase-bg.png', trexChasing: true, chaseFormation: true,
    text: "The ground shakes behind them. Something huge is closing the distance.", next: 's4_chase' },
  s4_chase: { type: 'chase', rounds: 12, hpCostOnFail: 5, next: 's4_12' },
  s4_12: { type: 'narration', aceOvertakes: true,
    text: "Ace pulls ahead — adrenaline finally catching up to his legs.", next: 's4_13' },
  s4_13: { type: 'narration', esmeTrips: true, trexCloseIn: 18,
    text: "Esme trips — and the ground behind them shakes harder. It's right there now.", next: 'cp_s4_esme' },
  cp_s4_esme: { type: 'choice', options: [
    { text: "Go back for her.", hpCost: -50, damageReason: 'Saved Esme',
      addItem: 'esme-gun', setFlag: { name: 'savedEsme', value: true }, esmeSaved: true,
      itemPickup: { icon: 'assets/m99-icon.png', label: 'M-99 Acquired' }, next: 's4_14a' },
    { text: "Keep running.", setFlag: { name: 'savedEsme', value: false }, esmeSaved: false, next: 's4_14b' }
  ]},
  s4_14a: { type: 'narration', gunHandoff: true,
    text: "Darius hauls Esme up. She shoves her M-99 into his hands — \"You'll use this better than me.\"", next: 's4_14a2' },
  s4_14a2: { type: 'narration',
    text: "The delay cost them ground. It's close now — keep pace or it closes the rest.", next: 's4_15' },
  s4_14b: { type: 'narration', shakeOnce: true, impactFlash: 0.9,
    text: "The T-Rex closes the last few feet in a single stride. Its jaws close around her before she can even scream — and Darius keeps running, trying not to hear what's happening behind him.", next: 's4_14b2' },
  s4_14b2: { type: 'narration', crackGun: true, trexCloseIn: 15,
    text: "It plants a foot on the dropped M-99. There's a sharp crack, metal and plastic giving way — and then it's coming for him.", next: 's4_15' },
  s4_15: { type: 'narration', burstSpeed: true,
    text: "Something changes. The ground stops shaking as hard.", next: 's4_16' },
  s4_16: { type: 'narration', trexRetreat: true,
    text: "The T-Rex is falling behind — slower now, or maybe just done chasing something this fast. In seconds it's swallowed by the dark behind them.", next: 's4_17' },
  s4_17: { type: 'narration', trexChasing: false, stopGapMeter: true,
    text: "Nobody stops running. Not yet. But the worst of it is behind them now.", next: null }
};
const SCENE5_BEATS = {
  p1: { type: 'narration', bg: 'assets/chase-bg.png', fit: 'cover', chaseFormation: true,
    text: "They don't stop running until their legs just quit cooperating. Gasping, half-collapsed against a low wall.", next: 'p2' },
  p2: { speaker: 'Kira', line: "We can't just keep running blind.", next: 'p3' },
  p3: { speaker: 'Darius', line: "Working on it—", next: 'p4' },
  p4: { speaker: 'Ace', line: "There.", next: 'p5' },
  p5: { type: 'narration', bg: 'assets/lab-exterior.png', fit: 'cover', chaseFormation: false,
    text: "A squat concrete building through the treeline, half-swallowed by dark. Lights still on inside.", next: 'p6' },
  p6: { speaker: 'Kira', line: "That's on the restricted list.", next: 'p7' },
  p7: { speaker: 'Darius', line: "Yeah. Also the only door I can see that still works.", next: 'p8' },
  p8: { type: 'narration',
    text: "Nobody argues with that logic. They run for it.", next: 's5_01' },
  s5_01: { type: 'narration', bg: 'assets/lab-interior.png', fit: 'cover',
    text: "The door slams shut. For a second, nobody moves. Nobody even breathes right.", next: 's5_02' },
  s5_02: { speaker: 'Kira', line: "Okay. Everyone say something. Anything.", next: 's5_03' },
  s5_03: { speaker: 'Ace', line: "...'m fine.", next: 's5_04' },
  s5_04: { type: 'narration', text: "He is not fine.", next: 's5_04a' },
  s5_04a: { speaker: 'Esme', line: "Still here. Barely.", condition: 'savedEsme', next: 's5_04b' },
  s5_04b: { speaker: 'Darius', line: "Same.", condition: 'savedEsme', next: 's5_05' },
  s5_05: { type: 'narration', text: "Nobody sits down yet. Can't.", next: 's5_06' },
  s5_06: { speaker: 'Ace', line: "He looked right at me.", next: 's5_07' },
  s5_07: { speaker: 'Kira', line: "Ace—", next: 's5_08' },
  s5_08: { speaker: 'Ace', line: "He just — decided that. For no reason.", next: 's5_09' },
  s5_09: { speaker: 'Darius', line: "He had a reason. Wasn't yours, though.", next: 's5_10' },
  s5_10: { speaker: 'Ace', line: "Feels like mine.", next: 's5_11' },
  s5_11: { speaker: 'Darius', line: "Yeah, well. You're stuck with me till it doesn't. C'mon.", next: 's5_12' },
  s5_12: { type: 'narration', text: "Ace huffs — not quite a laugh, but close enough.", next: 's5_13' },
  s5_13: { type: 'narration', text: "The lab's cold, lights still on, coffee still sitting out, gone cold.", next: 's5_14' },
  s5_14: { speaker: 'Kira', line: "...Someone was just here.", next: 's5_15' },
  s5_15: { type: 'narration', text: "That's when they see him. Slumped at a console in the back. Not moving.", next: 's5_16' },
  s5_16: { speaker: 'Darius', line: "...that's Voss.", next: 's5_17' },
  s5_17: { speaker: 'Ace', line: "You know that guy?", next: 's5_18' },
  s5_18: { speaker: 'Darius', line: "Read everything he ever published. Wanted to work under him someday.", next: 's5_18b' },
  s5_18b: { speaker: 'Darius', line: "Not like this, though.", next: 's5_19' },
  s5_19: { speaker: 'Kira', line: "Don't get close.", next: 's5_19b' },
  s5_19b: { type: 'narration', showJournalSearch: 's5_20',
    text: "Something's buried under the mess of papers on the desk.", next: null },
  s5_20: { speaker: 'Darius', line: "There's a journal.", next: 's5_21' },
  s5_21: { type: 'narration', text: "An empty injector by his hand. Not an accident.", next: 's5_22' },
  s5_22: { speaker: 'Darius', line: "...he wasn't just building a park. Listen — \"applications extend well beyond containment, if the right people saw what these animals could—\"", next: 's5_23' },
  s5_23: { speaker: 'Kira', line: "Meaning?", next: 's5_24' },
  s5_24: { speaker: 'Darius', line: "Meaning weapons. He wanted to weaponize them.", next: 's5_25' },
  s5_25: { speaker: 'Ace', line: "Cool. Cool cool cool.", next: 's5_26' },
  s5_26: { type: 'narration', text: "The writing gets messier further in. Shorter. Scared.", next: 's5_27' },
  s5_27: { speaker: 'Darius', line: "\"Three days, maybe less, before they move on the island directly.\"", next: 's5_27b' },
  s5_27b: { speaker: 'Darius', line: "Someone found out what he was doing.", next: 's5_28' },
  s5_28: { speaker: 'Kira', line: "So he panicked?", next: 's5_29' },
  s5_29: { speaker: 'Darius', line: "Worse. \"Weakened the east perimeter myself. Let it read as natural failure.\"", next: 's5_29b' },
  s5_29b: { speaker: 'Darius', line: "He tanked his own security. On purpose. So it'd look like an accident instead of a cover-up.", next: 's5_30' },
  s5_30: { speaker: 'Ace', line: "That's — that's why any of this happened? For an alibi?", next: 's5_31' },
  s5_31: { type: 'narration', text: "Nobody's got a response to that one.", next: 's5_32' },
  s5_32: { speaker: 'Darius', line: "Wait.", next: 's5_32b' },
  s5_32b: { speaker: 'Darius', line: "\"S. found the discrepancy. Called it in herself. Wants a full investigation — extra security for anyone on-site.\"", next: 's5_33' },
  s5_33: { speaker: 'Kira', line: "...Sana?", next: 's5_34' },
  s5_34: { speaker: 'Ace', line: "That's what she wouldn't say on the radio.", next: 's5_35' },
  s5_35: { speaker: 'Darius', line: "She wasn't running to fix a glitch. She was running to stop him.", next: 's5_36' },
  s5_36: { speaker: 'Kira', line: "Didn't make it in time, then.", next: 's5_37' },
  s5_37: { speaker: 'Darius', line: "\"Protocol handles containment. [REDACTED] already has what's needed. Long gone.\"", next: 's5_38' },
  s5_38: { speaker: 'Ace', line: "Who's redacted?", next: 's5_39' },
  s5_39: { speaker: 'Darius', line: "No clue. Not a name I've ever seen next to his.", next: 's5_40' },
  s5_40: { type: 'narration', text: "Whoever that is, they're already off the island. With whatever \"needed\" means.", next: 's5_40a' },
  s5_40a: { type: 'narration', showPasswordWall: 's5_40b',
    text: "Something's scratched into the wall near the console — quick, hurried handwriting.", next: null },
  s5_40b: { type: 'narration', text: "A password. Whoever wrote it wanted someone to find it.", next: 's5_40c' },
  s5_40c: { type: 'narration', showWatchPickup: 's5_40d',
    text: "Beside it, a second tracker watch — still blinking, still powered.", next: null },
  s5_40d: { type: 'narration', text: "Darius straps it on. Static clears from the earpiece. The display flickers back to life.", next: 's5_41' },
  s5_41: { speaker: 'Kira', line: "Can't do anything about that part. Let's do something about the part we can.", next: 's5_42' },
  s5_42: { type: 'narration', openTerminal: 's5_43',
    text: "Darius pulls up the main terminal — still live, still logging. The password gets him past the lock screen.", next: null },
  s5_43: { speaker: 'Kira', line: "Raptors are still contained. For now.", next: 's5_44' },
  s5_44: { speaker: 'Darius', line: "Helipad's past their paddock. East gate.", next: 's5_45' },
  s5_45: { speaker: 'Ace', line: "So we go around.", next: 's5_46' },
  s5_46: { speaker: 'Darius', line: "There's no around. Only way to the east gate is straight through the west gate's territory first.", next: 's5_47' },
  s5_47: { type: 'narration', text: "Right past the one thing standing between \"contained\" and \"not.\"", next: 's5_48' },
  s5_48: { speaker: 'Kira', line: "Okay. Fastest way through this — Darius, you're the one who can actually read that terminal.", next: 's5_49' },
  s5_49: { speaker: 'Darius', line: "I can work it. Probably.", next: 's5_50' },
  s5_50: { speaker: 'Kira', line: "Good enough. You and me, control room, try to lock the east route before we move anywhere.", next: 's5_51' },
  s5_51: { speaker: 'Ace', line: "And us?", condition: 'savedEsme', next: 's5_51b' },
  s5_51b: { speaker: 'Ace', line: "And me?", conditionNot: 'savedEsme', next: 's5_52' },
  s5_52: { speaker: 'Kira', line: "Stay by the door. Fastest way to warn us if something's wrong.", next: 's5_53' },
  s5_53: { speaker: 'Esme', line: "You're sure you know how that thing works?", condition: 'savedEsme', next: 's5_54' },
  s5_54: { speaker: 'Darius', line: "No. But I'm the closest thing to sure we've got.", condition: 'savedEsme', next: 's5_55' },
  s5_55: { speaker: 'Esme', line: "Comforting.", condition: 'savedEsme', next: 's5_56' },
  s5_56: { speaker: 'Esme', line: "You'll come back.", condition: 'savedEsme', next: 's5_57' },
  s5_57: { speaker: 'Kira', line: "That's the plan.", condition: 'savedEsme', next: 's5_58' },
  s5_58: { speaker: 'Esme', line: "That's not what I asked.", condition: 'savedEsme', next: 's5_59' },
  s5_59: { speaker: 'Kira', line: "...Yeah. We'll come back.", condition: 'savedEsme', next: null }
};
const SCENE6_BEATS = {
  s6_01: { type: 'narration', bg: 'assets/lab-control-room.png', fit: 'cover',
    text: "Darius and Kira peel off toward the control room. Ace stays by the entrance — the fastest warning if something's wrong.", next: 's6_01b' },
  s6_01b: { speaker: 'Esme', line: "I'll stay too.", condition: 'savedEsme', next: 's6_01c' },
  s6_01c: { speaker: 'Ace', line: "You don't have to.", condition: 'savedEsme', next: 's6_01d' },
  s6_01d: { speaker: 'Esme', line: "I know. I'm staying anyway.", condition: 'savedEsme', next: 's6_01e' },
  s6_01e: { type: 'narration', conditionNot: 'savedEsme',
    text: "Ace stands at the entrance alone. Nobody says her name. Nobody has to.", next: 's6_02' },
  s6_02: { type: 'narration', text: "The control room's smaller than the main lab. Rows of dead monitors, one bank still glowing.", next: 's6_03' },
  s6_03: { speaker: 'Kira', line: "Try the radio first.", next: 's6_04' },
  s6_04: { type: 'narration', text: "Darius picks up the handset. First time it's actually worked since the power died.", next: 's6_05' },
  s6_05: { speaker: 'Darius', line: "Sana? Sana, can you hear me?", next: 's6_06' },
  s6_06: { type: 'narration', text: "A beat of static. Then it clears.", next: 's6_07' },
  s6_07: { speaker: 'Sana', line: "...Darius. Oh, thank god. You're all okay?", next: 's6_08' },
  s6_08: { speaker: 'Darius', line: "For now. We need—", next: 's6_09' },
  s6_09: { speaker: 'Sana', line: "Tell me what you need.", next: 's6_10' },
  s6_10: { type: 'narration', text: "He gives her the shape of it — the helipad, the route, the gate.", next: 's6_11' },
  s6_11: { speaker: 'Sana', line: "Got a bird from the visitor center. Lifting off now. Hang on.", next: 's6_12' },
  s6_12: { type: 'narration', text: "The line stays open, quiet static, while she flies.", next: 's6_13' },
  s6_13: { speaker: 'Kira', line: "Okay. Gate controls should be right here.", next: 's6_14' },
  s6_14: { type: 'narration', text: "Helipad gate — unlocked. Clean, no resistance.", next: 's6_15' },
  s6_15: { speaker: 'Darius', line: "One down.", next: 's6_16' },
  s6_16: { speaker: 'Kira', line: "Now the raptor gate. Seal it before we go anywhere near that route.", next: 's6_17' },
  s6_17: { type: 'narration', text: "Darius keys in the sequence. The console stutters.", next: 's6_18' },
  s6_18: { type: 'narration', shakeOnce: true, distortion: true,
    text: "The screen glitches — hard. Characters scrambling, the seal command looping on itself.", next: 's6_18b' },
  s6_18b: { type: 'narration',
    text: "At the door, the floor shudders too. Whatever's happening, it isn't staying contained to one room.", next: 's6_18c' },
  s6_18c: { speaker: 'Esme', line: "That felt bigger than the last one.", condition: 'savedEsme', next: 's6_18d' },
  s6_18d: { speaker: 'Ace', line: "Yeah. Let's not mention that to them right now.", condition: 'savedEsme', next: 's6_19' },
  s6_19: { speaker: 'Kira', line: "What is that—", next: 's6_20' },
  s6_20: { speaker: 'Darius', line: "It's not taking the command. Something's fighting it.", next: 's6_hijack' },
  s6_hijack: { type: 'hijack', next: 's6_21' },
  s6_21: { type: 'narration', startGateTimer: 240,
    text: "A countdown appears where the confirmation should be. The gate isn't sealing. It's failing — just not all at once.", next: 's6_22' },
  s6_22: { speaker: 'Kira', line: "...How long.", next: 's6_23' },
  s6_23: { speaker: 'Darius', line: "Four minutes. Maybe less by the time we're moving.", next: 's6_24' },
  s6_24: { speaker: 'Sana', line: "Five minutes. Maybe less—", next: 's6_25' },
  s6_25: { type: 'narration', text: "A beat. Something changes in her voice.", next: 's6_26' },
  s6_26: { speaker: 'Sana', line: "—that's not right. That's not—", next: 's6_27' },
  s6_27: { type: 'narration', distortion: true,
    text: "Alarms underneath her voice now. Mechanical, not natural.", next: 's6_28' },
  s6_28: { speaker: 'Sana', line: "I'm losing— hydraulic's not—", next: 's6_29' },
  s6_29: { type: 'narration', footstepShakes: 4, next: 's6_30' },
  s6_30: { type: 'narration', bg: 'BLACK', impactFlash: 1, distortion: false, radioState: 'offline', radioLabel: 'NO SIGNAL',
    text: "Silence. Not static this time. Worse.", next: 's6_31' },
  s6_31: { speaker: 'Kira', line: "Sana?", next: 's6_32' },
  s6_32: { type: 'narration', text: "Nothing.", next: 's6_33' },
  s6_33: { speaker: 'Kira', line: "Sana.", next: 's6_34' },
  s6_34: { type: 'narration', text: "Still nothing.", next: 's6_35' },
  s6_35: { speaker: 'Darius', line: "...She said five minutes.", next: 's6_36' },
  s6_36: { type: 'narration', text: "Nobody has anything to say to that. Not yet.", next: 's6_37' },
  s6_37: { speaker: 'Darius', line: "The same systems he let rot. To fake the last one.", next: 's6_38' },
  s6_38: { speaker: 'Kira', line: "You're saying—", next: 's6_39' },
  s6_39: { speaker: 'Darius', line: "I'm saying it was never fixed. Any of it.", next: 's6_40' },
  s6_40: { type: 'narration', text: "The countdown keeps running. Nobody's watching it right now. It doesn't stop for that.", next: null }
};
const SCENE7_BEATS = {
  s7_01: { type: 'narration', bg: 'assets/raptor-encounter-bg.png', fit: 'cover', running: true, chaseFormation: true,
    text: "They're already moving — the gate timer eating into itself with every step.", next: 's7_02' },
  s7_02: { type: 'narration', showAmmoSearch: 's7_03',
    text: "No time to stop and check ammo properly. Just time to grab what's there and keep moving.", next: null },
  s7_03: { type: 'narration', text: "Whatever they've got, it has to be enough.", next: 's7_04' },
  s7_04: { type: 'narration', text: "Something's keeping pace with them, just out of the light.", next: 's7_raptor1' },

  s7_raptor1: { type: 'raptor', rounds: 1, hpCostOnFail: 12, next: 's7_between1' },
  s7_between1: { type: 'narration', text: "One down. The gate's still a long way off.", next: 's7_raptor2' },

  s7_raptor2: { type: 'raptor', rounds: 1, hpCostOnFail: 12, next: 's7_lunge_intro' },
  s7_lunge_intro: { type: 'narration', text: "For a second, running feels almost survivable.", next: 's7_lunge' },

  s7_lunge: { type: 'raptorLunge', next: 's7_after_lunge' },
  s7_after_lunge: { type: 'narration', stumble: true, text: "Darius goes down hard — leg screaming, vision swimming at the edges.", next: 's7_after_lunge2' },
  s7_after_lunge2: { speaker: 'Kira', line: "Darius!", next: 's7_after_lunge3' },
  s7_after_lunge3: { speaker: 'Darius', line: "I'm up. I'm up—", next: 's7_gate_arrival' },

  s7_gate_arrival: { type: 'narration', stopGateTimer: true, running: false, chaseFormation: false,
    text: "The gate. They actually made it.", next: 's7_ace1' },
  s7_ace1: { speaker: 'Ace', line: "...guys, wait.", next: 's7_ace2' },
  s7_ace2: { type: 'narration', text: "He's stopped just past the threshold, looking back at the gate mechanism like it just occurred to him.", next: 's7_ace3' },
  s7_ace3: { speaker: 'Kira', line: "Ace — come ON, we're almost—", next: 's7_ace4' },
  s7_ace4: { speaker: 'Ace', line: "It's not going to hold long enough for all of us. Someone has to reset the seal from this side once you're clear.", next: 's7_ace5' },
  s7_ace5: { speaker: 'Darius', line: "Then I'll do it. You go.", next: 's7_ace6' },
  s7_ace6: { speaker: 'Ace', line: "You don't know the panel. I watched Kira work it back there — actually paid attention, for once.", next: 's7_ace7' },
  s7_ace7: { speaker: 'Darius', line: "Ace—", next: 's7_ace8' },
  s7_ace8: { speaker: 'Ace', line: "Kind of funny. First time in my life I'm actually useful for something. And it's this.", next: 's7_ace9' },
  s7_ace9: { type: 'narration', text: "He's already moving to the panel — hands steadier than anything about tonight should let them be.", next: 's7_ace10' },
  s7_ace10: { speaker: 'Ace', line: "GO. I mean it.", next: 's7_ace11' },
  s7_ace11: { type: 'narration', shakeOnce: true,
    text: "Darius lunges back toward him. Kira's the one who catches his arm — hard — and doesn't let go.", next: 's7_ace12' },
  s7_ace12: { speaker: 'Esme', line: "Darius—", condition: 'savedEsme', next: 's7_ace13' },
  s7_ace13: { type: 'narration', bg: 'BLACK', impactFlash: 0.8,
    text: "The gate seals. Whatever's on the other side of it now, they don't get to see.", next: 's7_end' },
  s7_end: { type: 'narration', text: "Nobody says his name for a long time.", next: null }
};

const SCENE8_BEATS = {
  s8_01: { type: 'narration', bg: 'assets/coast-helipad.png', fit: 'cover',
    text: "They don't remember most of the walk to the coast. Just that it took longer than it should have, and nobody talked much.", next: 's8_02' },
  s8_02: { type: 'narration', text: "Lights ahead — a helipad marked into the sand, and something already sitting on it, rotors still turning.", next: 's8_03' },
  s8_03: { speaker: 'Kira', line: "That's not Sana's.", next: 's8_04' },
  s8_04: { type: 'narration', text: "It isn't. Unmarked, black, nothing park-issued about it.", next: 's8_05' },
  s8_05: { speaker: 'Darius', line: "Then who—", next: 's8_06' },
  s8_06: { type: 'narration', text: "A figure steps down from the cabin before he finishes the sentence.", next: 's8_07' },
  s8_07: { type: 'narration', text: "\"We're not with the island.\" A woman's voice, calm, used to this. \"We got a distress call a few hours ago. Said her name was Sana.\"", next: 's8_08' },
  s8_08: { speaker: 'Kira', line: "She's not — she didn't make it.", next: 's8_09' },
  s8_09: { type: 'narration', text: "\"We know. We tried to reach her in time. We didn't.\" A pause, not unkind. \"She wasn't calling for herself. She was reporting what was happening here — and asking someone to get the kids off this island.\"", next: 's8_10' },
  s8_10: { speaker: 'Kira', line: "Who even are you?", next: 's8_11' },
  s8_11: { type: 'narration', text: "\"Not government. Let's leave it there for now.\" She gestures toward the open cabin door. \"We can talk about the rest once you're in the air.\"", next: 's8_12' },
  s8_12: { type: 'narration', text: "Nobody argues. Nobody has anything left to argue with.", next: null }
};

const SCENE9_BEATS = {
  s9_01: { type: 'narration', bg: 'assets/rescue-cabin.jpg', fit: 'cover',
    text: "The cabin is quiet. Nobody's said much since the coast.", next: 's9_02' },
  s9_02: { speaker: 'Kira', line: "...We should have made him come with us.", next: 's9_03' },
  s9_03: { speaker: 'Darius', line: "He wouldn't have. You know that.", next: 's9_04' },
  s9_04: { type: 'narration', text: "Someone leans back from the cockpit. Not rushing. That's what makes Darius look up.", next: 's9_05' },
  s9_05: { type: 'narration', text: "\"We picked someone else up. About twenty minutes ago, other side of the reserve.\"", next: 's9_06' },
  s9_06: { speaker: 'Kira', line: "...What?", next: 's9_07' },
  s9_07: { type: 'narration', text: "\"Kid says his name's Ace.\"", next: 's9_08' },
  s9_08: { type: 'narration', text: "For a second, nobody in the cabin breathes right.", next: 's9_09' },
  s9_09: { type: 'narration', text: "Then Darius is already moving.", next: 's9_10' },
  s9_10: { type: 'narration', text: "Ace looks wrecked — banged up, one arm wrapped, walking like it hurts to. But he's standing.", next: 's9_11' },
  s9_11: { speaker: 'Ace', line: "There was a maintenance hatch behind the panel. Didn't plan that part. Kind of just — happened.", next: 's9_12' },
  s9_12: { speaker: 'Darius', line: "You absolute idiot.", next: 's9_13' },
  s9_13: { speaker: 'Ace', line: "Yeah. Probably.", next: 's9_14' },
  s9_14: { type: 'narration', text: "Darius doesn't say anything else. He just doesn't let go of him for a while.", next: 's9_15' },
  s9_15: { type: 'narration', text: "The woman from the coast finds them later, once the island's just a dark shape behind them, shrinking.", next: 's9_16' },
  s9_16: { type: 'narration', text: "\"Sana's report is what got us moving. Whoever was running that lab wasn't supposed to be able to do what they did. We're still working out how far it goes.\"", next: 's9_17' },
  s9_17: { speaker: 'Darius', line: "Are you the ones he was hiding from?", next: 's9_18' },
  s9_18: { type: 'narration', text: "\"Something like that. We're not interested in what he was building. We're interested in making sure nobody else finishes it.\"", next: 's9_19' },
  s9_19: { type: 'narration', text: "She doesn't explain further. Nobody asks her to, not tonight.", next: 's9_20' },
  s9_20: { type: 'narration', text: "The sky's starting to lighten at the edge of the water. Nobody's slept. Nobody's going to, not yet.", next: 's9_21' },
  s9_21: { speaker: 'Kira', line: "Some perfect day.", next: 's9_22' },
  s9_22: { speaker: 'Darius', line: "...Yeah.", next: 's9_23' },
  s9_23: { type: 'narration', text: "He looks back once, at the line where the island used to be. Then at the people still sitting next to him.", next: 's9_24' },
  s9_24: { speaker: 'Darius', line: "Still the most interesting one I've ever had, though.", next: 's9_25' },
  s9_25: { type: 'narration', text: "Nobody laughs. But somebody almost does. That's enough, for now.", next: null }
};

const SCENES = {
  2: {
    number: 'Scene 02',
    title: 'Arrival',
    location: 'Aboard the Transport Aircraft',
    role: 'Playing as <span>Darius</span>, en route with friends',
    startBg: 'assets/aircraft-interior.png',
    startFit: 'cover',
    startId: 's1_01',
    beats: SCENE2_BEATS,
    next: 3
  },
  3: {
    number: 'Scene 03',
    title: 'The Perfect Day',
    location: 'Jurassic Isle',
    role: 'Playing as <span>Darius</span>, on tour',
    startBg: 'assets/Landing.png',
    startFit: 'contain',
    startId: 'b1_01',
    beats: SCENE3_BEATS,
    next: 4
  },
  4: {
    number: 'Scene 04',
    title: 'Run',
    location: 'T-Rex Paddock',
    role: 'Playing as <span>Darius</span>',
    startBg: 'assets/paddock-3.png',
    startFit: 'cover',
    startId: 's4_01',
    beats: SCENE4_BEATS,
    next: 5
  },
  5: {
    number: 'Scene 05',
    title: 'The Laboratory',
    location: 'Jurassic Isle',
    role: 'Playing as <span>Darius</span>',
    startBg: 'assets/chase-bg.png',
    startFit: 'cover',
    startId: 'p1',
    beats: SCENE5_BEATS,
    next: 6
  },
  6: {
    number: 'Scene 06',
    title: 'The Call',
    location: 'The Laboratory',
    role: 'Playing as <span>Darius</span>',
    startBg: 'assets/lab-interior.png',
    startFit: 'cover',
    startId: 's6_01',
    beats: SCENE6_BEATS,
    next: 7
  },
  7: {
    number: 'Scene 07',
    title: 'The Gauntlet',
    location: 'Raptor Paddock Perimeter',
    role: 'Playing as <span>Darius</span>',
    startBg: 'assets/raptor-encounter-bg.png',
    startFit: 'cover',
    startId: 's7_01',
    beats: SCENE7_BEATS,
    next: 8
  },
  8: {
    number: 'Scene 08',
    title: 'The Coast',
    location: 'Jurassic Isle',
    role: 'Playing as <span>Darius</span>',
    startBg: 'assets/coast-helipad.png',
    startFit: 'cover',
    startId: 's8_01',
    beats: SCENE8_BEATS,
    next: 9
  },
  9: {
    number: 'Scene 09',
    title: 'After',
    location: 'Open Water',
    role: 'Playing as <span>Darius</span>',
    startBg: 'assets/rescue-cabin.jpg',
    startFit: 'cover',
    startId: 's9_01',
    beats: SCENE9_BEATS,
    next: null
  }
};
function loadScene2() {
  GameState.set('hp', 100);
  loadScene(2);
}
function loadScene(id) {
  const data = SCENES[id];
  mapOverlay.classList.add('hidden');
  mapPinned = false;
  mapPowerLost = false;
  mapUpgraded = false;
  restrictedZoneRevealed = false;
  trexGlitching = false;
  setChaseFormation(false);
  setTrexChasing(false);
  stopThreatMeter();
  stopGateTimer();
  ammoWrap.classList.add('hidden');
  raptorSprite.classList.add('hidden');
  raptorLungeSprite.classList.add('hidden');
  terminalOverlay.classList.add('hidden');
  hijackOverlay.classList.add('hidden');
  bg.classList.remove('chase-pan', 'drive-pan');
  dialogueBox.classList.add('hidden');
  dialogueBox.classList.remove('narration', 'chase-top');
  choiceBox.classList.add('hidden');
  continueBtn.classList.add('hidden');
  dariusSprite.classList.add('hidden');
  bg.style.transition = 'none';
  bg.style.opacity = 1;
  bg.style.objectFit = data.startFit || 'cover';
  bg.src = data.startBg;
  bg.alt = '';
  currentBg = data.startBg;
  restartPan();
  chapterNum.textContent = data.number;
  chapterTitle.textContent = data.title;
  chapterLocation.textContent = data.location;
  chapterRole.innerHTML = data.role;
  chapterCard.style.transition = 'none';
  chapterCard.classList.add('visible');
  void chapterCard.offsetWidth;
  chapterCard.style.transition = '';
  updateHUD(data.number);
  setTimeout(() => {
    function proceedAfterHold() {
      chapterCard.classList.remove('visible');
      setTimeout(() => startSceneDialogue(id), 600);
    }
    if (bg.complete && bg.naturalWidth > 0) {
      proceedAfterHold();
    } else {
      let done = false;
      const finish = () => { if (done) return; done = true; proceedAfterHold(); };
      bg.addEventListener('load', finish, { once: true });
      bg.addEventListener('error', finish, { once: true });
      setTimeout(finish, 4000);
    }
  }, 3200);
}
function startSceneDialogue(id) {
  currentSceneId = id;
  queueActive = true;
  beatHistory = [];
  currentBeatId = null;
  dialogueBox.classList.remove('hidden');
  skipBtn.classList.remove('hidden');
  backBtn.classList.remove('hidden');
  goTo(SCENES[id].startId);
}
function restartPan() {
  bg.classList.remove('pan');
  void bg.offsetWidth;
  bg.classList.add('pan');
}
function changeBackground(src, fit, callback) {
  bg.style.transition = 'opacity 0.4s ease';
  bg.style.opacity = 0;
  setTimeout(() => {
    if (src === 'BLACK') {
      bgFrame.classList.add('blackout');
      currentBg = 'BLACK';
      setTimeout(callback, 420);
      return;
    }
    bgFrame.classList.remove('blackout');
    bg.src = src;
    bg.style.objectFit = fit || 'cover';
    currentBg = src;
    restartPan();
    requestAnimationFrame(() => {
      bg.style.opacity = 1;
    });
    setTimeout(callback, 420);
  }, 400);
}
function goTo(id, opts) {
  const fromHistory = opts && opts.fromHistory;
  const beat = SCENES[currentSceneId].beats[id];
  if (!beat) { sceneComplete(); return; }
  if (beat.condition && !GameState.flags[beat.condition]) {
    goTo(beat.next, opts);
    return;
  }
  if (beat.conditionNot && GameState.flags[beat.conditionNot]) {
    goTo(beat.next, opts);
    return;
  }
  if (!fromHistory && currentBeatId !== null) {
    beatHistory.push(currentBeatId);
    backBtn.classList.remove('hidden');
  }
  currentBeatId = id;
  if (fromHistory) {
    backBtn.classList.toggle('hidden', beatHistory.length === 0);
  }
  if (beat.revealTravelUI) revealTravelUI();
  if (beat.setMapDestination) mapDestination = beat.setMapDestination;
  if (beat.revealRestrictedZone) restrictedZoneRevealed = true;
  if (typeof beat.mapPowerLost === 'boolean') mapPowerLost = beat.mapPowerLost;
  if (beat.footstepShakes) startFootstepShakes(beat.footstepShakes);
  if (beat.shakeOnce) startFootstepShakes(1);
  if (typeof beat.impactFlash === 'number') triggerImpactFlash(beat.impactFlash);
  if (beat.glitchTrexEntry) trexGlitching = true;
  if (typeof beat.trexCloseIn === 'number') trexSurge(beat.trexCloseIn);
  if (beat.gunHandoff) showGunHandoff();
  if (beat.crackGun) showCrackedGun();
  if (beat.stopGapMeter) stopThreatMeter();
  if (beat.trexRetreat) retreatTrex();
  if (beat.burstSpeed) burstSpeed();
  if (beat.showJournalSearch) showJournalSearch(beat.showJournalSearch);
  if (beat.equipWatch) equipWatch();
  if (beat.showPasswordWall) showPasswordWall(beat.showPasswordWall);
  if (beat.showWatchPickup) showWatchPickup(beat.showWatchPickup);
  if (beat.openTerminal) openTerminal(beat.openTerminal);
  if (typeof beat.startGateTimer === 'number') startGateTimer(beat.startGateTimer);
  if (beat.showAmmoSearch) showAmmoSearch(beat.showAmmoSearch);
  if (beat.stopGateTimer) stopGateTimer();
  if (beat.stumble) triggerStumble();
  if (typeof beat.running === "boolean") setRunning(beat.running);
  if (beat.pinMapOpen) { mapPinned = true; restrictedListOpen = true; openMap(); }
  if (typeof beat.checkpoint === 'number') currentCheckpoint = beat.checkpoint;
  if (typeof beat.trexChasing === 'boolean') setTrexChasing(beat.trexChasing);
  if (typeof beat.chaseFormation === 'boolean') setChaseFormation(beat.chaseFormation);
  if (typeof beat.aceOvertakes === 'boolean') setAceOvertakes(beat.aceOvertakes);
  if (typeof beat.esmeTrips === 'boolean') setEsmeTrips(beat.esmeTrips);
  if (typeof beat.esmeSaved === 'boolean') resolveEsme(beat.esmeSaved);
  if (typeof beat.poseSprite !== 'undefined') setPoseSprite(beat.poseSprite);
  if (beat.radioState) setRadioState(beat.radioState, beat.radioLabel || beat.radioState.toUpperCase());
  if (beat.lightFlicker) {
    bgFrame.classList.remove('flicker');
    void bgFrame.offsetWidth;
    bgFrame.classList.add('flicker');
  }
  if (!beat.powerFlash) {
    if (typeof beat.distortion === 'boolean') setDistortion(beat.distortion);
    if (typeof beat.driving === 'boolean') setDriving(beat.driving);
  }
  if (beat.powerFlash) {
    triggerPowerFlash(() => {
      if (beat.bg) {
        bg.style.transition = 'none';
        bg.style.opacity = 1;
        bg.style.objectFit = beat.fit || 'cover';
        bg.src = beat.bg;
        bg.alt = '';
        currentBg = beat.bg;
        restartPan();
      }
      if (typeof beat.distortion === 'boolean') setDistortion(beat.distortion);
      if (typeof beat.driving === 'boolean') setDriving(beat.driving);
    }, () => present());
  }
  function present() {
    if (beat.type === 'choice') {
      presentChoice(beat);
      return;
    }
    if (beat.type === 'chase') {
      runChaseMinigame(beat.rounds || 3, beat.hpCostOnFail || 12, beat.next);
      return;
    }
    if (beat.type === 'raptor') {
      runRaptorGauntlet(beat.rounds || 3, beat.hpCostOnFail || 12, beat.next);
      return;
    }
    if (beat.type === 'raptorLunge') {
      triggerRaptorLunge(beat.next);
      return;
    }
    if (beat.type === 'hijack') {
      runHijackSequence(beat.next);
      return;
    }
    if (beat.type === 'reveal') {
      dialogueBox.classList.add('hidden');
      choiceBox.classList.add('hidden');
      skipBtn.classList.add('hidden');
      backBtn.classList.add('hidden');
      setTimeout(() => {
        bg.style.transition = 'none';
        bg.style.opacity = 0;
        bgFrame.classList.add('blackout');
        currentBg = 'BLACK';
        stopFootstepShakes();
        sceneComplete();
      }, beat.holdMs || 2400);
      return;
    }
    if (beat.type === 'radio') {
      dialogueBox.classList.add('hidden');
      choiceBox.classList.add('hidden');
      ringRadio(beat);
      return;
    }
    dialogueBox.classList.remove('hidden');
    choiceBox.classList.add('hidden');
    pendingNext = beat.next;
    if (beat.type === 'narration') {
      dialogueBox.classList.add('narration');
      typeLine(beat.text);
    } else {
      dialogueBox.classList.remove('narration');
      speakerName.textContent = beat.speaker;
      speakerPortrait.src = PORTRAIT[beat.speaker];
      applySpeakerTheme(beat.speaker);
      if (beat.speaker !== lastSpeaker) {
        speakerPortrait.classList.remove('pop');
        void speakerPortrait.offsetWidth;
        speakerPortrait.classList.add('pop');
        lastSpeaker = beat.speaker;
      }
      typeLine(beat.line);
    }
  }
  if (beat.powerFlash) {
  } else if (beat.bg && beat.bg !== currentBg) {
    changeBackground(beat.bg, beat.fit, present);
  } else {
    present();
  }
}
function presentChoice(beat) {
  dialogueBox.classList.add('hidden');
  choiceOptions.innerHTML = '';
  beat.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'choice-option';
    btn.textContent = opt.text;
    btn.addEventListener('click', () => selectChoice(opt));
    choiceOptions.appendChild(btn);
  });
  choiceBox.classList.remove('hidden');
}
function selectChoice(opt) {
  choiceBox.classList.add('hidden');
  if (typeof opt.hpCost === 'number') applyDamage(opt.hpCost, opt.damageReason || '');
  if (opt.addItem) GameState.addItem(opt.addItem);
  if (opt.itemPickup) showItemPickup(opt.itemPickup.icon, opt.itemPickup.label);
  if (opt.setFlag) GameState.setFlag(opt.setFlag.name, opt.setFlag.value);
  if (typeof opt.esmeSaved === 'boolean') resolveEsme(opt.esmeSaved);
  if (opt.silent) {
    goTo(opt.next);
    return;
  }
  dialogueBox.classList.remove('hidden');
  dialogueBox.classList.remove('narration', 'radio');
  speakerName.textContent = 'Darius';
  speakerPortrait.src = PORTRAIT.Darius;
  applySpeakerTheme('Darius');
  if (lastSpeaker !== 'Darius') {
    speakerPortrait.classList.remove('pop');
    void speakerPortrait.offsetWidth;
    speakerPortrait.classList.add('pop');
    lastSpeaker = 'Darius';
  }
  pendingNext = opt.next;
  typeLine(opt.text);
}
function sceneComplete() {
  queueActive = false;
  pendingNext = null;
  dialogueBox.classList.add('hidden');
  choiceBox.classList.add('hidden');
  skipBtn.classList.add('hidden');
  backBtn.classList.add('hidden');
  continueBtn.classList.remove('hidden');
}
continueBtn.addEventListener('click', () => {
  continueBtn.classList.add('hidden');
  const data = SCENES[currentSceneId];
  const nextId = data && data.next;
  if (nextId && SCENES[nextId]) {
    loadScene(nextId);
  } else {
    showEndingScreen();
  }
});
const endingScreen = document.getElementById('ending-screen');
function showEndingScreen() {
  endingScreen.classList.remove('hidden');
  void endingScreen.offsetWidth;
  endingScreen.classList.add('visible');
}
document.getElementById('ending-restart').addEventListener('click', () => {
  location.reload();
});
function skipToNextImage() {
  if (minigameActive) return;
  if (!choiceBox.classList.contains('hidden')) return;
  if (!radioCallOverlay.classList.contains('hidden')) return;
  if (radioIcon.classList.contains('ringing')) return;
  if (!journalSearchWrap.classList.contains('hidden')) return;
  if (!passwordWallWrap.classList.contains('hidden')) return;
  if (!watchWrap.classList.contains('hidden')) return;
  if (!terminalOverlay.classList.contains('hidden')) return;
  if (!ammoSearchWrap.classList.contains('hidden')) return;
  if (!hijackOverlay.classList.contains('hidden')) return;
  clearTimeout(typeTimer);
  typing = false;
  if (!pendingNext) { sceneComplete(); return; }
  const startBg = currentBg;
  let id = pendingNext;
  let guard = 0;
  while (id && guard < 300) {
    guard++;
    const beat = SCENES[currentSceneId].beats[id];
    if (!beat) { id = null; break; }
    if (beat.condition && !GameState.flags[beat.condition]) {
      id = beat.next;
      continue;
    }
    if (beat.conditionNot && GameState.flags[beat.conditionNot]) {
      id = beat.next;
      continue;
    }
    if (beat.type === 'choice' || beat.type === 'radio' || beat.type === 'reveal' || beat.type === 'chase' || beat.type === 'raptor' || beat.type === 'raptorLunge' || beat.type === 'hijack' || beat.showJournalSearch || beat.showPasswordWall || beat.showWatchPickup || beat.openTerminal || beat.showAmmoSearch) {
      goTo(id);
      return;
    }
    if (beat.bg && beat.bg !== startBg) {
      goTo(id);
      return;
    }
    if (beat.revealTravelUI) revealTravelUI();
    if (beat.setMapDestination) mapDestination = beat.setMapDestination;
    if (beat.revealRestrictedZone) restrictedZoneRevealed = true;
    if (typeof beat.mapPowerLost === 'boolean') mapPowerLost = beat.mapPowerLost;
    if (beat.footstepShakes) startFootstepShakes(beat.footstepShakes);
  if (beat.shakeOnce) startFootstepShakes(1);
  if (typeof beat.impactFlash === 'number') triggerImpactFlash(beat.impactFlash);
    if (beat.glitchTrexEntry) trexGlitching = true;
  if (typeof beat.trexCloseIn === 'number') trexSurge(beat.trexCloseIn);
  if (beat.gunHandoff) showGunHandoff();
  if (beat.crackGun) showCrackedGun();
  if (beat.stopGapMeter) stopThreatMeter();
  if (beat.trexRetreat) retreatTrex();
  if (beat.burstSpeed) burstSpeed();
  if (beat.showJournalSearch) showJournalSearch(beat.showJournalSearch);
  if (beat.equipWatch) equipWatch();
  if (beat.showPasswordWall) showPasswordWall(beat.showPasswordWall);
  if (beat.showWatchPickup) showWatchPickup(beat.showWatchPickup);
  if (beat.openTerminal) openTerminal(beat.openTerminal);
  if (typeof beat.startGateTimer === 'number') startGateTimer(beat.startGateTimer);
  if (beat.showAmmoSearch) showAmmoSearch(beat.showAmmoSearch);
  if (beat.stopGateTimer) stopGateTimer();
  if (beat.stumble) triggerStumble();
  if (typeof beat.running === "boolean") setRunning(beat.running);
    if (beat.pinMapOpen) mapPinned = true;
    if (typeof beat.checkpoint === 'number') currentCheckpoint = beat.checkpoint;
  if (typeof beat.trexChasing === 'boolean') setTrexChasing(beat.trexChasing);
  if (typeof beat.chaseFormation === 'boolean') setChaseFormation(beat.chaseFormation);
  if (typeof beat.aceOvertakes === 'boolean') setAceOvertakes(beat.aceOvertakes);
  if (typeof beat.esmeTrips === 'boolean') setEsmeTrips(beat.esmeTrips);
  if (typeof beat.esmeSaved === 'boolean') resolveEsme(beat.esmeSaved);
  if (typeof beat.poseSprite !== 'undefined') setPoseSprite(beat.poseSprite);
    if (beat.radioState) setRadioState(beat.radioState, beat.radioLabel || beat.radioState.toUpperCase());
    id = beat.next;
  }
  sceneComplete();
}
skipBtn.addEventListener('click', () => {
  radioCallOverlay.classList.add('hidden');
  pendingRadioBeat = null;
  stopRingBuzz();
  stopStaticNoise();
  stopPanicTransmission();
  skipToNextImage();
});
backBtn.addEventListener('click', () => {
  if (beatHistory.length === 0) return;
  if (minigameActive) return;
  if (!journalSearchWrap.classList.contains('hidden')) return;
  if (!passwordWallWrap.classList.contains('hidden')) return;
  if (!watchWrap.classList.contains('hidden')) return;
  if (!terminalOverlay.classList.contains('hidden')) return;
  if (!ammoSearchWrap.classList.contains('hidden')) return;
  if (!hijackOverlay.classList.contains('hidden')) return;
  clearTimeout(typeTimer);
  typing = false;
  choiceBox.classList.add('hidden');
  radioCallOverlay.classList.add('hidden');
  pendingRadioBeat = null;
  stopRingBuzz();
  stopStaticNoise();
  stopPanicTransmission();
  setRadioState('idle', 'STANDBY');
  const prevId = beatHistory.pop();
  goTo(prevId, { fromHistory: true });
});
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Enter' && e.code !== 'Space') return;
  if (!choiceBox.classList.contains('hidden')) return;
  if (!radioCallOverlay.classList.contains('hidden')) {
    e.preventDefault();
    radioCallClose.click();
  } else if (radioIcon.classList.contains('ringing')) {
    e.preventDefault();
    radioIcon.click();
  } else if (!dialogueBox.classList.contains('hidden')) {
    e.preventDefault();
    dialogueBox.click();
  } else if (!continueBtn.classList.contains('hidden')) {
    e.preventDefault();
    continueBtn.click();
  } else if (!letterOverlay.classList.contains('hidden')) {
    e.preventDefault();
    closeLetterBtn.click();
  } else if (!titleScreen.classList.contains('hidden')) {
    e.preventDefault();
    titleScreen.click();
  }
});