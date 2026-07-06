const titleEl = document.getElementById('main-title');
const grid = document.getElementById('sudoku-grid');
const modeToggle = document.getElementById('mode-toggle');
const modeText = document.getElementById('mode-text');
const errorText = document.getElementById('error-text');
const timerDisplay = document.getElementById('timer-display');
const btnPause = document.getElementById('btn-pause');
const pauseScreen = document.getElementById('pause-screen');
const numPadArea = document.getElementById('num-pad-area');
const btnReset = document.getElementById('btn-reset');
const btnClear = document.getElementById('btn-clear');
const saveArea = document.getElementById('save-area');
const genArea = document.getElementById('gen-area');
const clearScreen = document.getElementById('clear-screen');
const finalTimeSpan = document.getElementById('final-time');
const loadModal = document.getElementById('load-modal');
const modalSaveList = document.getElementById('modal-save-list');

let selectedCell = null;
let isPlayMode = false;
let isPaused = false;
const cellsArray = [];

let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;

for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    cell.dataset.row = Math.floor(i / 9);
    cell.dataset.col = i % 9;
    cell.memoValues = Array(10).fill(false);

    cell.addEventListener('click', () => {
        if (isPaused) return;
        if (selectedCell) selectedCell.classList.remove('selected');
        selectedCell = cell;
        cell.classList.add('selected');
        getHighlightTargetAndTrigger(cell);
    });

    grid.appendChild(cell);
    cellsArray.push(cell);
}

function getCellValue(cell) {
    const valSpan = cell.querySelector('.cell-value');
    return valSpan ? valSpan.innerText : "";
}

function setCellValue(cell, val) {
    let valSpan = cell.querySelector('.cell-value');
    if (val === "" || val === null || val === undefined) {
        if (valSpan) valSpan.remove();
    } else {
        if (!valSpan) {
            valSpan = document.createElement('span');
            valSpan.classList.add('cell-value');
            cell.appendChild(valSpan);
        }
        valSpan.innerText = val;
    }
}

function checkValid(board, row, col, num) {
    for (let x = 0; x < 9; x++) {
        if (board[row][x] === num || board[x][col] === num) return false;
    }
    let startRow = row - row % 3, startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i + startRow][j + startCol] === num) return false;
        }
    }
    return true;
}

function solveSudokuRandomly(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                for (let num of numbers) {
                    if (checkValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (solveSudokuRandomly(board)) return true;
                        board[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function countSolutions(board, limit = 2) {
    let count = 0;
    function backtrack() {
        if (count >= limit) return;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (checkValid(board, row, col, num)) {
                            board[row][col] = num;
                            backtrack();
                            board[row][col] = 0;
                            if (count >= limit) return;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }
    backtrack();
    return count;
}

function generateSudoku(difficulty) {
    if (isPlayMode) return;

    cellsArray.forEach(cell => {
        setCellValue(cell, "");
        cell.classList.remove('fixed', 'user-input');
        cell.memoValues = Array(10).fill(false);
        renderMemo(cell);
    });

    let solved = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveSudokuRandomly(solved);

    let minHints = 40;
    if (difficulty === 'normal') minHints = 32;
    if (difficulty === 'hard') minHints = 25;
    if (difficulty === 'expert') minHints = 20;

    let puzzle = solved.map(r => r.slice());
    let indices = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
    let hints = 81;

    for (const idx of indices) {
        if (hints <= minHints) break;
        const r = Math.floor(idx / 9), c = idx % 9;
        if (puzzle[r][c] === 0) continue;

        const backup = puzzle[r][c];
        puzzle[r][c] = 0;

        const testBoard = puzzle.map(row => row.slice());
        if (countSolutions(testBoard, 2) === 1) {
            hints--;
        } else {
            puzzle[r][c] = backup;
        }
    }

    cellsArray.forEach((cell, idx) => {
        const r = Math.floor(idx / 9), c = idx % 9;
        if (puzzle[r][c] !== 0) {
            setCellValue(cell, puzzle[r][c]);
            cell.classList.add('fixed');
        }
    });

    errorText.innerText = "";
    clearAllHighlights();
    resetTimer();
    updateCounts();
}

function savePuzzleCustom() {
    const saveName = prompt("この問題につける名前を入力してください（何個でも保存できます）：");
    if (saveName === null) return; 
    const trimmedName = saveName.trim();
    if (trimmedName === "") {
        alert("名前が空欄のため保存できませんでした。");
        return;
    }

    const puzzleData = cellsArray.map(cell => {
        return {
            isFixed: cell.classList.contains('fixed'),
            text: getCellValue(cell),
            memos: cell.memoValues
        };
    });

    try {
        let customSaves = JSON.parse(localStorage.getItem('sudoku_studio_custom_saves') || '{}');
        customSaves[trimmedName] = puzzleData;
        localStorage.setItem('sudoku_studio_custom_saves', JSON.stringify(customSaves));
        alert(`[${trimmedName}] 保存しました`);
    } catch (e) {
        alert("保存に失敗しました");
    }
}

function openLoadModal() {
    if (isPlayMode) return;
    modalSaveList.innerHTML = "";
    let customSaves = JSON.parse(localStorage.getItem('sudoku_studio_custom_saves') || '{}');
    const saveNames = Object.keys(customSaves);

    if (saveNames.length === 0) {
        modalSaveList.innerHTML = "<div style='padding:15px; text-align:center; color:#a0aec0; font-size:0.85rem;'>保存されたデータがありません</div>";
    } else {
        saveNames.forEach(name => {
            const item = document.createElement('div');
            item.classList.add('save-item');

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('save-name');
            nameSpan.innerText = name;

            const btnGroup = document.createElement('div');
            btnGroup.classList.add('save-item-btns');

            const loadBtn = document.createElement('button');
            loadBtn.classList.add('btn-item-load');
            loadBtn.innerText = "読込";
            loadBtn.onclick = () => loadPuzzleCustom(name);

            const delBtn = document.createElement('button');
            delBtn.classList.add('btn-item-del');
            delBtn.innerText = "削除";
            delBtn.onclick = () => deletePuzzleCustom(name);

            btnGroup.appendChild(loadBtn);
            btnGroup.appendChild(delBtn);
            item.appendChild(nameSpan);
            item.appendChild(btnGroup);
            modalSaveList.appendChild(item);
        });
    }
    loadModal.style.display = "flex";
}

function closeLoadModal() { loadModal.style.display = "none"; }

function loadPuzzleCustom(name) {
    let customSaves = JSON.parse(localStorage.getItem('sudoku_studio_custom_saves') || '{}');
    const puzzleData = customSaves[name];
    if (!puzzleData) return;

    cellsArray.forEach((cell, index) => {
        const data = puzzleData[index];
        setCellValue(cell, data.text || "");
        cell.memoValues = data.memos || Array(10).fill(false);
        cell.classList.remove('fixed', 'user-input');
        if (data.isFixed) cell.classList.add('fixed');
        renderMemo(cell);
    });

    errorText.innerText = "";
    clearAllHighlights();
    isPlayMode = false;
    isPaused = false;
    pauseScreen.style.display = "none";
    numPadArea.style.opacity = "1";
    modeToggle.innerText = "問題を確定してプレイ開始";
    modeToggle.style.display = "inline-block";
    btnPause.style.display = "none";
    toggleUIVisibility(true);
    modeText.innerText = "MODE: 問題を入力中";
    resetTimer();
    updateCounts();
    closeLoadModal();
    alert(`[${name}] を読み込みました`);
}

function deletePuzzleCustom(name) {
    if (confirm(`【${name}】のデータを完全に削除しますか？`)) {
        let customSaves = JSON.parse(localStorage.getItem('sudoku_studio_custom_saves') || '{}');
        delete customSaves[name];
        localStorage.setItem('sudoku_studio_custom_saves', JSON.stringify(customSaves));
        openLoadModal(); 
    }
}

function highlightSameNumbers(targetNum) {
    cellsArray.forEach(cell => {
        cell.classList.remove('same-number');
        const memoContainer = cell.querySelector('.memo-grid');
        if(memoContainer) {
            memoContainer.querySelectorAll('.memo-digit').forEach(d => d.classList.remove('highlight-memo'));
        }
    });

    if (!targetNum || targetNum === "") return;

    cellsArray.forEach(cell => {
        if (getCellValue(cell) === targetNum) {
            cell.classList.add('same-number');
        }
        if (cell.memoValues && cell.memoValues[targetNum] === true && getCellValue(cell) === "") {
            const memoDigitEl = cell.querySelector(`#memo-${cell.dataset.index}-${targetNum}`);
            if(memoDigitEl) {
                memoDigitEl.classList.add('highlight-memo');
            }
        }
    });
}

function getHighlightTargetAndTrigger(cell) {
    const row = cell.dataset.row;
    const col = cell.dataset.col;
    cellsArray.forEach(c => {
        c.classList.remove('highlight-cross');
        if (c.dataset.row === row || c.dataset.col === col) {
            c.classList.add('highlight-cross');
        }
    });

    if (getCellValue(cell) !== "") {
        highlightSameNumbers(getCellValue(cell));
    } else {
        let firstMemo = "";
        for(let n=1; n<=9; n++) {
            if(cell.memoValues[n]) { firstMemo = String(n); break; }
        }
        highlightSameNumbers(firstMemo);
    }
}

function renderMemo(cell) {
    if (getCellValue(cell) !== "") {
        const existing = cell.querySelector('.memo-grid');
        if(existing) existing.remove();
        return;
    }

    let memoGrid = cell.querySelector('.memo-grid');
    if (!memoGrid) {
        memoGrid = document.createElement('div');
        memoGrid.classList.add('memo-grid');
        cell.appendChild(memoGrid);
    }

    memoGrid.innerHTML = "";
    for (let n = 1; n <= 9; n++) {
        const digitDiv = document.createElement('div');
        digitDiv.classList.add('memo-digit');
        digitDiv.id = `memo-${cell.dataset.index}-${n}`;
        digitDiv.innerText = cell.memoValues[n] ? n : "";
        memoGrid.appendChild(digitDiv);
    }
}

const rowIndices = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c));
const colIndices = Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c));
const boxIndices = Array.from({ length: 9 }, (_, b) => {
    const boxRow = Math.floor(b / 3) * 3;
    const boxCol = (b % 3) * 3;
    const arr = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) arr.push((boxRow + i) * 9 + (boxCol + j));
    return arr;
});

function isValidMove(targetCell, num) {
    const row = parseInt(targetCell.dataset.row);
    const col = parseInt(targetCell.dataset.col);
    const index = parseInt(targetCell.dataset.index);
    const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const numStr = String(num);

    const inGroup = (indices) => indices.some(i => i !== index && getCellValue(cellsArray[i]) === numStr);

    return !inGroup(rowIndices[row]) && !inGroup(colIndices[col]) && !inGroup(boxIndices[boxIdx]);
}

function launchConfetti() {
    const colors = ['#f6e05e', '#ed64a6', '#4299e1', '#48bb78', '#9f7aea', '#ffffff'];
    clearScreen.querySelectorAll('.confetti').forEach(e => e.remove());
    
    for(let i = 0; i < 80; i++) {
        let conf = document.createElement('div');
        conf.classList.add('confetti');
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        const duration = Math.random() * 2.5 + 1.5;
        const delay = Math.random() * 1.5;
        
        conf.style.animation = `fall ${duration}s linear ${delay}s forwards`;
        clearScreen.appendChild(conf);
    }
}

function pressMainNumber(num) {
    if (isPaused) return;
    if (!selectedCell || (isPlayMode && selectedCell.classList.contains('fixed'))) return;
    errorText.innerText = "";

    if (num === 0) {
        setCellValue(selectedCell, "");
        selectedCell.classList.remove('fixed', 'user-input');
        selectedCell.memoValues = Array(10).fill(false);
        renderMemo(selectedCell);
        updateCounts();
        getHighlightTargetAndTrigger(selectedCell);
        return;
    }

    if (!isValidMove(selectedCell, num)) {
        errorText.innerText = "!! 数字が重複しています";
        selectedCell.classList.add('invalid-flash');
        setTimeout(() => { selectedCell.classList.remove('invalid-flash'); }, 400);
        return;
    }

    selectedCell.memoValues = Array(10).fill(false);
    renderMemo(selectedCell);

    setCellValue(selectedCell, num);
    if (!isPlayMode) {
        selectedCell.classList.add('fixed');
    } else {
        selectedCell.classList.add('user-input');
        
        if (checkGameClear()) {
            stopTimer();
            if (selectedCell) selectedCell.classList.remove('selected');
            selectedCell = null;
            clearAllHighlights();
            
            const timeText = timerDisplay.innerText;
            finalTimeSpan.innerText = timeText;
            
            toggleUIVisibility(true);
            btnPause.style.display = "none";
            
            setTimeout(() => { 
                clearScreen.style.display = 'flex'; 
                launchConfetti();
            }, 300);
        }
    }
    updateCounts();
    if (selectedCell) getHighlightTargetAndTrigger(selectedCell); 
}

let lastMemoPress = { index: null, num: null, time: 0 };

function pressMemoNumber(num) {
    if (isPaused) return;
    if (!selectedCell || (isPlayMode && selectedCell.classList.contains('fixed'))) return;
    if (getCellValue(selectedCell) !== "") return; 
    
    if (!isPlayMode) {
        alert("メモ機能は「プレイ開始」後（ゲーム中）にのみ使用できます！");
        return;
    }

    const cellIndex = selectedCell.dataset.index;
    const now = Date.now();
    if (lastMemoPress.index === cellIndex && lastMemoPress.num === num && (now - lastMemoPress.time) < 250) {
        return;
    }
    lastMemoPress = { index: cellIndex, num, time: now };

    errorText.innerText = "";
    selectedCell.memoValues[num] = !selectedCell.memoValues[num];
    renderMemo(selectedCell);
    getHighlightTargetAndTrigger(selectedCell);
}

function clearMemo() {
    if (isPaused) return;
    if (!selectedCell || (isPlayMode && selectedCell.classList.contains('fixed'))) return;
    if (getCellValue(selectedCell) !== "") return;
    
    selectedCell.memoValues = Array(10).fill(false);
    renderMemo(selectedCell);
    getHighlightTargetAndTrigger(selectedCell);
}

function updateCounts() {
    const counts = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
    cellsArray.forEach(cell => {
        const val = getCellValue(cell);
        if (val >= 1 && val <= 9) counts[val]++;
    });

    for (let num = 1; num <= 9; num++) {
        const countEl = document.getElementById(`count-${num}`);
        const btnEl = document.getElementById(`btn-num-${num}`);
        if (counts[num] === 9) {
            if(countEl) countEl.innerText = `9/9`;
            btnEl.classList.add('completed');
        } else {
            if(countEl) countEl.innerText = `${counts[num]}/9`;
            btnEl.classList.remove('completed');
        }
    }
}

function checkGameClear() {
    for (let i = 0; i < 81; i++) {
        if (getCellValue(cellsArray[i]) === "") return false;
    }
    return true;
}

function startTimer() {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        const totalSeconds = Math.floor(elapsedTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerDisplay.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() { clearInterval(timerInterval); }
function resetTimer() { clearInterval(timerInterval); elapsedTime = 0; timerDisplay.innerText = "00:00"; }
function closeClearScreen() { clearScreen.style.display = 'none'; }

function pauseGame() {
    if (!isPlayMode || isPaused) return;
    isPaused = true;
    stopTimer();
    pauseScreen.style.display = "flex";
    numPadArea.style.opacity = "0.15";
    modeToggle.style.display = "none";
}

function resumeGame() {
    if (!isPlayMode || !isPaused) return;
    isPaused = false;
    startTimer();
    pauseScreen.style.display = "none";
    numPadArea.style.opacity = "1";
    modeToggle.style.display = "inline-block";
}

function clearAllHighlights() {
    if (selectedCell) selectedCell.classList.remove('selected');
    selectedCell = null;
    cellsArray.forEach(cell => {
        cell.classList.remove('same-number', 'highlight-cross');
        const mg = cell.querySelector('.memo-grid');
        if(mg) mg.querySelectorAll('.memo-digit').forEach(d => d.classList.remove('highlight-memo'));
    });
}

function toggleUIVisibility(showAll) {
    if (showAll) {
        titleEl.style.display = "block";
        btnReset.style.display = "inline-block";
        btnClear.style.display = "inline-block";
        saveArea.style.display = "block";
        genArea.style.display = "block";
        modeText.style.display = "block";
    } else {
        titleEl.style.display = "none";
        btnReset.style.display = "none";
        btnClear.style.display = "none";
        saveArea.style.display = "none";
        genArea.style.display = "none";
        modeText.style.display = "none";
    }
}

modeToggle.addEventListener('click', () => {
    if (isPaused) return;
    errorText.innerText = "";
    clearAllHighlights();

    if (!isPlayMode) {
        isPlayMode = true;
        modeToggle.innerText = "問題を修正する";
        startTimer();
        toggleUIVisibility(false);
        btnPause.style.display = "inline-block";
    } else {
        isPlayMode = false;
        modeToggle.innerText = "問題を確定してプレイ開始";
        modeText.innerText = "MODE: 問題を入力中";
        stopTimer();
        toggleUIVisibility(true);
        btnPause.style.display = "none";
    }
});

btnReset.addEventListener('click', () => {
    if (confirm("現在の問題を最初から解き直しますか？")) {
        cellsArray.forEach(cell => {
            if (!cell.classList.contains('fixed')) {
                setCellValue(cell, "");
                cell.classList.remove('user-input');
                cell.memoValues = Array(10).fill(false);
                renderMemo(cell);
            }
        });
        errorText.innerText = "";
        clearAllHighlights();
        if (isPlayMode) { resetTimer(); startTimer(); } else { resetTimer(); }
        updateCounts();
    }
});

btnClear.addEventListener('click', () => {
    if (confirm("盤面を完全にクリアして、最初から新しい問題を作り直しますか？")) {
        cellsArray.forEach(cell => {
            setCellValue(cell, "");
            cell.classList.remove('fixed', 'user-input');
            cell.memoValues = Array(10).fill(false);
            renderMemo(cell);
        });
        errorText.innerText = "";
        clearAllHighlights();
        isPlayMode = false;
        isPaused = false;
        pauseScreen.style.display = "none";
        numPadArea.style.opacity = "1";
        modeToggle.innerText = "問題を確定してプレイ開始";
        modeToggle.style.display = "inline-block";
        btnPause.style.display = "none";
        toggleUIVisibility(true);
        modeText.innerText = "MODE: 問題を入力中";
        resetTimer();
        updateCounts();
    }
});

updateCounts();
