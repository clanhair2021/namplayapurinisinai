const grid = document.getElementById('sudoku-grid');
const errorText = document.getElementById('error-text');
const numPadArea = document.getElementById('num-pad-area');
const pauseScreen = document.getElementById('pause-screen');
const clearScreen = document.getElementById('clear-screen');
const loadModal = document.getElementById('load-modal');
const modalSaveList = document.getElementById('modal-save-list');
const settingsModal = document.getElementById('settings-modal');
const gameActionsArea = document.getElementById('game-actions-area');

let selectedCell = null;
let isPlayMode = false;
let isPaused = false;
const cellsArray = [];

let solvedBoard = Array(81).fill(0); 
let judgeMode = 'blind';             
let currentDifficulty = 'normal';   
let currentDifficultyText = "中級";

let gameScore = 0;                  
let comboCount = 0;                 
let maxComboCount = 0;              
let missCount = 0;                  
let isFirstTimePerfect = true;      

let timerInterval = null;           
let elapsedTime = 0;                

// フリック操作時のクリック誤爆を防ぐためのフラグ
let justFlicked = false;

const difficultyConfig = {
    easy: { base: 10, targetTime: 300, rateInstant: 2, rateClassic: 4 },
    normal: { base: 20, targetTime: 600, rateInstant: 3, rateClassic: 5 },
    hard: { base: 30, targetTime: 900, rateInstant: 5, rateClassic: 7 },
    expert: { base: 50, targetTime: 1500, rateInstant: 8, rateClassic: 12 }
};

function showScreen(screenId) {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById(screenId).style.display = 'flex';
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        if (!isPaused && isPlayMode) {
            elapsedTime++;
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const m = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    const s = (elapsedTime % 60).toString().padStart(2, '0');
    document.getElementById('status-timer').innerText = `⏱ ${m}:${s}`;
}

function setJudgeMode(mode) {
    judgeMode = mode;
    const btnBlind = document.getElementById('btn-mode-blind');
    const btnAssist = document.getElementById('btn-mode-assist');
    
    if (btnBlind && btnAssist) {
        btnBlind.classList.remove('active');
        btnAssist.classList.remove('active');
        
        if (mode === 'blind') {
            btnBlind.classList.add('active');
        } else {
            btnAssist.classList.add('active');
        }
    }
}

function updateStatusBar() {
    document.getElementById('status-difficulty').innerText = currentDifficultyText;
    document.getElementById('status-miss').innerText = `ミス: ${missCount}`;
    document.getElementById('status-combo').innerText = `${comboCount} COMBO`;
    document.getElementById('status-score').innerText = `SCORE: ${gameScore}`;
}

function handleMenuGenerate(difficulty) {
    currentDifficulty = difficulty;
    if (difficulty === 'easy') currentDifficultyText = "初級";
    if (difficulty === 'normal') currentDifficultyText = "中級";
    if (difficulty === 'hard') currentDifficultyText = "上級";
    if (difficulty === 'expert') currentDifficultyText = "最高級";

    gameScore = 0;
    comboCount = 0;
    maxComboCount = 0;
    missCount = 0;
    elapsedTime = 0;
    isFirstTimePerfect = true;
    
    updateTimerDisplay();
    updateStatusBar();

    generateSudoku(difficulty);
    isPlayMode = true;
    showScreen('game-screen');
    startTimer();
}

function openSettingsModal() {
    setJudgeMode(judgeMode); 

    const modeSettingItem = document.getElementById('setting-item-mode');

    if (isPlayMode) {
        if (modeSettingItem) modeSettingItem.style.display = 'none';
        gameActionsArea.style.display = 'flex';
        isPaused = true;
        pauseScreen.style.display = "flex";
        numPadArea.style.opacity = "0.15";
    } else {
        if (modeSettingItem) modeSettingItem.style.display = 'flex';
        gameActionsArea.style.display = 'none';
    }
    settingsModal.style.display = 'flex';
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
    if (isPlayMode) {
        isPaused = false;
        pauseScreen.style.display = "none";
        numPadArea.style.opacity = "1";
    }
}

function resumeGame() { closeSettingsModal(); }
function triggerSave() { savePuzzleCustom(); }

function triggerReset() {
    if (confirm("現在の問題を最初から解き直しますか？\n（タイム・スコア・コンボもリセットされます）")) {
        cellsArray.forEach(cell => {
            if (!cell.classList.contains('fixed')) {
                setCellValue(cell, "");
                cell.classList.remove('user-input');
                cell.memoValues = Array(10).fill(false);
                renderMemo(cell);
            }
        });
        errorText.innerText = "";
        gameScore = 0;
        comboCount = 0;
        maxComboCount = 0;
        missCount = 0;
        elapsedTime = 0;
        isFirstTimePerfect = true;
        updateTimerDisplay();
        updateStatusBar();
        clearAllHighlights();
        updateCounts();
        closeSettingsModal();
    }
}

function triggerQuit() {
    if (confirm("本当にギブアップしてメニューに戻りますか？\n（スコアはすべて破棄されます）")) {
        isPlayMode = false;
        isPaused = false;
        stopTimer();
        pauseScreen.style.display = "none";
        numPadArea.style.opacity = "1";
        clearAllHighlights();
        showScreen('menu-screen');
        closeSettingsModal();
    }
}

// 盤面初期化
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
    cellsArray.forEach(cell => {
        setCellValue(cell, "");
        cell.classList.remove('fixed', 'user-input');
        cell.memoValues = Array(10).fill(false);
        renderMemo(cell);
    });

    let solved = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveSudokuRandomly(solved);

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            solvedBoard[r * 9 + c] = solved[r][c];
        }
    }

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
    updateCounts();
}

function savePuzzleCustom() {
    const saveName = prompt("この【問題】につける名前を入力してください：");
    if (saveName === null) return; 
    const trimmedName = saveName.trim();
    if (trimmedName === "") {
        alert("名前が空欄のため保存できませんでした。");
        return;
    }

    const puzzleData = cellsArray.map((cell, idx) => {
        const isFixed = cell.classList.contains('fixed');
        return {
            isFixed: isFixed,
            text: isFixed ? getCellValue(cell) : "",
            memos: Array(10).fill(false),
            correctNum: solvedBoard[idx]
        };
    });

    try {
        let customSaves = JSON.parse(localStorage.getItem('sudoku_studio_custom_saves') || '{}');
        customSaves[trimmedName] = puzzleData;
        localStorage.setItem('sudoku_studio_custom_saves', JSON.stringify(customSaves));
        alert(`問題 [${trimmedName}] をお気に入り保存しました！`);
    } catch (e) {
        alert("保存に失敗しました");
    }
}

function openLoadModal() {
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
        if (data.isFixed && data.text !== "") {
            cell.classList.add('fixed');
        }
        solvedBoard[index] = data.correctNum || 0;
        renderMemo(cell);
    });

    errorText.innerText = "";
    clearAllHighlights();
    
    isPlayMode = true;
    isPaused = false;
    pauseScreen.style.display = "none";
    numPadArea.style.opacity = "1";
    
    currentDifficulty = "normal";
    currentDifficultyText = "保存データ";
    gameScore = 0;
    comboCount = 0;
    maxComboCount = 0;
    missCount = 0;
    elapsedTime = 0;
    isFirstTimePerfect = true;
    
    updateTimerDisplay();
    updateStatusBar();
    updateCounts();
    closeLoadModal();
    showScreen('game-screen');
    startTimer();
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

function calculateComboAddScore() {
    const config = difficultyConfig[currentDifficulty] || difficultyConfig['normal'];
    let base = config.base;
    
    let multiplier = 1.0;
    if (comboCount >= 15) multiplier = 2.0;
    else if (comboCount >= 10) multiplier = 1.5;
    else if (comboCount >= 5) multiplier = 1.2;
    
    let scored = Math.floor(base * multiplier);
    
    if (judgeMode === 'blind') {
        scored = Math.floor(scored * 1.3);
    }
    
    return scored;
}

function autoClearMemos(confirmedIndex, num) {
    const targetCell = cellsArray[confirmedIndex];
    const row = parseInt(targetCell.dataset.row);
    const col = parseInt(targetCell.dataset.col);
    const boxIdx = Math.floor(row / 3) * 3 + Math.floor(col / 3);

    const relatedIndices = new Set([
        ...rowIndices[row],
        ...colIndices[col],
        ...boxIndices[boxIdx]
    ]);

    relatedIndices.forEach(idx => {
        if (idx !== confirmedIndex) {
            const cell = cellsArray[idx];
            if (getCellValue(cell) === "" && cell.memoValues[num] === true) {
                cell.memoValues[num] = false;
                renderMemo(cell); 
            }
        }
    });
}

function triggerHint() {
    if (!isPlayMode || isPaused) return;
    errorText.innerText = "";

    let targetCell = selectedCell;

    if (!targetCell || targetCell.classList.contains('fixed')) {
        const candidates = cellsArray.filter(cell => {
            if (cell.classList.contains('fixed')) return false;
            const val = getCellValue(cell);
            const idx = parseInt(cell.dataset.index);
            return val === "" || parseInt(val) !== solvedBoard[idx];
        });

        if (candidates.length === 0) return; 
        targetCell = candidates[Math.floor(Math.random() * candidates.length)];
    }

    const index = parseInt(targetCell.dataset.index);
    const correctNum = solvedBoard[index];

    if (selectedCell) selectedCell.classList.remove('selected');
    selectedCell = targetCell;
    targetCell.classList.add('selected');

    targetCell.memoValues = Array(10).fill(false);
    renderMemo(targetCell);
    setCellValue(targetCell, correctNum);
    targetCell.classList.add('user-input');

    autoClearMemos(index, correctNum);

    comboCount = 0;
    errorText.innerText = "💡 ヒントでマスを1つ埋めました！";
    
    updateStatusBar();
    updateCounts();
    getHighlightTargetAndTrigger(targetCell);

    if (checkGameClear()) {
        if (judgeMode === 'blind') {
            if (checkFinalAnswer()) {
                triggerClearSuccess();
            } else {
                errorText.innerText = "⚠️ 盤面が埋まりましたが、どこかに間違いがあります！";
                isFirstTimePerfect = false;
                updateStatusBar();
            }
        } else {
            triggerClearSuccess();
        }
    }
}

function pressMainNumber(num) {
    if (isPaused) return;
    if (justFlicked) return; // フリック消去直後は通常の数字入力をキャンセルする
    if (!selectedCell || selectedCell.classList.contains('fixed')) return;
    errorText.innerText = "";

    const index = parseInt(selectedCell.dataset.index);
    const currentVal = getCellValue(selectedCell);

    if (String(num) === currentVal) {
        setCellValue(selectedCell, "");
        selectedCell.classList.remove('user-input');
        selectedCell.memoValues = Array(10).fill(false);
        renderMemo(selectedCell);
        
        comboCount = 0;
        updateStatusBar();
        updateCounts();
        getHighlightTargetAndTrigger(selectedCell);
        return;
    }

    const isNewFill = (currentVal === ""); 

    if (judgeMode === 'assist') {
        const correctNum = solvedBoard[index];
        if (num !== correctNum) {
            errorText.innerText = "❌ 正解ではありません！";
            missCount++;
            comboCount = 0; 
            updateStatusBar();
            
            selectedCell.classList.add('invalid-flash');
            setTimeout(() => { selectedCell.classList.remove('invalid-flash'); }, 400);
            return;
        }
        
        comboCount++;
        maxComboCount = Math.max(maxComboCount, comboCount);
        gameScore += calculateComboAddScore();
        
    } else {
        if (!isValidMove(selectedCell, num)) {
            errorText.innerText = "!! 数字が重複しています";
            missCount++;
            comboCount = 0; 
            updateStatusBar();

            selectedCell.classList.add('invalid-flash');
            setTimeout(() => { selectedCell.classList.remove('invalid-flash'); }, 400);
            return;
        }
        
        if (isNewFill) {
            comboCount++;
            maxComboCount = Math.max(maxComboCount, comboCount);
            gameScore += calculateComboAddScore();
        } else {
            comboCount = 0;
        }
    }

    selectedCell.memoValues = Array(10).fill(false);
    renderMemo(selectedCell);
    setCellValue(selectedCell, num);
    selectedCell.classList.add('user-input');

    autoClearMemos(index, num);

    updateStatusBar();
        
    if (checkGameClear()) {
        if (judgeMode === 'blind') {
            if (checkFinalAnswer()) {
                triggerClearSuccess();
            } else {
                errorText.innerText = "⚠️ 盤面が埋まりましたが、どこかに間違いがあります！";
                comboCount = 0; 
                isFirstTimePerfect = false; 
                updateStatusBar();
            }
        } else {
            triggerClearSuccess();
        }
    }
    updateCounts();
    if (selectedCell) getHighlightTargetAndTrigger(selectedCell); 
}

function checkFinalAnswer() {
    for (let i = 0; i < 81; i++) {
        if (parseInt(getCellValue(cellsArray[i])) !== solvedBoard[i]) {
            return false;
        }
    }
    return true;
}

function triggerClearSuccess() {
    stopTimer(); 
    if (selectedCell) selectedCell.classList.remove('selected');
    selectedCell = null;
    clearAllHighlights();

    const config = difficultyConfig[currentDifficulty] || difficultyConfig['normal'];
    const targetTime = config.targetTime;
    const rate = (judgeMode === 'blind') ? config.rateClassic : config.rateInstant;
    
    let timeBonus = 0;
    if (elapsedTime < targetTime) {
        timeBonus = (targetTime - elapsedTime) * rate;
    }

    let perfectBonus = 0;
    if (judgeMode === 'blind' && isFirstTimePerfect) {
        perfectBonus = 1000;
    }

    const finalTotalScore = gameScore + timeBonus + perfectBonus;

    setTimeout(() => { 
        document.querySelector('.clear-msg').innerHTML = `
            素晴らしいロジックでした！スコアの内訳です。<br><br>
            <table class="result-table">
                <tr><td>モード</td><td class="val">${judgeMode === 'blind' ? 'ブラインド' : 'アシスト'}</td></tr>
                <tr><td>クリアタイム</td><td class="val">${Math.floor(elapsedTime / 60)}分 ${elapsedTime % 60}秒</td></tr>
                <tr><td>最高コンボ数</td><td class="val">${maxComboCount} 連続</td></tr>
                <tr><td>ミス回数</td><td class="val">${missCount} 回</td></tr>
                <tr><td>① プレイ中獲得点</td><td class="val">+ ${gameScore} pts</td></tr>
                <tr><td>② タイムボーナス</td><td class="val">+ ${timeBonus} pts</td></tr>
                <tr><td>③ 一発正解ボーナス</td><td class="val">+ ${perfectBonus} pts</td></tr>
                <tr class="total-row"><td>TOTAL SCORE</td><td class="val">${finalTotalScore} pts</td></tr>
            </table>
        `;
        clearScreen.style.display = 'flex'; 
        launchConfetti();
    }, 300);
}

let lastMemoPress = { index: null, num: null, time: 0 };
function pressMemoNumber(num) {
    if (isPaused) return;
    if (!selectedCell || selectedCell.classList.contains('fixed')) return;
    if (getCellValue(selectedCell) !== "") return; 
    
    const cellIndex = selectedCell.dataset.index;
    const now = Date.now();
    if (lastMemoPress.index === cellIndex && lastMemoPress.num === num && (now - lastMemoPress.time) < 250) return;
    lastMemoPress = { index: cellIndex, num, time: now };

    errorText.innerText = "";
    selectedCell.memoValues[num] = !selectedCell.memoValues[num];
    renderMemo(selectedCell);
    getHighlightTargetAndTrigger(selectedCell);
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
            if(btnEl) btnEl.classList.add('completed');
        } else {
            if(countEl) countEl.innerText = `${counts[num]}/9`;
            if(btnEl) btnEl.classList.remove('completed');
        }
    }
}

function checkGameClear() {
    for (let i = 0; i < 81; i++) {
        if (getCellValue(cellsArray[i]) === "") return false;
    }
    return true;
}

function closeClearScreen() { clearScreen.style.display = 'none'; }


// =========================================================================
// 💡 フリック入力（スワイプ消去）機能のセットアップ
// =========================================================================
function setupFlickToDelete() {
    const numBtns = document.querySelectorAll('.num-btn');
    
    numBtns.forEach(btn => {
        btn.style.position = 'relative'; // アイコン表示のための基準位置
        let startY = 0;
        let isFlicking = false;
        let indicator = null;

        // タッチ開始（指を置いた瞬間）
        btn.addEventListener('touchstart', (e) => {
            if (isPaused) return;
            startY = e.touches[0].clientY;
            isFlicking = false;
            showIndicator(btn);
        }, {passive: true});

        // タッチ移動（指を滑らせている最中）
        btn.addEventListener('touchmove', (e) => {
            if (!startY || isPaused) return;
            let currentY = e.touches[0].clientY;
            
            // 15px以上 上にフリックしたら「消去モード」と判定
            if (startY - currentY > 15) { 
                isFlicking = true;
                activateIndicator();
                if (e.cancelable) e.preventDefault(); // フリック中の画面スクロールを防ぐ
            } else {
                isFlicking = false;
                resetIndicator();
            }
        }, {passive: false});

        // タッチ終了（指を離した瞬間）
        btn.addEventListener('touchend', (e) => {
            if (isPaused) return;
            removeIndicator();
            
            if (isFlicking) {
                if (e.cancelable) e.preventDefault(); // 通常のクリック判定をブロック
                executeDeleteCell();
            }
            startY = 0;
        });

        // 【PC・マウス操作用の予備ロジック】
        let isMouseDown = false;
        btn.addEventListener('mousedown', (e) => {
            if (isPaused) return;
            isMouseDown = true;
            startY = e.clientY;
            isFlicking = false;
            showIndicator(btn);
        });

        btn.addEventListener('mousemove', (e) => {
            if (!isMouseDown || !startY || isPaused) return;
            let currentY = e.clientY;
            if (startY - currentY > 15) {
                isFlicking = true;
                activateIndicator();
            } else {
                isFlicking = false;
                resetIndicator();
            }
        });

        btn.addEventListener('mouseup', () => {
            if (isPaused) return;
            isMouseDown = false;
            removeIndicator();
            if (isFlicking) {
                executeDeleteCell();
            }
            startY = 0;
        });
        
        btn.addEventListener('mouseleave', () => {
            isMouseDown = false;
            removeIndicator();
        });

        // --- フリック時の演出UI関数 ---
        function showIndicator(parent) {
            if(indicator) indicator.remove();
            indicator = document.createElement('div');
            indicator.innerText = "↑";
            indicator.style.position = 'absolute';
            indicator.style.top = '-25px';
            indicator.style.left = '50%';
            indicator.style.transform = 'translateX(-50%)';
            indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
            indicator.style.color = 'white';
            indicator.style.padding = '2px 8px';
            indicator.style.borderRadius = '10px';
            indicator.style.fontSize = '10px';
            indicator.style.opacity = '0';
            indicator.style.transition = 'all 0.15s ease';
            indicator.style.pointerEvents = 'none';
            indicator.style.zIndex = '100';
            parent.appendChild(indicator);
            
            setTimeout(() => {
                if(indicator) indicator.style.opacity = '0.8';
            }, 50);
        }

        function activateIndicator() {
            if (indicator && indicator.innerText !== "✖ 消去") {
                indicator.innerText = "✖ 消去";
                indicator.style.top = '-40px';
                indicator.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
                indicator.style.transform = 'translateX(-50%) scale(1.1)';
            }
        }

        function resetIndicator() {
            if (indicator && indicator.innerText !== "↑") {
                indicator.innerText = "↑";
                indicator.style.top = '-25px';
                indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                indicator.style.transform = 'translateX(-50%) scale(1)';
            }
        }

        function removeIndicator() {
            if (indicator) {
                indicator.remove();
                indicator = null;
            }
        }
    });
}

// 実際に消去を実行する関数
function executeDeleteCell() {
    justFlicked = true; // クリック誤爆防止フラグをON
    setTimeout(() => justFlicked = false, 100); // すぐに解除

    if (!selectedCell || selectedCell.classList.contains('fixed')) return;
    
    const currentVal = getCellValue(selectedCell);
    if (currentVal !== "") {
        setCellValue(selectedCell, "");
        selectedCell.classList.remove('user-input');
        comboCount = 0;
        updateStatusBar();
        updateCounts();
        getHighlightTargetAndTrigger(selectedCell);
        errorText.innerText = "🧹 マスの数字を消去しました";
    }
}

// 初期化実行
updateStatusBar();
setupFlickToDelete(); // 👈 イベントリスナーの起動
