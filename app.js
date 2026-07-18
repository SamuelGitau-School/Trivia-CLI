// DATA
const QUESTIONS = [
  {
    question: "What does 'CLI' stand for?",
    options: ["Command Line Interface", "Computer Logic Input", "Code Line Index", "Central Language Interpreter"],
    answer: "A",
  },
  {
    question: "Which keyword declares a variable that cannot be reassigned?",
    options: ["var", "let", "const", "static"],
    answer: "C",
  },
  {
    question: "Which array method returns a NEW array with transformed elements?",
    options: ["forEach", "map", "reduce", "sort"],
    answer: "B",
  },
  {
    question: "What will `typeof null` return in JavaScript?",
    options: ["'null'", "'undefined'", "'object'", "'number'"],
    answer: "C",
  },
  {
    question: "Which function schedules code to run after a delay?",
    options: ["setInterval", "setTimeout", "delay", "wait"],
    answer: "B",
  },
];

const TIME_LIMIT_SECONDS = 15;
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"]

// DOM references
const outputEl = document.getElementById("output");
const inputEl = document.getElementById("terminalInput");
const timerBadge = document.getElementById("timerBadge");
const terminalEl = document.getElementById("terminal");

// waiting on the player, so the Enter-key listener can call it.
let pendingResolve = null;


// Small output helpers
function printLine(text = "", className = "") {
  const line = document.createElement("p");
  line.className = `line ${className}`.trim();
  line.textContent = text;
  outputEl.appendChild(line);
  terminalEl.scrollTop = terminalEl.scrollHeight;
}

function printBlank() {
  printLine("");
}

function focusInput() {
  inputEl.focus({ preventScroll: true });
}

// Pauses execution for the given number of milliseconds. 
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// Input handling 
function getUserInput(timeLimitSeconds = null) {
  return new Promise((resolve) => {
    inputEl.value = "";
    inputEl.disabled = false;
    focusInput();

    let countdownId = null;
    let timeoutId = null;

    function cleanup() {
      if (countdownId) clearInterval(countdownId);
      if (timeoutId) clearTimeout(timeoutId);
      inputEl.disabled = true;
      timerBadge.hidden = true;
      timerBadge.classList.remove("timer-critical");
      pendingResolve = null;
    }

    pendingResolve = (value) => {
      cleanup();
      resolve(value);
    };

    if (timeLimitSeconds) {
      let secondsLeft = timeLimitSeconds;
      timerBadge.hidden = false;
      timerBadge.textContent = `${secondsLeft}s`;

      countdownId = setInterval(() => {
        secondsLeft -= 1;
        timerBadge.textContent = `${secondsLeft}s`;
        if (secondsLeft <= 5) {
          timerBadge.classList.add("timer-critical");
        }
      }, 1000);

      timeoutId = setTimeout(() => {
        pendingResolve(null); // null marks a timeout, not an answer
      }, timeLimitSeconds * 1000);
    }
  });
}

// Submit on Enter; echo what the player typed into the transcript.
inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && pendingResolve && !inputEl.disabled) {
    const value = inputEl.value;
    printLine(`> ${value}`, "echo");
    pendingResolve(value);
  }
});

// Clicking anywhere on the screen returns focus to the input.
terminalEl.addEventListener("click", focusInput);

// Game logic
function isCorrectAnswer(userAnswer, correctLetter) {
  if (!userAnswer) return false;
  return userAnswer.trim().toUpperCase() === correctLetter;
}


function printOptions(options) {
  options
    .map((option, index) => `   ${OPTION_LETTERS[index]}) ${option}`)
    .forEach((line) => printLine(line));
}

async function askQuestion(questionObj, questionNumber, totalQuestions) {
  printBlank();
  printLine(`Question ${questionNumber} of ${totalQuestions}`, "meta");
  printLine(questionObj.question, "question");
  printOptions(questionObj.options);
  printLine("Your answer (A/B/C/D):", "prompt-text");

  const rawAnswer = await getUserInput(TIME_LIMIT_SECONDS);
  const timedOut = rawAnswer === null;
  const correct = !timedOut && isCorrectAnswer(rawAnswer, questionObj.answer);

  if (timedOut) {
    printLine(`Time's up! The correct answer was ${questionObj.answer}.`, "wrong");
  } else if (correct) {
    printLine("Correct!", "right");
  } else {
    printLine(`Incorrect. The correct answer was ${questionObj.answer}.`, "wrong");
  }

  return {
    question: questionObj.question,
    chosen: timedOut ? "(no answer)" : rawAnswer.trim().toUpperCase(),
    correct,
    timedOut,
  };
}


function displayResults(results, elapsedSeconds) {
  const score = results.reduce((total, result) => (result.correct ? total + 1 : total), 0);
  const missed = results.filter((result) => !result.correct);

  printBlank();
  printLine("============================");
  printLine("        GAME OVER", "meta");
  printLine("============================");
  printLine(`Final score: ${score} / ${results.length}`, "score");
  printLine(`Total time: ${elapsedSeconds}s`);

  if (missed.length > 0) {
    printBlank();
    printLine("Questions you missed:");
    missed.forEach((result, index) => {
      printLine(`  ${index + 1}. ${result.question} (you: ${result.chosen})`, "wrong");
    });
  } else {
    printBlank();
    printLine("Perfect score! Well done!", "right");
  }

  printLine("============================");
  printBlank();
  printLine("Refresh the page to play again.", "meta");
  inputEl.disabled = true;
}

async function runQuiz() {
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < QUESTIONS.length; i++) {
    const result = await askQuestion(QUESTIONS[i], i + 1, QUESTIONS.length);
    results.push(result);
  }

  const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
  displayResults(results, elapsedSeconds);
}

// Prints a short boot sequence for atmosphere before the game starts. 
async function bootSequence() {
  const bootLines = [
    "TRIVIA-9000 TERMINAL",
    "loading question bank... ok",
    `${QUESTIONS.length} questions found`,
    "initializing timer subsystem... ok",
  ];

  for (const line of bootLines) {
    printLine(line, "boot");
    await sleep(220);
  }
  printBlank();
}

async function startGame() {
  try {
    await bootSequence();

    printLine("============================");
    printLine("   WELCOME TO CLI TRIVIA!");
    printLine("============================");
    printLine(`You'll answer ${QUESTIONS.length} questions.`);
    printLine(`You have ${TIME_LIMIT_SECONDS} seconds per question.`);
    printBlank();
    printLine("Press ENTER to start (or type 'quit' to exit):", "prompt-text");

    const ready = await getUserInput(null);

    if (ready && ready.trim().toLowerCase() === "quit") {
      printLine("Maybe next time. Goodbye!", "meta");
      inputEl.disabled = true;
      return;
    }

    await runQuiz();
  } catch (error) {
    // Basic error handling so the terminal never fails silently.
    printLine(`Something went wrong: ${error.message}`, "wrong");
  }
}

window.addEventListener("DOMContentLoaded", startGame);