import {
  GAME_SETTINGS,
  PROMPTS_MESSAGES,
  ERROR_MESSAGES,
  FEEDBACK_MESSAGES,
  GAME_FLOW_MESSAGES,
  SCORE_DETAILS,
  GAME_OVER_SCORE_DETAIL,
  CANCELED_GAME_SCORE_DETAIL,
  SCORE_MESSAGES,
} from "./constants.js";

import {
  generateRandomNumber,
  validatePlayerGuess,
  delay,
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
  calculateGameStats,
} from "./utils.js";

import { DEFAULT_STATE } from "./gameState.js";

const logMessages = [];

const logMessage = (message) => {
  logMessages.unshift(message); 
  console.clear();
  for (let i = logMessages.length - 1; i >= 0; i--) {
    console.log(logMessages[i]);
  }
};

const getPlayerGuess = (state) => {
  let playerGuessNumber = 0;
  let isPlayerGuessValid = false;

  do {
    const promptMessage = `Round ${state.currentRound.roundNumber}: ${PROMPTS_MESSAGES.GUESS_PROMPT}`;
    playerGuessNumber = prompt(promptMessage);

    if (playerGuessNumber === null) {
      alert(GAME_FLOW_MESSAGES.GAME_CANCELLED);
      logMessage(GAME_FLOW_MESSAGES.GAME_CANCELLED);
      return null;
    }

    if (playerGuessNumber.toLowerCase() === "restart") {
      alert(GAME_FLOW_MESSAGES.GAME_RESTARTED);
      logMessage(GAME_FLOW_MESSAGES.GAME_RESTARTED);
      state.rounds = [];
      state.currentRound = { ...DEFAULT_STATE.currentRound, roundNumber: 1 };
      startGameWithDelay(state);
      return "restart";
    }

    const errorMessage = validatePlayerGuess(playerGuessNumber);

    if (errorMessage) {
      alert(errorMessage);
      logMessage(errorMessage);
    } else {
      isPlayerGuessValid = true;
    }
  } while (!isPlayerGuessValid);

  return Number(playerGuessNumber);
};

const checkGuess = (playerGuess, correctNumber) => {
  const guessDifference = Math.abs(playerGuess - correctNumber);

  const replaceGuessPlaceholder = (message) => message.replace('${playerGuess}', playerGuess);

  if (playerGuess === correctNumber) {
    return FEEDBACK_MESSAGES.CORRECT_GUESS;
  } else if (playerGuess < correctNumber) {
    return replaceGuessPlaceholder(
      guessDifference <= GAME_SETTINGS.CLOSE_RANGE
        ? FEEDBACK_MESSAGES.LOW_GUESS_CLOSE
        : FEEDBACK_MESSAGES.LOW_GUESS
    );
  } else {
    return replaceGuessPlaceholder(
      guessDifference <= GAME_SETTINGS.CLOSE_RANGE
        ? FEEDBACK_MESSAGES.HIGH_GUESS_CLOSE
        : FEEDBACK_MESSAGES.HIGH_GUESS
    );
  }
};

const playGameRound = (state) => {
  let resultMessage = "";

  // Loop until max attempts or correct guess
  while (
    state.currentRound.attempts < GAME_SETTINGS.MAX_ATTEMPTS &&
    !state.currentRound.hasWon
  ) {
    const playerGuess = getPlayerGuess(state);

    if (playerGuess === "restart") {
      return "restart"; // Return "restart" if a restart is triggered
    }

    if (playerGuess === null) {
      state.currentRound.isCancelled = true;
      break;
    }

    resultMessage = checkGuess(playerGuess, state.currentRound.correctNumber);

    if (resultMessage.includes(FEEDBACK_MESSAGES.CORRECT_GUESS)) {
      state.currentRound.hasWon = true;
    }

    state.currentRound.attempts++;

    const alertMessage = state.currentRound.hasWon
      ? `${resultMessage} You got the correct number in ${state.currentRound.attempts} attempts! The correct number was: ${state.currentRound.correctNumber}`
      : resultMessage;
    alert(alertMessage);
    logMessage(alertMessage);
  }

  if (
    state.currentRound.attempts === GAME_SETTINGS.MAX_ATTEMPTS &&
    !state.currentRound.hasWon
  ) {
    const alertMessage = FEEDBACK_MESSAGES.MAX_ATTEMPTS_REACHED + state.currentRound.correctNumber;
    alert(alertMessage);
    logMessage(alertMessage);
  }
};

const getCurrentScoreDetail = (state) => {
  // Handle cancelled game
  if (state.currentRound.isCancelled) {
    return {
      message:
        CANCELED_GAME_SCORE_DETAIL.MESSAGE + CANCELED_GAME_SCORE_DETAIL.SCORE,
      score: CANCELED_GAME_SCORE_DETAIL.SCORE,
    };
  }

  // Handle game won scenario
  if (state.currentRound.hasWon) {
    const scoreDetail = SCORE_DETAILS.find(
      (detail) => state.currentRound.attempts <= detail.MAX_ATTEMPTS
    );

    return {
      message: scoreDetail.MESSAGE + scoreDetail.SCORE,
      score: scoreDetail.SCORE,
    };
  }

  // Handle game over scenario (neither won nor cancelled)
  return {
    message: GAME_OVER_SCORE_DETAIL.MESSAGE + GAME_OVER_SCORE_DETAIL.SCORE,
    score: GAME_OVER_SCORE_DETAIL.SCORE,
  };
};

const updateGameStateAfterRound = (state, score) => {
  // Update the score
  state.currentRound.score = score;

  // Push the current round to the rounds array
  state.rounds.push({ ...state.currentRound });

  // Reset the current round to defaults for the next round
  state.currentRound = {
    ...DEFAULT_STATE.currentRound,
    roundNumber: state.rounds.length + 1,
  };
};

const game = (state) => {
  state.currentRound.correctNumber = generateRandomNumber(
    GAME_SETTINGS.MIN_NUMBER,
    GAME_SETTINGS.MAX_NUMBER
  );

  // Play the round
  const roundResult = playGameRound(state);

  // If the round was restarted, exit the function early
  if (roundResult === "restart") {
    return;
  }

  console.clear()
  // Calculate the current score after the round
  const scoreDetail = getCurrentScoreDetail(state);

  // Update the state
  updateGameStateAfterRound(state, scoreDetail.score);

  // Calculate the total score and other game statistics after the round
  const { totalScore, roundsWon, roundsLost, roundsCancelled } =
    calculateGameStats(state);

  // Alert the player of the score feedback, total score, and rounds won, lost, and cancelled
  const alertMessage = `${scoreDetail.message}. ${SCORE_MESSAGES.TOTAL_SCORE + totalScore}. ` +
    `Rounds won: ${roundsWon}, Rounds lost: ${roundsLost}, Rounds cancelled: ${roundsCancelled}.`;
  alert(alertMessage);
  logMessage(alertMessage);

  // Save the updated state to local storage
  saveStateToLocalStorage(state);

  // Asking the player if they want to play again
  const shouldPlayAgain = confirm(PROMPTS_MESSAGES.NEXT_ROUND);

  if (shouldPlayAgain) {
    game(state);
  } else {
    alert(GAME_FLOW_MESSAGES.THANKS_FOR_PLAYING);
    logMessage(GAME_FLOW_MESSAGES.THANKS_FOR_PLAYING);
  }
};


const startGameWithDelay = async (state) => {
  try {
    await delay(GAME_SETTINGS.INITIAL_DELAY);

    //Welcome message(only for the first time)
    state.currentRound.roundNumber === 1 && alert(GAME_FLOW_MESSAGES.WELCOME);

    // Notify the player which round they are currently playing
    alert(`Round ${state.currentRound.roundNumber}`);

    //play
    game(state);
    console.debug();
  } catch (error) {
    console.error(error);
    alert(error.message ? error.message : ERROR_MESSAGES.GAME_INITIALIZATION);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Reset the state to the default state
  const state = JSON.parse(JSON.stringify(DEFAULT_STATE)); // Deep copy of DEFAULT_STATE

  // Save the reset state to local storage
  saveStateToLocalStorage(state);

  // Start the game with the reset state
  startGameWithDelay(state);
});