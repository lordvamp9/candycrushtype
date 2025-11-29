const width = 8;
const gridContainer = document.getElementById('grid-container');
const scoreDisplay = document.getElementById('score');
const goalDisplay = document.getElementById('goal');
const levelDisplay = document.getElementById('level');
const timeDisplay = document.getElementById('time');
const startMenu = document.getElementById('start-menu');
const pauseMenu = document.getElementById('pause-menu');
const gameOverMenu = document.getElementById('game-over-menu');
const levelCompleteMenu = document.getElementById('level-complete-menu');
const victoryMenu = document.getElementById('victory-menu');
const finalScoreDisplay = document.getElementById('final-score');

let squares = [];
let score = 0;
let level = 1;
let timeLeft = 60;
let timerId;
let isPaused = false;
let isPlaying = false;
let candyColors = [
    'shape-0',
    'shape-1',
    'shape-2',
    'shape-3',
    'shape-4',
    'shape-5'
];

// Level configurations (Time in seconds)
const levelTime = {
    1: 60,
    2: 50,
    3: 40,
    4: 30,
    5: 20
};

const levelScoreThreshold = {
    1: 500,
    2: 1500,
    3: 3000,
    4: 6000,
    5: 15000
};

// Event Listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('exit-btn').addEventListener('click', () => window.close()); // Note: window.close() might not work in all contexts
document.getElementById('restart-btn').addEventListener('click', () => {
    gameOverMenu.classList.add('hidden');
    level = 1;
    startGame();
});
document.getElementById('victory-restart-btn').addEventListener('click', () => {
    victoryMenu.classList.add('hidden');
    level = 1;
    startGame();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePause();
    } else if (e.key === 'Enter' && isPaused) {
        togglePause();
    }
});

// Resume Audio Context on any interaction
document.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: true });

function createBoard() {
    gridContainer.innerHTML = '';
    squares = [];
    for (let i = 0; i < width * width; i++) {
        const square = document.createElement('div');
        square.setAttribute('draggable', true);
        square.setAttribute('id', i);
        let randomColor = Math.floor(Math.random() * candyColors.length);
        square.classList.add('candy', candyColors[randomColor]);
        gridContainer.appendChild(square);
        squares.push(square);
    }
    // Prevent initial matches
    // Simple check, might need more robust generation for production
}

function startGame() {
    initAudio();
    startMusic();

    score = 0;
    scoreDisplay.innerHTML = score;
    levelDisplay.innerHTML = level;
    goalDisplay.innerHTML = levelScoreThreshold[level];
    timeLeft = levelTime[level];
    timeDisplay.innerHTML = timeLeft;

    startMenu.classList.add('hidden');
    victoryMenu.classList.add('hidden');
    isPlaying = true;
    isPaused = false;

    createBoard();

    // Dragging events
    squares.forEach(square => {
        square.addEventListener('dragstart', dragStart);
        square.addEventListener('dragend', dragEnd);
        square.addEventListener('dragover', dragOver);
        square.addEventListener('dragenter', dragEnter);
        square.addEventListener('dragleave', dragLeave);
        square.addEventListener('drop', dragDrop);

        // Click events for non-drag interaction
        square.addEventListener('click', clickCandy);
    });

    clearInterval(timerId);
    timerId = setInterval(countDown, 1000);

    // Initial check for matches
    window.requestAnimationFrame(checkMatchesLoop);
}

function countDown() {
    if (isPaused) return;

    timeLeft--;
    timeDisplay.innerHTML = timeLeft;

    if (timeLeft <= 0) {
        clearInterval(timerId);
        gameOver();
    }
}

function gameOver() {
    isPlaying = false;
    stopMusic();
    gameOverMenu.classList.remove('hidden');
    finalScoreDisplay.innerHTML = score;
}

function levelComplete() {
    isPlaying = false;
    clearInterval(timerId);

    if (level >= 5) {
        victoryMenu.classList.remove('hidden');
        stopMusic(); // Or play victory music
    } else {
        levelCompleteMenu.classList.remove('hidden');
        setTimeout(() => {
            level++;
            levelCompleteMenu.classList.add('hidden');
            startGame();
        }, 3000);
    }
}

function togglePause() {
    if (!isPlaying) return;

    isPaused = !isPaused;
    if (isPaused) {
        pauseMenu.classList.remove('hidden');
        if (audioCtx) audioCtx.suspend();
    } else {
        pauseMenu.classList.add('hidden');
        if (audioCtx) audioCtx.resume();
    }
}

// Interaction Logic
let colorBeingDragged;
let colorBeingReplaced;
let squareIdBeingDragged;
let squareIdBeingReplaced;

let selectedCandy = null;

function clickCandy() {
    if (isPaused || !isPlaying) return;

    if (!selectedCandy) {
        selectedCandy = this;
        this.classList.add('selected');
    } else {
        // Second click
        colorBeingDragged = selectedCandy.className;
        colorBeingReplaced = this.className;
        squareIdBeingDragged = parseInt(selectedCandy.id);
        squareIdBeingReplaced = parseInt(this.id);

        selectedCandy.classList.remove('selected');

        // Check adjacency
        let validMove = checkValidMove();

        if (validMove) {
            squares[squareIdBeingDragged].className = colorBeingReplaced;
            squares[squareIdBeingReplaced].className = colorBeingDragged;

            // Check for matches immediately after swap
            let isMatch = checkRowForThree() || checkColumnForThree();
            if (!isMatch) {
                // Swap back
                setTimeout(() => {
                    squares[squareIdBeingDragged].className = colorBeingDragged;
                    squares[squareIdBeingReplaced].className = colorBeingReplaced;
                }, 200);
            } else {
                moveIntoSquareBelow();
            }
        }

        selectedCandy = null;
    }
}

// Drag functions (optional but good for UX)
function dragStart() {
    if (isPaused || !isPlaying) return;
    colorBeingDragged = this.className;
    squareIdBeingDragged = parseInt(this.id);
}

function dragOver(e) { e.preventDefault(); }
function dragEnter(e) { e.preventDefault(); }
function dragLeave() { }

function dragDrop() {
    if (isPaused || !isPlaying) return;
    colorBeingReplaced = this.className;
    squareIdBeingReplaced = parseInt(this.id);

    squares[squareIdBeingDragged].className = colorBeingReplaced;
    squares[squareIdBeingReplaced].className = colorBeingDragged;
}

function dragEnd() {
    if (isPaused || !isPlaying) return;
    let validMove = checkValidMove();

    if (validMove) {
        let isMatch = checkRowForThree() || checkColumnForThree();
        if (!isMatch) {
            squares[squareIdBeingDragged].className = colorBeingDragged;
            squares[squareIdBeingReplaced].className = colorBeingReplaced;
        } else {
            moveIntoSquareBelow();
        }
    } else {
        squares[squareIdBeingDragged].className = colorBeingDragged;
        squares[squareIdBeingReplaced].className = colorBeingReplaced;
    }
}

function checkValidMove() {
    let validMoves = [
        squareIdBeingDragged - 1,
        squareIdBeingDragged - width,
        squareIdBeingDragged + 1,
        squareIdBeingDragged + width
    ];
    let validMove = validMoves.includes(squareIdBeingReplaced);
    return validMove;
}

// Game Mechanics
function checkRowForThree() {
    let matchFound = false;
    for (let i = 0; i < 64; i++) {
        let rowOfThree = [i, i + 1, i + 2];
        let decidedColor = squares[i].className;
        const isBlank = squares[i].className === ''; // Should not happen with class based

        const notValid = [6, 7, 14, 15, 22, 23, 30, 31, 38, 39, 46, 47, 54, 55, 62, 63];
        if (notValid.includes(i)) continue;

        if (rowOfThree.every(index => squares[index].className === decidedColor && decidedColor !== 'candy')) {
            score += 30;
            scoreDisplay.innerHTML = score;

            // SFX & VFX
            playMatchSound();
            rowOfThree.forEach(index => {
                const x = index % width;
                const y = Math.floor(index / width);
                createExplosion(x, y, decidedColor);
                squares[index].className = 'candy'; // Remove color class
            });
            matchFound = true;
        }
    }
    return matchFound;
}

function checkColumnForThree() {
    let matchFound = false;
    for (let i = 0; i < 47; i++) {
        let columnOfThree = [i, i + width, i + width * 2];
        let decidedColor = squares[i].className;

        if (columnOfThree.every(index => squares[index].className === decidedColor && decidedColor !== 'candy')) {
            score += 30;
            scoreDisplay.innerHTML = score;

            // SFX & VFX
            playMatchSound();
            columnOfThree.forEach(index => {
                const x = index % width;
                const y = Math.floor(index / width);
                createExplosion(x, y, decidedColor);
                squares[index].className = 'candy';
            });
            matchFound = true;
        }
    }
    return matchFound;
}

function moveIntoSquareBelow() {
    for (let i = 0; i < 55; i++) {
        if (squares[i + width].className === 'candy') {
            squares[i + width].className = squares[i].className;
            squares[i].className = 'candy';
            const firstRow = [0, 1, 2, 3, 4, 5, 6, 7];
            const isFirstRow = firstRow.includes(i);
            if (isFirstRow && squares[i].className === 'candy') {
                let randomColor = Math.floor(Math.random() * candyColors.length);
                squares[i].classList.add(candyColors[randomColor]);
            }
        }
    }
}

function checkMatchesLoop() {
    if (!isPlaying) return;

    checkRowForThree();
    checkColumnForThree();
    moveIntoSquareBelow();

    // Refill top row if empty
    for (let i = 0; i < width; i++) {
        if (squares[i].className === 'candy') {
            let randomColor = Math.floor(Math.random() * candyColors.length);
            squares[i].classList.add(candyColors[randomColor]);
        }
    }

    // Check Level Completion
    if (score >= levelScoreThreshold[level]) {
        levelComplete();
    }

    if (isPlaying) {
        window.requestAnimationFrame(checkMatchesLoop);
    }
}

// --- Audio System (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let musicOscillators = [];
let musicInterval;
let isMuted = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playNote(freq, type, duration, startTime) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.1, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

function startMusic() {
    if (!audioCtx) initAudio();
    if (musicInterval) clearInterval(musicInterval);

    let noteIndex = 0;
    // Simple upbeat melody
    const melody = [
        330, 392, 494, 523, 392, 330, 392, 494,
        523, 587, 659, 523, 494, 392, 330, 261
    ]; // E4, G4, B4, C5...

    musicInterval = setInterval(() => {
        if (isPaused || !isPlaying) return;

        const time = audioCtx.currentTime;
        playNote(melody[noteIndex % melody.length], 'square', 0.2, time);
        playNote(melody[noteIndex % melody.length] / 2, 'triangle', 0.2, time); // Bass

        noteIndex++;
    }, 250); // 240 BPM eighth notes
}

function stopMusic() {
    if (musicInterval) clearInterval(musicInterval);
}

function playMatchSound() {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;

    // "Crunch" / "Zap" effect
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, time);
    osc.frequency.exponentialRampToValueAtTime(110, time + 0.1);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.1);
}

function playSwapSound() {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    playNote(600, 'sine', 0.05, time);
}

// --- Visual Effects ---
function createExplosion(x, y, colorClass) {
    const rect = gridContainer.getBoundingClientRect();
    // Calculate relative position within the container
    // x and y are indices (0-7)
    const cellWidth = 560 / 8; // 70px
    const posX = x * cellWidth + cellWidth / 2;
    const posY = y * cellWidth + cellWidth / 2;

    // Get color from class
    let color = '#fff';
    if (colorClass.includes('shape-0')) color = '#ff3333';
    else if (colorClass.includes('shape-1')) color = '#33ff33';
    else if (colorClass.includes('shape-2')) color = '#3333ff';
    else if (colorClass.includes('shape-3')) color = '#ffff33';
    else if (colorClass.includes('shape-4')) color = '#ff33ff';
    else if (colorClass.includes('shape-5')) color = '#33ffff';

    for (let i = 0; i < 10; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.backgroundColor = color;
        particle.style.left = `${posX}px`;
        particle.style.top = `${posY}px`;

        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const velocity = 50 + Math.random() * 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        gridContainer.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 800);
    }
}

// Auto-init audio on load if possible
window.onload = function () {
    initAudio();
}
