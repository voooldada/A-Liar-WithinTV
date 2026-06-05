import { createRoom, joinRoom, listenRoom, updateRoom } from './multiplayer.js';
import { GameRoles, ROLES } from './gameRoles.js';
import { GameVoting } from './gameVoting.js';
import { GameTurns, PHASES } from './gameTurns.js';
import { GameState } from './gameState.js';
import { GameChat } from './gameChat.js';
import { getDatabase, ref, update, onValue, get } from 'https://www.gstatic.com/firebasejs/12.12.1/firebase-database.js';

const title = document.getElementById('game-title');
const body = document.body;
const heroScreen = document.querySelector('main.hero-screen');
const playButton = document.getElementById('play-button');
const loginScreen = document.getElementById('login-screen');
const cityScreen = document.getElementById('city-screen');
const backButton = document.getElementById('back-button');
const enterCityButton = document.getElementById('enter-city-button');
const leaveCityButton = document.getElementById('leave-city-button');
const startGameButton = document.getElementById('start-game-button');
const playerNameInput = document.getElementById('player-name-input');
const roomCodeInput = document.getElementById('room-code-input');
const roomCodeOutput = document.getElementById('room-code');
const roomInfoBlock = document.getElementById('room-info-block');
const statusText = document.getElementById('status-text');
const cityBuildings = document.getElementById('city-buildings');
const currentRoomCode = document.getElementById('current-room-code');
const playersCount = document.getElementById('players-count');
const gameStatus = document.getElementById('game-status');
const lobbyAudioButton = document.getElementById('lobby-audio-button');

// Game sequence screens
const corruptionScreen = document.getElementById('corruption-screen');
const skyIntroScreen = document.getElementById('sky-intro-screen');
const gameScreen = document.getElementById('game-screen');
const playersList = document.getElementById('players-list');

let currentRoom = null;
let roomListener = null;
let currentRoomData = null;
let inWordTestPhase = false;
let selectedDetectiveTest = null;
let selectedDetectivePercentageTarget = null;
let detectivePercentageSelectionLocked = false;

// Game systems
let gameRoles = null;
let gameVoting = null;
let gameTurns = null;
let gameState = null;
let gameChat = null;
let currentPlayerId = null;
let currentPlayerRole = null;
let gameInitialized = false;
let gameInitializingPromise = null;
let playerReady = false;
let gameStarted = false;
let lastAlivePlayers = [];
let currentPlayerName = null;
let currentChatMode = 'civil';
let selectedPrivateRecipientId = null;
let selectedPrivateRecipientName = null;
let selectedPrivateRecipientProfile = 'player';
let selectedChatConversationId = null;
let privateChatUnsubscribe = null;
let publicChatUnsubscribe = null;
let roleProfileUnsubscribe = null;
let continueActionsUnsubscribe = null;
let votingContinueActionsUnsubscribe = null;
let votingRequestsUnsubscribe = null;
let votesUnsubscribe = null;
let readyStatusUnsubscribe = null;
let detectiveNotificationUnsubscribe = null;
let detectiveNotificationPathUnsubscribe = null;
let nightAnnouncementTimer = null;
let recruitmentCheckInterval = null;
let lastRecruitmentOfferStatus = null;
let lastDetectiveNotificationTimestamp = null;
let isShowingDetectiveNotification = false;
let pendingTraitorNeighborhoodAnnouncement = false;
let pendingTraitorNeighborhoodCallback = null;

// New game screens
const roleRevealScreen = document.getElementById('role-reveal-screen');
const nightScreen = document.getElementById('night-screen');
const doctorScreen = document.getElementById('doctor-screen');
const doctorBg = document.getElementById('doctor-bg');
const detectiveScreen = document.getElementById('detective-screen');
const detectiveTestScreen = document.getElementById('detective-test-screen');
const detectiveBg = document.getElementById('detective-bg');
const votingScreen = document.getElementById('voting-screen');
const deathNotificationScreen = document.getElementById('death-notification-screen');
const dayDiscussionScreen = document.getElementById('day-discussion-screen');
const victoryScreen = document.getElementById('victory-screen');
const assassinScreen = document.getElementById('assassin-screen');
const traitorScreen = document.getElementById('traitor-screen');

// Role reveal elements
const roleBadge = document.getElementById('role-badge');
const roleDescription = document.getElementById('role-description');
const roleRevealBg = document.getElementById('role-reveal-bg');
const roleReadyButton = document.getElementById('role-ready-button');
const readyButton = document.getElementById('ready-button');
const tvModeButton = document.getElementById('tv-mode-button');
const tvModal = document.getElementById('tv-modal');
const tvCloseBtn = document.getElementById('tv-close-btn');
const tvScannerStatus = document.getElementById('tv-scanner-status');
const tvRequestPermissionButton = document.getElementById('tv-request-permission-button');
const tvCodeDisplay = document.getElementById('tv-code-display');
const tvCopyCodeButton = document.getElementById('tv-copy-code-button');

// Night elements
const nightTimer = document.getElementById('night-timer');
const nightMessage = document.getElementById('night-message');
const nightContinueButton = document.getElementById('night-continue-button');

// Detectives instruction
const detectiveInstruction = document.getElementById('detective-instruction');

// Action buttons
const doctorSkipButton = document.getElementById('doctor-skip-button');
const doctorConfirmButton = document.getElementById('doctor-confirm-button');
const detectiveTestButton = document.getElementById('detective-test-button');
const detectiveNotifyButton = document.getElementById('detective-notify-button');
const detectiveWordTestButton = document.getElementById('detective-word-test-button');
const detectivePercentageTestButton = document.getElementById('detective-percentage-test-button');
const votingConfirmButton = document.getElementById('voting-confirm-button');
const votingSkipButton = document.getElementById('voting-skip-button');
const continueButton = document.getElementById('continue-button');
const votingButton = document.getElementById('voting-button');
const assassinConfirmButton = document.getElementById('assassin-confirm-button');
const assassinSkipButton = document.getElementById('assassin-skip-button');
const traitorConfirmButton = document.getElementById('traitor-confirm-button');
const traitorSkipButton = document.getElementById('traitor-skip-button');
const audioPermissionButton = document.getElementById('audio-permission-button');
const discussionAudioButton = document.getElementById('discussion-audio-button');
const langPtButton = document.getElementById('lang-pt');
const langEnButton = document.getElementById('lang-en');
let currentLanguage = localStorage.getItem('gameLanguage') || 'pt';

const translations = {
  pt: {
    gameTitle: 'A Liar Within',
    play: 'Jogar',
    subtitle: 'Você consegue encontrar a rota de fuga?',
    loginBadge: 'Portões de Berlim',
    loginTitle: 'Documentação do cidadão',
    loginDescription: 'Sua documentação é necessária, por favor insira seu nome.',
    playerNamePlaceholder: 'Nome do cidadão',
    roomCodePlaceholder: 'Código dos portões (opcional)',
    enterCity: 'Entrar na cidade',
    roomOpen: 'Portão aberto',
    statusWaiting: 'Seu portão será criado assim que você entrar.',
    audioButton: 'Som',
    back: 'Voltar',
    roomLabel: 'Sala:',
    playersLabel: 'Jogadores:',
    waitingPlayers: 'Aguardando pelo menos 4 jogadores para começar...',
    readyCount: 'Pronto ({count}/{total})',
    leaveCity: 'Sair da cidade',
    tvModalTitle: 'Conectar à TV',
    tvModalDescription: 'Gere um código e insira-o no site da TV para conectar como espectador.',
    tvModalCodeLabel: 'Código da Sala:',
    copy: 'Copiar',
    tvModalInstruction: 'Copie ou digite esse link no navegador do PC/TV e cole o código da sala na página.',
    roleRevealTitle: 'Seu Role:',
    roleRevealDescription: 'Você é um civil. Trabalhe com sua equipe para encontrar o assassino.',
    ready: 'Pronto',
    nightTitle: 'A CIDADE DORME...',
    nightMessage: 'Aguarde enquanto o ciclo noturno começa...',
    assassinTitle: 'ASSASSINO',
    assassinSubtitle: 'Escolha sua vítima:',
    skipNight: 'Não matar esta noite',
    confirm: 'Confirmar',
    traitorTitle: 'TRAIDOR',
    traitorSubtitle: 'Escolha sua vítima:',
    doctorTitle: 'MÉDICO',
    doctorSubtitle: 'Escolha quem salvar:',
    skipDoctor: 'Não salvar esta noite',
    detectiveTitle: 'DETETIVE',
    detectiveInstruction: 'Detetive, comece a investigação',
    detectiveWordTestTitle: 'Teste da Palavra',
    detectiveWordTestDesc: 'Todos recebem uma palavra, assassino uma similar',
    detectivePercentageTestTitle: 'Teste da Porcentagem',
    detectivePercentageTestDesc: 'Mostra suspeitas de assassinato por jogador',
    detectiveNotifyTitle: 'Notificar Investigação',
    detectiveNotifyDesc: 'Notificar alguém que está sob suspeita',
    done: 'Terminei',
    wordTestTitle: 'PALAVRA DO TESTE',
    wordTestInstruction: 'Todos devem clicar em continuar para ir para a discussão.',
    goToDiscussion: 'Ir para Discussão',
    detectiveTestTitle: 'TESTE DETETIVE',
    wordTestResultsTitle: 'Resultado do Teste da Palavra',
    percentageTestResultsTitle: 'Resultado do Teste da Porcentagem',
    detectiveInvestigationAlert: '⚠️ Tem alguém te investigando...',
    continueToDiscussion: 'Continuar para Discussão',
    investigationTitle: 'INVESTIGAÇÃO',
    detectiveNotificationMessage: 'Você está sendo investigado pelo Detetive.',
    continue: 'Continuar',
    votingTitle: 'VOTAÇÃO',
    votingSubtitle: 'Quem deve sair?',
    confirmVote: 'Confirmar Voto',
    continueDiscussion: 'Continuar Discussão',
    eliminatedTitle: 'ELIMINADO',
    continueToLobby: 'Continuar para o lobby',
    deathRoleRevealMessage: 'Ele era o {role}.',
    deathTraitorAliveWarning: 'Ainda existe um traidor entre nós.',
    dayDiscussionTitle: 'DISCUSSÃO DO DIA',
    goToVoting: 'Ir a Votos',
    openChat: 'Abrir Chat',
    chatTitle: 'CHAT DA CIDADE',
    publicTab: 'Público',
    privateTab: 'Privado',
    ordersTab: 'Ordens',
    publicMessagePlaceholder: 'Digite uma mensagem...',
    send: 'Enviar',
    sendAsAssassin: 'Enviar como ASSASSINO',
    groupsTab: 'Condomínio',
    contactsTab: 'Contactos',
    selectContact: 'Selecione um contato para iniciar',
    secretChat: 'Chat Secreto',
    sendAsDoctor: 'Enviar como MÉDICO',
    sendAsDetective: 'Enviar como DETETIVE',
    sendAsTraitor: 'Enviar como TRAIDOR',
    talkWith: 'Converse com:',
    selectPlayer: 'Selecione um jogador para iniciar',
    privateMessagePlaceholder: 'Digite uma mensagem privada...',
    traitorMaskTitle: 'Máscara do Traidor',
    maskNamePlaceholder: 'Nome exibido (ex: João)',
    maskColorDetective: 'Cor do Detetive (Amarelo)',
    maskColorAssassin: 'Cor do Assassino (Vermelho)',
    maskColorDoctor: 'Cor do Médico (Verde)',
    maskColorCivil: 'Cor do Civil (Cinza)',
    useMask: 'Usar máscara',
    closeMask: 'Fechar',
    removeMask: 'Tirar Máscara',
    apply: 'Aplicar',
    recruitTraitor: 'Recrutar Traidor',
    ordersForTraitor: 'Ordens para o Traidor',
    orderPlaceholder: 'Digite uma ordem para o Traidor...',
    sendOrder: 'Enviar Ordem',
    recruitmentProposal: 'PROPOSTA DE RECRUTAMENTO',
    recruitmentMessage: 'Você foi convidado para se unir ao Assassino. Aceita?',
    accept: 'Aceitar',
    decline: 'Recusar',
    victoryTitle: 'CIVIS VENCEM',
    returnToLobby: 'Voltar ao Lobby',
    expandRestore: 'Expandir/Restaurar',
    closeChat: 'Fechar',
    audioEnabled: 'Som ativado',
    audioStatusOn: 'Som ativado. Todos os sons do jogo podem ser ouvidos.',
    audioStatusAllow: 'Permita o som para ouvir as músicas e efeitos do jogo.',
    nightMessage: 'A cidade dorme...',
    doctorWakeup: 'Médico acorda e salve a vida de alguém',
    selectionLocked: 'Você já escolheu um jogador para esta noite.',
    choosePlayerPercentage: 'Escolha um jogador para ver sua porcentagem',
    noPlayersForInvestigation: 'Nenhum jogador disponível para investigar.',
    percentageNoteAssassinMirror: 'O assassino tem uma porcentagem igual a outro jogador neste teste.',
    percentageNoteMirror: 'Este jogador compartilha a mesma porcentagem do assassino.',
    unavailable: 'Indisponível',
    goToDiscussionCount: 'Ir para Discussão ({count}/{total})',
    continueCount: 'Continuar ({count}/{total})',
    goToVotingCount: 'Ir a Votos ({count}/{total})',
    playerDeadLobby: 'Você foi eliminado. Volte ao lobby para jogar novamente.',
    playerEliminatedWatching: 'Você foi eliminado. Aguarde os outros jogadores terminarem a partida.',
    waitingForPlayers: 'Aguardando os outros jogadores...',
    wordTestActivated: 'Teste da palavra ativado. Resultados aparecerão de dia.',
    percentageTestActivated: 'Teste da porcentagem ativado. Resultados aparecerão de dia.',
    noPlayersToTalk: 'Nenhum jogador disponível para conversar.',
    unknown: 'Desconhecido',
    roomNotFound: 'Sala não encontrada. Verifique o código.',
    enterCityError: 'Não foi possível entrar na cidade. Tente novamente.',
    readyConfirmError: 'Não foi possível confirmar pronto. Tente novamente.',
    enteringRoom: 'Entrando na sala...',
    openingPortal: 'Abrindo portal...',
    welcomeRoom: 'Bem-vindo, {playerName}. Você entrou na sala {roomCode}.',
    whoNotify: 'Quem você quer notificar?',
    assassinVictory: 'ASSASSINO VENCEU',
    traitorVictory: 'TRAIDOR VENCEU',
    cityVictory: 'A CIDADE SOBREVIVEU',
    voteCountSingular: '{count} voto',
    voteCountPlural: '{count} votos',
    waitingPlayersCount: 'Aguardando mais {remaining} jogador{plural} para começar...',
    playerWaitingCount: '✓ {count} jogadores aguardando...',
    playerLimitExceeded: 'Limite de {maxPlayers} jogadores ultrapassado.'
  },
  en: {
    gameTitle: 'A Liar Within',
    play: 'Play',
    subtitle: 'Can you find the escape route?',
    loginBadge: 'Berlin Gates',
    loginTitle: 'Citizen Documentation',
    loginDescription: 'Your documentation is required, please enter your name.',
    playerNamePlaceholder: 'Citizen name',
    roomCodePlaceholder: 'Gate code (optional)',
    enterCity: 'Enter the city',
    roomOpen: 'Gate open',
    statusWaiting: 'Your gate will be created once you enter.',
    audioButton: 'Sound',
    back: 'Back',
    roomLabel: 'Room:',
    playersLabel: 'Players:',
    waitingPlayers: 'Waiting for at least 4 players to start...',
    readyCount: 'Ready ({count}/{total})',
    leaveCity: 'Leave city',
    tvModalTitle: 'Connect to TV',
    tvModalDescription: 'Generate a code and paste it into the TV site to connect as a spectator.',
    tvModalCodeLabel: 'Room Code:',
    copy: 'Copy',
    tvModalInstruction: 'Copy or type this link into the PC/TV browser and paste the room code on the page.',
    roleRevealTitle: 'Your Role:',
    roleRevealDescription: 'You are a civilian. Work with your team to find the assassin.',
    ready: 'Ready',
    nightTitle: 'THE CITY SLEEPS...',
    nightMessage: 'Wait while the night cycle begins...',
    assassinTitle: 'ASSASSIN',
    assassinSubtitle: 'Choose your victim:',
    skipNight: 'Do not kill tonight',
    confirm: 'Confirm',
    traitorTitle: 'TRAITOR',
    traitorSubtitle: 'Choose your victim:',
    doctorTitle: 'DOCTOR',
    doctorSubtitle: 'Choose who to save:',
    skipDoctor: 'Do not save tonight',
    detectiveTitle: 'DETECTIVE',
    detectiveInstruction: 'Detective, start your investigation',
    detectiveWordTestTitle: 'Word Test',
    detectiveWordTestDesc: 'Everyone gets a word, assassin gets something similar',
    detectivePercentageTestTitle: 'Percentage Test',
    detectivePercentageTestDesc: 'Shows murder suspicion per player',
    detectiveNotifyTitle: 'Notify Investigation',
    detectiveNotifyDesc: 'Notify someone that is under suspicion',
    done: 'Done',
    wordTestTitle: 'TEST WORD',
    wordTestInstruction: 'Everyone must click continue to go to discussion.',
    goToDiscussion: 'Go to Discussion',
    detectiveTestTitle: 'DETECTIVE TEST',
    wordTestResultsTitle: 'Word Test Result',
    percentageTestResultsTitle: 'Percentage Test Result',
    detectiveInvestigationAlert: '⚠️ Someone is investigating you...',
    continueToDiscussion: 'Continue to Discussion',
    investigationTitle: 'INVESTIGATION',
    detectiveNotificationMessage: 'You are being investigated by the Detective.',
    continue: 'Continue',
    votingTitle: 'VOTING',
    votingSubtitle: 'Who should leave?',
    confirmVote: 'Confirm Vote',
    continueDiscussion: 'Continue Discussion',
    eliminatedTitle: 'ELIMINATED',
    continueToLobby: 'Continue to lobby',
    deathRoleRevealMessage: 'They were the {role}.',
    deathTraitorAliveWarning: 'There is still a traitor among us.',
    dayDiscussionTitle: 'DAY DISCUSSION',
    goToVoting: 'Go to Voting',
    openChat: 'Open Chat',
    chatTitle: 'CITY CHAT',
    publicTab: 'Public',
    privateTab: 'Private',
    ordersTab: 'Orders',
    publicMessagePlaceholder: 'Type a message...',
    send: 'Send',
    sendAsAssassin: 'Send as ASSASSIN',
    groupsTab: 'Condominium',
    contactsTab: 'Contacts',
    selectContact: 'Select a contact to start',
    secretChat: 'Secret Chat',
    sendAsDoctor: 'Send as DOCTOR',
    sendAsDetective: 'Send as DETECTIVE',
    sendAsTraitor: 'Send as TRAITOR',
    talkWith: 'Talk with:',
    selectPlayer: 'Select a player to start',
    privateMessagePlaceholder: 'Type a private message...',
    traitorMaskTitle: 'Traitor Mask',
    maskNamePlaceholder: 'Displayed name (ex: John)',
    maskColorDetective: 'Detective color (Yellow)',
    maskColorAssassin: 'Assassin color (Red)',
    maskColorDoctor: 'Doctor color (Green)',
    maskColorCivil: 'Civil color (Grey)',
    useMask: 'Use mask',
    closeMask: 'Close',
    removeMask: 'Remove Mask',
    apply: 'Apply',
    recruitTraitor: 'Recruit Traitor',
    ordersForTraitor: 'Orders for the Traitor',
    orderPlaceholder: 'Type an order for the Traitor...',
    sendOrder: 'Send Order',
    recruitmentProposal: 'RECRUITMENT PROPOSAL',
    recruitmentMessage: 'You have been invited to join the Assassin. Accept?',
    accept: 'Accept',
    decline: 'Decline',
    victoryTitle: 'CIVILIANS WIN',
    returnToLobby: 'Return to Lobby',
    expandRestore: 'Expand/Restore',
    closeChat: 'Close',
    audioEnabled: 'Sound enabled',
    audioStatusOn: 'Sound enabled. All game sounds can be heard.',
    audioStatusAllow: 'Allow sound to hear the music and effects.',
    nightMessage: 'The city sleeps...',
    doctorWakeup: 'Doctor wakes up and save someone.',
    selectionLocked: 'You already chose a player for tonight.',
    choosePlayerPercentage: 'Choose a player to view their percentage',
    noPlayersForInvestigation: 'No player available to investigate.',
    percentageNoteAssassinMirror: 'The assassin has the same percentage as another player in this test.',
    percentageNoteMirror: 'This player shares the same percentage as the assassin.',
    unavailable: 'Unavailable',
    goToDiscussionCount: 'Go to Discussion ({count}/{total})',
    continueCount: 'Continue ({count}/{total})',
    goToVotingCount: 'Go to Voting ({count}/{total})',
    playerDeadLobby: 'You have been eliminated. Return to the lobby to play again.',
    playerEliminatedWatching: 'You have been eliminated. Wait for other players to finish the match.',
    waitingForPlayers: 'Waiting for other players...',
    wordTestActivated: 'Word test activated. Results will appear during the day.',
    percentageTestActivated: 'Percentage test activated. Results will appear during the day.',
    noPlayersToTalk: 'No player available to chat.',
    unknown: 'Unknown',
    roomNotFound: 'Room not found. Check the code.',
    enterCityError: 'Unable to enter the city. Please try again.',
    readyConfirmError: 'Could not confirm ready. Please try again.',
    enteringRoom: 'Entering the room...',
    openingPortal: 'Opening portal...',
    welcomeRoom: 'Welcome, {playerName}. You have entered room {roomCode}.',
    whoNotify: 'Who do you want to notify?',
    assassinVictory: 'ASSASSIN WINS',
    traitorVictory: 'TRAITOR WINS',
    cityVictory: 'THE CITY SURVIVED',
    voteCountSingular: '{count} vote',
    voteCountPlural: '{count} votes',
    waitingPlayersCount: 'Waiting for {remaining} more player{plural} to start...',
    playerWaitingCount: '✓ {count} players waiting...',
    playerLimitExceeded: 'Limit of {maxPlayers} players exceeded.'
  }
};

function translateString(key, replacements = {}) {
  const languageStrings = translations[currentLanguage] || translations.pt;
  let text = languageStrings[key] || translations.pt[key] || key;

  Object.entries(replacements).forEach(([name, value]) => {
    text = text.replace(new RegExp(`\{${name}\}`, 'g'), value);
  });

  return text;
}

function translateElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return;

  const translateKey = element.dataset.i18n;
  const placeholderKey = element.dataset.i18nPlaceholder;
  const titleKey = element.dataset.i18nTitle;

  if (translateKey) {
    if (translateKey === 'readyCount') {
      const playerCount = currentRoomData ? Object.values(currentRoomData.players || {}).length : 0;
      const readyCount = currentRoomData ? Object.values(currentRoomData.players || {}).filter(player => player.ready === true).length : 0;
      element.textContent = translateString('readyCount', { count: readyCount, total: playerCount });
    } else {
      element.textContent = translateString(translateKey);
    }
  }

  if (placeholderKey && 'placeholder' in element) {
    element.placeholder = translateString(placeholderKey);
  }

  if (titleKey) {
    const value = translateString(titleKey);
    element.title = value;
    if (element.hasAttribute('aria-label')) {
      element.setAttribute('aria-label', value);
    }
  }
}

function translatePage(lang) {
  currentLanguage = lang;
  localStorage.setItem('gameLanguage', lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
  if (gameRoles) {
    gameRoles.language = currentLanguage;
  }

  // 🎵 Recarrega áudios do narrador com o novo idioma
  reloadNarratorAudio();

  document.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title]').forEach(translateElement);

  if (langPtButton && langEnButton) {
    langPtButton.classList.toggle('active', lang === 'pt');
    langEnButton.classList.toggle('active', lang === 'en');
  }

  if (statusText && audioPermissionGranted) {
    statusText.textContent = translateString('audioStatusOn');
  }

  if (wordTestScreen && !wordTestScreen.classList.contains('hidden') && currentRoomData?.gameState?.detectiveWordTest) {
    const detectiveWordTest = currentRoomData.gameState.detectiveWordTest;
    const wordTestResult = GameRoles.getTranslatedDetectiveWordTestResult(detectiveWordTest, currentLanguage, currentPlayerRole);
    if (wordDisplay && wordTestResult) {
      wordDisplay.textContent = wordTestResult;
    }
  }

  if (gameStatus) {
    updateGameStatus();
  }

  if (currentRoom) {
    void persistRoomLanguage(currentRoom, currentLanguage);
  }
}

async function persistRoomLanguage(roomCode, language) {
  if (!roomCode) return;
  try {
    await updateRoom(roomCode, { language });
  } catch (error) {
    console.warn('Erro ao salvar idioma da sala:', error);
  }
}

function initializeLanguageSwitcher() {
  if (langPtButton) {
    langPtButton.addEventListener('click', () => translatePage('pt'));
  }
  if (langEnButton) {
    langEnButton.addEventListener('click', () => translatePage('en'));
  }
}

let nightMusic = null;
let roleMusic = null;
let dayMusic = null;
let lobbyMusic = null;
let votingMusic = null;
let assassinWinMusic = null;
let cityWinMusic = null;
let assassinWakeupAudio = null;
let doctorWakeupAudio = null;
let detectiveWakeupAudio = null;
let traitorWakeupAudio = null;
let traitorWarningAudio = null;
let votingAudio = null;
let dayAudio = null;
let eliminationAudio = null;
let nightAudio = null;
let audioPermissionGranted = false;

// 🎵 Mapeamento de áudios por idioma
const AUDIO_PATHS = {
  assassinWakeup: { pt: 'Narrator/AssassinWakeup.mp3', en: 'NarratorENGV/AssassinoAcorda.mp3' },
  traitorWakeup: { pt: 'Narrator/TraitorWakeup.mp3', en: 'NarratorENGV/TraidorAcorda.mp3' },
  traitorWarning: { pt: 'Narrator/TraitorWarning.mp3', en: 'NarratorENGV/AvisoTraidor.mp3' },
  doctorWakeup: { pt: 'Narrator/DoctorWakeup.mp3', en: 'NarratorENGV/DoutorAcorda.mp3' },
  detectiveWakeup: { pt: 'Narrator/DetectiveWakeup.mp3', en: 'NarratorENGV/DetetiveAcorda.mp3' },
  voting: { pt: 'Narrator/Voting.mp3', en: 'NarratorENGV/Votacao.mp3' },
  day: { pt: 'Narrator/Day.mp3', en: 'NarratorENGV/Dia.mp3' },
  elimination: { pt: 'Narrator/Elimination.mp3', en: 'NarratorENGV/Eliminacao.mp3' },
  night: { pt: 'Narrator/Night.mp3', en: 'NarratorENGV/Noite.mp3' }
};

function getAudioPath(audioName, language = 'pt') {
  return AUDIO_PATHS[audioName]?.[language] || AUDIO_PATHS[audioName]?.['pt'] || audioName;
}

function getNarratorAudioPath(audioName, language = currentLanguage) {
  return getAudioPath(audioName, language);
}

// Death notification
const deathPlayerName = document.getElementById('death-player-name');
const deathPlayerRole = document.getElementById('death-player-role');
const deathNotificationExtra = document.getElementById('death-notification-extra');
const deathContinueButton = document.getElementById('death-continue-button');

// Victory
const victoryTitle = document.getElementById('victory-title');
const victoryPlayersList = document.getElementById('victory-players-list');
const victoryReplayButton = document.getElementById('victory-replay-button');

// Chat
const chatScreen = document.getElementById('chat-screen');
const chatCloseButton = document.getElementById('chat-close-button');
const chatFullscreenButton = document.getElementById('chat-fullscreen-btn');
const chatHeaderEl = document.getElementById('chat-header');
const chatTabs = document.querySelectorAll('.chat-tab');
const chatTabContents = document.querySelectorAll('.chat-tab-content');
const publicMessagesDiv = document.getElementById('public-messages');
const privateMessagesDiv = document.getElementById('private-messages');
const publicMessageInput = document.getElementById('public-message-input');
const privateMessageInput = document.getElementById('private-message-input');
const publicSendButton = document.getElementById('public-send-button');
const privateSendButton = document.getElementById('private-send-button');
const openChatButton = document.getElementById('open-chat-button');
const openSecretChatButton = document.getElementById('open-secret-chat-button');
const ordersTabButton = document.getElementById('orders-tab-button');
const privateRecipientLabel = document.getElementById('private-recipient-label');
const groupList = document.getElementById('group-list');
const groupCondominioButton = document.getElementById('group-condominio');
const chatConversationList = document.getElementById('chat-conversation-list');
const contactsListView = document.getElementById('contacts-list-view');
const privateChatView = document.getElementById('private-chat-view');
const chatBackButton = document.getElementById('chat-back-button');
const assassinProfileToggleLabel = document.getElementById('assassin-profile-toggle-label');
const traitorProfileToggleLabel = document.getElementById('traitor-profile-toggle-label');
const assassinProfileToggleLabelPublic = document.getElementById('assassin-profile-toggle-label-public');
const traitorProfileToggleLabelPublic = document.getElementById('traitor-profile-toggle-label-public');
const assassinProfileTogglePublic = document.getElementById('assassin-profile-toggle-public');
const traitorProfileTogglePublic = document.getElementById('traitor-profile-toggle-public');
const assassinProfileToggle = document.getElementById('assassin-profile-toggle');
const traitorProfileToggle = document.getElementById('traitor-profile-toggle');
const doctorProfileToggleLabel = document.getElementById('doctor-profile-toggle-label');
const doctorProfileToggleLabelPublic = document.getElementById('doctor-profile-toggle-label-public');
const doctorProfileTogglePublic = document.getElementById('doctor-profile-toggle-public');
const doctorProfileToggle = document.getElementById('doctor-profile-toggle');
const detectiveProfileToggleLabel = document.getElementById('detective-profile-toggle-label');
const detectiveProfileToggleLabelPublic = document.getElementById('detective-profile-toggle-label-public');
const detectiveProfileTogglePublic = document.getElementById('detective-profile-toggle-public');
const detectiveProfileToggle = document.getElementById('detective-profile-toggle');

// Fullscreen private chat
const privateChatFullscreen = document.getElementById('private-chat-fullscreen');
const privateChatBackBtn = document.getElementById('private-chat-back-btn');
const privateChatFullscreenTitle = document.getElementById('private-chat-fullscreen-title');
const privateMessagesFullscreenDiv = document.getElementById('private-messages-fullscreen');
const privateMessageInputFullscreen = document.getElementById('private-message-input-fullscreen');
const privateSendButtonFullscreen = document.getElementById('private-send-button-fullscreen');
const assassinProfileToggleLabelFullscreen = document.getElementById('assassin-profile-toggle-label-fullscreen');
const traitorProfileToggleLabelFullscreen = document.getElementById('traitor-profile-toggle-label-fullscreen');
const doctorProfileToggleLabelFullscreen = document.getElementById('doctor-profile-toggle-label-fullscreen');
const detectiveProfileToggleLabelFullscreen = document.getElementById('detective-profile-toggle-label-fullscreen');
const assassinProfileToggleFullscreen = document.getElementById('assassin-profile-toggle-fullscreen');
const traitorProfileToggleFullscreen = document.getElementById('traitor-profile-toggle-fullscreen');
const doctorProfileToggleFullscreen = document.getElementById('doctor-profile-toggle-fullscreen');
const detectiveProfileToggleFullscreen = document.getElementById('detective-profile-toggle-fullscreen');
const maskPanelFullscreen = document.getElementById('mask-panel-fullscreen');
const maskNameInputFullscreen = document.getElementById('mask-name-input-fullscreen');
const maskColorSelectFullscreen = document.getElementById('mask-color-select-fullscreen');
const maskUseToggleFullscreen = document.getElementById('mask-use-toggle-fullscreen');
const maskApplyButtonFullscreen = document.getElementById('mask-apply-button-fullscreen');
const maskCloseButtonFullscreen = document.getElementById('mask-panel-close-button-fullscreen');
const maskRemoveButtonFullscreen = document.getElementById('mask-remove-button-fullscreen');
const chatSidebar = document.getElementById('chat-sidebar');
const chatBody = document.querySelector('.chat-body');

// Chat Secreto e Ordens
const ordersPanel = document.getElementById('orders-panel');
const orderInput = document.getElementById('order-input');
const orderSendButton = document.getElementById('order-send-button');
const ordersInputArea = document.getElementById('orders-input-area');
const chatOrdersContent = document.getElementById('chat-orders');

// Traitor mask controls
const maskPanel = document.getElementById('mask-panel');
const maskNameInput = document.getElementById('mask-name-input');
const maskColorSelect = document.getElementById('mask-color-select');
const maskUseToggle = document.getElementById('mask-use-toggle');
const maskApplyButton = document.getElementById('mask-apply-button');
const maskCloseButton = document.getElementById('mask-panel-close-button');
const maskRemoveButton = document.getElementById('mask-remove-button');

let currentMaskName = null;
let currentMaskColor = null;
let maskEnabled = false;
let skipNextDayMusic = false;

// Modal de Recrutamento
const recruitmentModal = document.getElementById('recruitment-modal');
const acceptRecruitmentButton = document.getElementById('accept-recruitment');
const declineRecruitmentButton = document.getElementById('decline-recruitment');
const recruitTraitorButton = document.getElementById('recruit-traitor-button');
const recruitmentArea = document.getElementById('recruitment-area');

// Test elements
const percentageTestResults = document.getElementById('percentage-test-results');
const detectiveNotifications = document.getElementById('detective-notifications');
const percentageList = document.getElementById('percentage-list');
const percentageResultDisplay = document.getElementById('percentage-player-result');
const detectiveTestContinueButton = document.getElementById('detective-test-continue-button');
const wordTestScreen = document.getElementById('word-test-screen');
const wordDisplay = document.getElementById('word-display');
const wordTestInstruction = document.querySelector('.word-test-instruction');
const wordTestContinueButton = document.getElementById('word-test-continue-button');
const detectiveNotificationScreen = document.getElementById('detective-notification-screen');
const detectiveNotificationMessage = document.getElementById('detective-notification-message');
const detectiveNotificationContinueButton = document.getElementById('detective-notification-continue-button');
const detectiveDoneButton = document.getElementById('detective-done-button');

function setupNightMusic() {
  if (nightMusic) return;

  nightMusic = new Audio('Music/NightPhase.mp3');
  nightMusic.loop = true;
  nightMusic.volume = 0.3;
  nightMusic.preload = 'auto';
  nightMusic.crossOrigin = 'anonymous';
}

function setupRoleMusic() {
  if (roleMusic) return;

  roleMusic = new Audio('Music/Roles.mp3');
  roleMusic.loop = true;
  roleMusic.volume = 0.4;
  roleMusic.preload = 'auto';
  roleMusic.crossOrigin = 'anonymous';
}

function createAudio(source, options = {}) {
  const { loop = false, volume = 1, preload = 'auto' } = options;
  const audio = new Audio();
  audio.src = new URL(source, window.location.href).href;
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = preload;
  audio.muted = false;

  audio.addEventListener('error', (event) => {
    console.warn(`⚠️ Falha ao carregar áudio: ${audio.src}`, event);
  });

  audio.load();
  return audio;
}

function setupDayMusic() {
  if (dayMusic) return;

  dayMusic = createAudio('Music/DayPhase.mp3', { loop: true, volume: 0.35, preload: 'auto' });
}

function setupLobbyMusic() {
  if (lobbyMusic) return;

  lobbyMusic = createAudio('Music/Looby.mp3', { loop: true, volume: 0.35, preload: 'auto' });
}

function setupVotingMusic() {
  if (votingMusic) return;

  votingMusic = createAudio('Music/VotingPhase.mp3', { loop: true, volume: 0.35, preload: 'auto' });
}

function setupAssassinWinMusic() {
  if (assassinWinMusic) return;

  assassinWinMusic = createAudio('Music/AssassinWin.mp3', { loop: false, volume: 0.5, preload: 'auto' });
}

function reloadNarratorAudio() {
  // Descarrega todos os áudios do narrador
  if (assassinWakeupAudio) assassinWakeupAudio.pause();
  if (doctorWakeupAudio) doctorWakeupAudio.pause();
  if (detectiveWakeupAudio) detectiveWakeupAudio.pause();
  if (traitorWakeupAudio) traitorWakeupAudio.pause();
  if (traitorWarningAudio) traitorWarningAudio.pause();
  if (votingAudio) votingAudio.pause();
  if (dayAudio) dayAudio.pause();
  if (eliminationAudio) eliminationAudio.pause();
  if (nightAudio) nightAudio.pause();

  // Reseta as variáveis
  assassinWakeupAudio = null;
  doctorWakeupAudio = null;
  detectiveWakeupAudio = null;
  traitorWakeupAudio = null;
  traitorWarningAudio = null;
  votingAudio = null;
  dayAudio = null;
  eliminationAudio = null;
  nightAudio = null;
}

function setupAssassinWakeupAudio() {
  if (assassinWakeupAudio) return;
  const audioPath = getNarratorAudioPath('assassinWakeup');
  assassinWakeupAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function setupDoctorWakeupAudio() {
  if (doctorWakeupAudio) return;
  const audioPath = getNarratorAudioPath('doctorWakeup');
  doctorWakeupAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function setupDetectiveWakeupAudio() {
  if (detectiveWakeupAudio) return;
  const audioPath = getNarratorAudioPath('detectiveWakeup');
  detectiveWakeupAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function setupTraitorWakeupAudio() {
  if (traitorWakeupAudio) return;
  const audioPath = getNarratorAudioPath('traitorWakeup');
  traitorWakeupAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function setupTraitorWarningAudio() {
  if (traitorWarningAudio) return;
  const audioPath = getNarratorAudioPath('traitorWarning');
  traitorWarningAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function setupVotingAudio() {
  if (votingAudio) return;
  const audioPath = getNarratorAudioPath('voting');
  votingAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function setupDayAudio() {
  if (dayAudio) return;
  const audioPath = getNarratorAudioPath('day');
  dayAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function setupEliminationAudio() {
  if (eliminationAudio) return;
  const audioPath = getNarratorAudioPath('elimination');
  eliminationAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function setupNightAudio() {
  if (nightAudio) return;
  const audioPath = getNarratorAudioPath('night');
  nightAudio = createAudio(audioPath, { loop: false, volume: 0.8, preload: 'auto' });
}

function stopOverlayAudioExcept(currentAudio = null) {
  [assassinWakeupAudio, doctorWakeupAudio, detectiveWakeupAudio, traitorWakeupAudio, traitorWarningAudio, votingAudio, dayAudio, eliminationAudio, nightAudio].forEach((audio) => {
    if (!audio || audio === currentAudio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
    } catch (err) {
      console.warn('⚠️ Erro ao parar áudio de sobreposição anterior:', err);
    }
  });
}

function setupCityWinMusic() {
  if (cityWinMusic) return;

  cityWinMusic = new Audio('Music/CityWin.mp3');
  cityWinMusic.loop = false;
  cityWinMusic.volume = 0.5;
  cityWinMusic.preload = 'auto';
  cityWinMusic.crossOrigin = 'anonymous';
}

function setupAllAudio() {
  setupNightMusic();
  setupRoleMusic();
  setupDayMusic();
  setupLobbyMusic();
  setupVotingMusic();
  setupAssassinWinMusic();
  setupAssassinWakeupAudio();
  setupDoctorWakeupAudio();
  setupDetectiveWakeupAudio();
  setupTraitorWakeupAudio();
  setupTraitorWarningAudio();
  setupVotingAudio();
  setupDayAudio();
  setupEliminationAudio();
  setupNightAudio();
  setupCityWinMusic();
}

function stopAllAudio() {
  [nightMusic, roleMusic, dayMusic, lobbyMusic, votingMusic, assassinWakeupAudio, doctorWakeupAudio, detectiveWakeupAudio, traitorWakeupAudio, traitorWarningAudio, votingAudio, dayAudio, eliminationAudio, nightAudio, assassinWinMusic, cityWinMusic].forEach((audio) => {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  });
}

// Stop only background music (leave narrator/overlay audios playing)
function stopAllBackgroundMusic() {
  [nightMusic, roleMusic, dayMusic, lobbyMusic, votingMusic, assassinWinMusic, cityWinMusic].forEach((audio) => {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (err) {
      console.warn('Erro ao parar música de fundo:', err);
    }
  });
}

function playMusic(audio) {
  if (!audioPermissionGranted || !audio) return;
  if (!audio.src) {
    console.warn('⚠️ playMusic abortado: áudio não possui fonte definida');
    return;
  }
  // Only stop background music to avoid interrupting narrator/overlay audios
  stopAllBackgroundMusic();
  audio.muted = false;
  audio.currentTime = 0;
  audio.load();
  audio.play().catch((error) => {
    console.warn('⚠️ Erro ao tocar música:', error);
  });
}

// Play an overlay audio without stopping background music.
// Optionally 'duck' (lower) a target audio's volume while the overlay plays.
function playOverlayAudio(overlayAudio, duckTarget = null, duckLevel = 0.15) {
  if (!audioPermissionGranted || !overlayAudio) return;
  if (!overlayAudio.src) {
    console.warn('⚠️ playOverlayAudio abortado: overlayAudio não possui fonte definida');
    return;
  }

  stopOverlayAudioExcept(overlayAudio);

  try {
    let savedVolume = null;
    if (duckTarget && !duckTarget.paused) {
      // save and duck
      savedVolume = duckTarget.volume;
      try { duckTarget.volume = duckLevel; } catch (err) { console.warn('⚠️ Não foi possível reduzir volume do duckTarget', err); }
    }

    overlayAudio.pause();
    overlayAudio.currentTime = 0;
    overlayAudio.muted = false;
    overlayAudio.load();

    const restore = () => {
      try { if (savedVolume !== null && duckTarget) duckTarget.volume = savedVolume; } catch (err) { console.warn('⚠️ Erro ao restaurar volume:', err); }
      overlayAudio.onended = null;
    };

    overlayAudio.onended = restore;
    overlayAudio.play().catch((error) => {
      console.warn('⚠️ Erro ao tocar overlay audio:', error);
      // if failed to play, restore ducked volume
      if (savedVolume !== null && duckTarget) duckTarget.volume = savedVolume;
      overlayAudio.onended = null;
    });
  } catch (err) {
    console.warn('⚠️ playOverlayAudio erro:', err);
  }
}

function requestAudioPermission() {
  if (audioPermissionGranted) return;
  setupAllAudio();

  const audioItems = [lobbyMusic, nightMusic, roleMusic, dayMusic, votingMusic, assassinWakeupAudio, doctorWakeupAudio, detectiveWakeupAudio, traitorWakeupAudio, traitorWarningAudio, votingAudio, dayAudio, eliminationAudio, nightAudio, assassinWinMusic, cityWinMusic].filter(Boolean);
  if (audioItems.length === 0) return;

  audioItems.forEach((audio) => {
    audio.muted = false;
    audio.currentTime = 0;
  });

  const primeAudio = audioItems[0];
  let playAttempts = 0;
  const maxAttempts = 3;

  const attemptPlay = () => {
    playAttempts++;
    console.log(`[Audio] Attempting to play audio (attempt ${playAttempts}/${maxAttempts})`);
    
    primeAudio.play().then(() => {
      console.log('[Audio] Play succeeded - audio permission granted');
      audioPermissionGranted = true;
      markAudioGranted();
      primeAudio.pause();
      primeAudio.currentTime = 0;
    }).catch((error) => {
      console.warn(`[Audio] Play failed (attempt ${playAttempts}): ${error.name} - ${error.message}`);
      
      // On TV devices, autoplay may fail but audio context still works
      // Mark as granted anyway after max attempts to allow user interaction
      if (playAttempts >= maxAttempts) {
        console.log('[Audio] Max attempts reached - marking audio as granted anyway (may be TV device)');
        audioPermissionGranted = true;
        markAudioGranted();
      } else {
        // Retry after a short delay
        setTimeout(attemptPlay, 200);
      }
    });
  };

  const markAudioGranted = () => {
    try {
      if (audioPermissionButton) {
        audioPermissionButton.textContent = translateString('audioEnabled');
        audioPermissionButton.disabled = true;
        audioPermissionButton.classList.add('hidden');
      }
      if (lobbyAudioButton) {
        lobbyAudioButton.textContent = translateString('audioEnabled');
        lobbyAudioButton.disabled = true;
        lobbyAudioButton.classList.add('hidden');
      }
      if (discussionAudioButton) {
        discussionAudioButton.textContent = translateString('audioEnabled');
        discussionAudioButton.disabled = true;
        discussionAudioButton.classList.add('hidden');
      }
      if (statusText) {
        statusText.textContent = translateString('audioStatusOn');
      }
    } catch (e) {
      console.warn('[Audio] Error updating UI after permission:', e);
    }
  };

  attemptPlay();
}

function playNightMusic() {
  setupNightMusic();
  playMusic(nightMusic);
}

function playRoleMusic() {
  setupRoleMusic();
  playMusic(roleMusic);
}

function playDayMusic() {
  setupDayMusic();
  playMusic(dayMusic);
}

function playLobbyMusic() {
  setupLobbyMusic();
  playMusic(lobbyMusic);
}

function playVotingMusic() {
  setupVotingMusic();
  playMusic(votingMusic);
}

function playAssassinWinMusic() {
  setupAssassinWinMusic();
  playMusic(assassinWinMusic);
}

function playCityWinMusic() {
  setupCityWinMusic();
  playMusic(cityWinMusic);
}

function stopRoleMusic() {
  if (!roleMusic) return;
  roleMusic.pause();
  roleMusic.currentTime = 0;
}

function stopNightMusic() {
  if (!nightMusic) return;
  nightMusic.pause();
  nightMusic.currentTime = 0;
}

function updateGameStatus() {
  if (!gameStatus) return;
  
  const playerCount = currentRoomData ? Object.values(currentRoomData.players).length : 0;
  const readyCount = currentRoomData ? Object.values(currentRoomData.players || {}).filter(player => player.ready === true).length : 0;

  if (readyButton) {
    readyButton.textContent = translateString('readyCount', { count: readyCount, total: playerCount });
    readyButton.disabled = false;
  }

  const minPlayers = 4;
  const maxPlayers = 30;

  if (playerCount > maxPlayers) {
    gameStatus.innerHTML = `<p style="color: #ff6d6d;">${translateString('playerLimitExceeded', { maxPlayers })}</p>`;
    return;
  }

  if (playerCount >= minPlayers) {
    gameStatus.innerHTML = `<p style="color: #4CAF50;">${translateString('playerWaitingCount', { count: playerCount })}</p>`;
  } else {
    const remaining = minPlayers - playerCount;
    const plural = remaining !== 1 ? 'es' : '';
    gameStatus.innerHTML = `<p>${translateString('waitingPlayersCount', { remaining, plural })}</p>`;
  }
}

function renderPlayerHouses(roomData) {
  if (!cityBuildings || !roomData?.players) return;

  cityBuildings.innerHTML = '';

  if (playersCount) {
    playersCount.textContent = Object.keys(roomData.players).length;
  }

  updateGameStatus();
}

function showCityScreen(roomCode, roomData, playerId) {
  currentRoom = roomCode;
  currentRoomData = roomData;
  if (currentRoomCode) currentRoomCode.textContent = roomCode;

  // Definir ID do jogador atual com o playerId retornado pela sala
  currentPlayerId = playerId;
  currentPlayerName = roomData?.players?.[playerId]?.name || playerNameInput?.value.trim();

  // Esconder tela de login e mostrar tela da cidade
  loginScreen?.classList.add('hidden');
  cityScreen?.classList.remove('hidden');

  // Mostrar botão Modo TV apenas para o host da sala
  try {
    if (tvModeButton) {
      const isHost = currentPlayerId && currentRoomData && currentRoomData.host && currentPlayerId === currentRoomData.host;
      if (isHost) tvModeButton.classList.remove('hidden'); else tvModeButton.classList.add('hidden');
    }
  } catch (err) {
    console.warn('Erro ao verificar host para TV mode', err);
  }

  // Renderizar casas iniciais
  renderPlayerHouses(roomData);

  // Reproduzir música do lobby enquanto aguarda jogadores
  playLobbyMusic();

  // Inicializar sistemas de jogo ANTES de ouvir mudanças
  if (!gameInitialized) {
    initializeGameSystems().catch(err => console.error('Erro ao inicializar sistemas:', err));
  }

  // Ouvir mudanças na sala
  if (roomListener) roomListener();
  roomListener = listenRoom(roomCode, async (data) => {
    if (data) {
      currentRoomData = data;
      renderPlayerHouses(data);

      if (!gameInitialized && data.gameState && data.gameState.phase && data.gameState.phase !== PHASES.WAITING) {
        console.log('🛰️ Game already started remotely, joining game');
        await initializeGameSystems();
        initializeGame();
        showGameScreen();
      }

      if (data.gameState?.phase === PHASES.ROLE_REVEAL) {
        const allRoleReady = data.players && Object.values(data.players).length > 0 &&
          Object.values(data.players).every(player => player.roleReady === true);

        if (allRoleReady && gameTurns) {
          console.log('✅ Todos os jogadores prontos na revelação de roles, avançando para NIGHT');
          await gameTurns.setPhase(PHASES.NIGHT);
        }
      }
    }
  });
}

function hideCityScreen() {
  console.log('🔻 hideCityScreen invoked', { currentPlayerId, currentPlayerName, currentPlayerRole, currentRoom, phase: currentRoomData?.gameState?.phase });
  console.trace();
  cityScreen?.classList.add('hidden');
  heroScreen?.classList.remove('hidden');
  loginScreen?.classList.remove('hidden');

  // Parar de ouvir mudanças na sala
  if (roomListener) {
    roomListener();
    roomListener = null;
  }
  currentRoom = null;
  gameStarted = false;
  gameInitialized = false;
  playerReady = false;
  gameChat = null;
}

function showGameScreen() {
  if (!currentRoomData || !currentRoomData.players) return;

  // Esconder telas anteriores
  heroScreen?.classList.add('hidden');
  cityScreen?.classList.add('hidden');
  corruptionScreen?.classList.add('hidden');
  skyIntroScreen?.classList.add('hidden');

  // Mostrar tela do jogo
  gameScreen?.classList.remove('hidden');

  // Renderizar lista de jogadores
  if (playersList) {
    const players = Object.values(currentRoomData.players);
    playersList.innerHTML = `
      <h3>Jogadores</h3>
      <ul>
        ${players.map(p => `<li>${p.name}</li>`).join('')}
      </ul>
    `;
  }
}

// Mostra tela de revelação de role
function showRoleReveal() {
  // Esconder todas as telas anteriores
  hideAllScreens();

  // Mostrar tela de role
  roleRevealScreen?.classList.remove('hidden');

  // Obter role do jogador atual
  currentPlayerRole =
    gameRoles.getCurrentPlayerRole() ||
    currentRoomData?.roles?.[currentPlayerId]?.role ||
    null;
  const roleName = gameRoles.getRoleName(currentPlayerRole);
  const roleDesc = gameRoles.getRoleDescription(currentPlayerRole);

  // Atualizar elementos
  if (roleBadge) {
    roleBadge.textContent = roleName;
    roleBadge.className = `role-reveal-badge ${currentPlayerRole}`;
  }

  if (roleDescription) {
    roleDescription.textContent = roleDesc;
  }

  if (roleRevealBg) {
    if (currentPlayerRole === ROLES.ASSASSIN) {
      roleRevealBg.style.backgroundImage = "url('gameart/assassin.jpg')";
      roleRevealBg.style.opacity = '0.25';
    } else if (currentPlayerRole === ROLES.DETECTIVE) {
      roleRevealBg.style.backgroundImage = "url('gameart/detective.jpg')";
      roleRevealBg.style.opacity = '0.25';
    } else if (currentPlayerRole === ROLES.DOCTOR) {
      roleRevealBg.style.backgroundImage = "url('gameart/medico.jpg')";
      roleRevealBg.style.opacity = '0.25';
    } else {
      roleRevealBg.style.backgroundImage = '';
      roleRevealBg.style.opacity = '0';
    }
  }

  // keep individual role-bg elements in sync if present
  if (doctorBg) doctorBg.style.backgroundImage = "url('gameart/medico.jpg')";
  if (detectiveBg) detectiveBg.style.backgroundImage = "url('gameart/detective.jpg')";

  playRoleMusic();
}
function showNightScreen(message = translateString('nightMessage'), autoAdvance = false) {
  clearNightAnnouncementTimer();
  hideAllScreens();
  // Ensure hero/play screen stays hidden while in-game
  heroScreen?.classList.add('hidden');
  nightScreen?.classList.remove('hidden');
  playNightMusic();

  if (nightContinueButton) {
    nightContinueButton.classList.add('hidden');
  }

  if (autoAdvance) {
    if (nightMessage) {
      nightMessage.textContent = message;
    }

    nightAnnouncementTimer = setTimeout(() => {
      nightAnnouncementTimer = null;
      void gameTurns.nextPhase().catch(error => console.error('Erro ao avançar fase no timer de noite:', error));
    }, 3000);
    return;
  }

  if (nightMessage) {
    nightMessage.textContent = message;
  }
}

function clearNightAnnouncementTimer() {
  if (nightAnnouncementTimer) {
    clearTimeout(nightAnnouncementTimer);
    nightAnnouncementTimer = null;
  }
}

function hasAliveRole(role) {
  const roleEntries = currentRoomData?.roles ? Object.entries(currentRoomData.roles) :
    gameRoles?.roles ? Object.entries(gameRoles.roles) :
    gameState?.roles ? Object.entries(gameState.roles) : [];

  if (!roleEntries.length) return false;

  return roleEntries.some(([, roleData]) => roleData?.role === role && roleData?.alive !== false);
}

function showNightAnnouncement(message, callback) {
  console.log('🌙 Showing night announcement:', message, 'callback:', callback?.name || 'anonymous');
  clearNightAnnouncementTimer();
  hideAllScreens();
  heroScreen?.classList.add('hidden');
  nightScreen?.classList.remove('hidden');

  if (nightContinueButton) {
    nightContinueButton.classList.add('hidden');
  }

  if (nightMessage) {
    nightMessage.textContent = message;
  }

  setupTraitorWarningAudio();
  if (audioPermissionGranted && traitorWarningAudio && message && /traidor|traitor/i.test(message)) {
    playOverlayAudio(traitorWarningAudio, nightMusic, 0.15);
  }

  if (callback) {
    nightAnnouncementTimer = setTimeout(() => {
      console.log('🌙 Night announcement timeout, calling callback');
      nightAnnouncementTimer = null;
      callback();
    }, 3000);
  }
}

// Mostra tela do médico
function showDoctorScreen() {
  clearNightAnnouncementTimer();
  hideAllScreens();
  doctorScreen?.classList.remove('hidden');

  if (doctorBg) {
    doctorBg.style.backgroundImage = "url('gameart/medico.jpg')";
    doctorBg.style.opacity = '0.45';
  }

  selectedDoctorTarget = null;
  if (doctorConfirmButton) doctorConfirmButton.disabled = true;

  const subtitle = doctorScreen?.querySelector('.doctor-subtitle');
  if (subtitle) {
    subtitle.textContent = translateString('doctorWakeup');
  }

  renderPlayerButtons('doctor-players', (playerId) => {
    selectedDoctorTarget = playerId;
    doctorConfirmButton.disabled = false;
  });
}

// Mostra tela do detetive
function showDetectiveScreen() {
  clearNightAnnouncementTimer();
  hideAllScreens();
  detectiveScreen?.classList.remove('hidden');
  resetDetectiveSelection();

  if (detectiveBg) {
    detectiveBg.style.backgroundImage = "url('gameart/detective.jpg')";
    detectiveBg.style.opacity = '0.45';
  }

  if (detectiveInstruction) {
    detectiveInstruction.textContent = translateString('detectiveInstruction');
  }
}

function showAssassinScreen() {
  clearNightAnnouncementTimer();

  const effectiveRole = getEffectiveRole();
  if (effectiveRole && effectiveRole !== currentPlayerRole) {
    currentPlayerRole = effectiveRole;
  }

  if (effectiveRole !== ROLES.ASSASSIN || !isCurrentPlayerAlive()) {
    console.log('⚠️ showAssassinScreen called for invalid assassin state', {
      currentPlayerRole,
      effectiveRole,
      alive: isCurrentPlayerAlive()
    });
    showNightAnnouncement('O assassino acorda e age', false);
    return;
  }

  hideAllScreens();
  heroScreen?.classList.add('hidden');
  assassinScreen?.classList.remove('hidden');
  // nightMusic deve continuar tocando durante a ação noturna
  selectedAssassinTarget = null;
  if (assassinConfirmButton) assassinConfirmButton.disabled = true;
  renderPlayerButtons('assassin-players', (playerId) => {
    selectedAssassinTarget = playerId;
    if (assassinConfirmButton) assassinConfirmButton.disabled = false;
  });
  console.log('✅ Assassin screen displayed for player', currentPlayerId, 'role:', currentPlayerRole);
}

function showTraitorScreen() {
  clearNightAnnouncementTimer();
  hideAllScreens();
  heroScreen?.classList.add('hidden');
  traitorScreen?.classList.remove('hidden');
  selectedTraitorTarget = null;
  if (traitorConfirmButton) traitorConfirmButton.disabled = true;
  // nightMusic deve continuar tocando durante a ação do traidor
  renderPlayerButtons('traitor-players', (playerId) => {
    selectedTraitorTarget = playerId;
    if (traitorConfirmButton) traitorConfirmButton.disabled = false;
  });
}

function resetDetectiveSelection() {
  selectedDetectiveTest = null;
  selectedDetectivePercentageTarget = null;
  detectivePercentageSelectionLocked = false;
  if (detectiveWordTestButton) {
    detectiveWordTestButton.disabled = false;
    detectiveWordTestButton.classList.remove('selected');
  }
  if (detectivePercentageTestButton) {
    detectivePercentageTestButton.disabled = false;
    detectivePercentageTestButton.classList.remove('selected');
  }
  if (detectiveNotifyButton) {
    detectiveNotifyButton.disabled = false;
  }
}

function setDetectiveSelection(testType) {
  selectedDetectiveTest = testType;
  if (detectiveWordTestButton) {
    detectiveWordTestButton.disabled = true;
    detectiveWordTestButton.classList.toggle('selected', testType === 'word');
  }
  if (detectivePercentageTestButton) {
    detectivePercentageTestButton.disabled = true;
    detectivePercentageTestButton.classList.toggle('selected', testType === 'percentage');
  }
  if (detectiveNotifyButton) {
    detectiveNotifyButton.disabled = true;
  }
}

// Função para mostrar modal de seleção de jogador
function showPlayerSelectionDialog(title, players) {
  return new Promise((resolve) => {
    // Criar modal de seleção
    const modal = document.createElement('div');
    modal.className = 'player-selection-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-title">${title}</div>
        <div class="modal-players">
          ${players.map(([playerId, roleData]) => {
            const playerName = currentRoomData?.players?.[playerId]?.name || roleData?.name || `Jogador ${playerId.slice(-4)}`;
            return `<button class="modal-player-button" data-player-id="${playerId}">${playerName}</button>`;
          }).join('')}
        </div>
        <button class="modal-cancel-button">Cancelar</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal-cancel-button')) {
        modal.remove();
        resolve(null);
      } else if (e.target.classList.contains('modal-player-button')) {
        const playerId = e.target.dataset.playerId;
        modal.remove();
        resolve(playerId);
      }
    });
  });
}

function renderDetectivePercentageSelection(percentageTestResult) {
  if (!percentageList) return;

  const alivePlayers = Object.entries(gameRoles.roles || {}).filter(([playerId, roleData]) => playerId !== currentPlayerId && roleData.alive !== false);
  if (alivePlayers.length === 0) {
    percentageList.innerHTML = `<div class="percentage-item">${translateString('noPlayersForInvestigation')}</div>`;
    percentageResultDisplay?.classList.add('hidden');
    return;
  }

  const selectionLocked = !!selectedDetectivePercentageTarget;
  percentageList.innerHTML = `
    <div class="percentage-selection-instruction">
      ${selectionLocked ? translateString('selectionLocked') : translateString('choosePlayerPercentage')}
    </div>
    ${alivePlayers.map(([playerId]) => {
      const playerName = currentRoomData?.players?.[playerId]?.name || `Jogador ${playerId.slice(-4)}`;
      const buttonClass = selectedDetectivePercentageTarget === playerId ? 'percentage-player-button selected' : 'percentage-player-button';
      return `<button type="button" class="${buttonClass}" data-player-id="${playerId}" ${selectionLocked && selectedDetectivePercentageTarget !== playerId ? 'disabled' : ''}>${playerName}</button>`;
    }).join('')}
  `;

  percentageList.querySelectorAll('.percentage-player-button').forEach(button => {
    const playerId = button.dataset.playerId;
    if (selectionLocked && selectedDetectivePercentageTarget && playerId !== selectedDetectivePercentageTarget) {
      button.classList.add('locked');
      return;
    }

    button.addEventListener('click', () => {
      if (detectivePercentageSelectionLocked) {
        return;
      }
      selectedDetectivePercentageTarget = playerId;
      detectivePercentageSelectionLocked = true;
      showDetectivePercentageForPlayer(playerId, percentageTestResult);
      if (detectiveTestContinueButton) {
        detectiveTestContinueButton.classList.remove('hidden');
      }
      renderDetectivePercentageSelection(percentageTestResult);
    });
  });

  if (!selectedDetectivePercentageTarget) {
    percentageResultDisplay?.classList.add('hidden');
  }
}

function showDetectivePercentageForPlayer(playerId, percentageTestResult) {
  if (!percentageResultDisplay) return;
  const selectedValue = percentageTestResult.percentages?.[playerId];
  const playerName = currentRoomData?.players?.[playerId]?.name || `Jogador ${playerId.slice(-4)}`;
  const isAssassin = percentageTestResult.assassinId === playerId;
  const isMirror = percentageTestResult.mirrorPlayerId === playerId;

  let note = '';
  if (isAssassin && percentageTestResult.mirrorPlayerId) {
    note = translateString('percentageNoteAssassinMirror');
  } else if (isMirror) {
    note = translateString('percentageNoteMirror');
  }

  const displayValue = typeof selectedValue === 'number' ? `${selectedValue}%` : translateString('unavailable');

  percentageResultDisplay.innerHTML = `
    <div class="percentage-item">${playerName}: ${displayValue}</div>
    ${note ? `<div class="percentage-note">${note}</div>` : ''}
  `;
  percentageResultDisplay.style.display = 'block';
  percentageResultDisplay.classList.remove('hidden');
}

// Mostra tela de teste de palavra (compartilhada com todos)
function showWordTestScreen(wordTestResult) {
  hideAllScreens();
  wordTestScreen?.classList.remove('hidden');
  inWordTestPhase = true;

  if (wordDisplay) {
    wordDisplay.textContent = wordTestResult;
  }

  if (wordTestContinueButton) {
    wordTestContinueButton.disabled = false;
  }

  updateGroupContinueButtonCounts();
}

function updateGroupContinueButtonCounts() {
  if (!gameState || !gameVoting) {
    console.warn('⚠️ gameState or gameVoting not initialized');
    return;
  }

  const alivePlayers = gameState.getAlivePlayers() || [];
  const total = alivePlayers.length;
  const continueActionsData = gameVoting.continueActions || {};
  const currentCount = Object.keys(continueActionsData).length;

  console.log(`🔄 Updating continue counts: ${currentCount}/${total}, continueActions:`, continueActionsData);

  if (inWordTestPhase) {
    if (wordTestContinueButton) {
      wordTestContinueButton.textContent = translateString('goToDiscussionCount', { count: currentCount, total });
      console.log(`✏️ Updated word test button: ${currentCount}/${total}`);
    }
  } else {
    if (continueButton) {
      continueButton.textContent = translateString('continueCount', { count: currentCount, total });
      console.log(`✏️ Updated continue button: ${currentCount}/${total}`);
    }
  }
}

function updateVotingContinueButton() {
  if (!gameState || !gameVoting || !votingSkipButton) return;

  const alivePlayers = gameState.getAlivePlayers().map(([id]) => id);
  const total = alivePlayers.length;
  const currentCount = Object.keys(gameVoting.votingContinueActions || {}).length;
  const baseLabel = translateString('continueDiscussion');

  votingSkipButton.textContent = `${baseLabel} (${currentCount}/${total})`;
  votingSkipButton.disabled = gameVoting.votingContinueActions?.[currentPlayerId] === true || total === 0;
}

function updateVotingRequestButton() {
  if (!gameState || !gameVoting || !votingButton) {
    return;
  }

  const alivePlayers = gameState.getAlivePlayers() || [];
  const total = alivePlayers.length;
  const requestCount = gameVoting.getVotingRequestCount();
  const requestedByMe = gameVoting.votingRequests?.[currentPlayerId] === true;

  votingButton.textContent = translateString('goToVotingCount', { count: requestCount, total });
  votingButton.disabled = requestedByMe || total === 0;
  console.log(`✏️ Updated voting button: ${requestCount}/${total}, disabled=${requestedByMe || total === 0}`);
}


// Mostra tela de teste do detetive (porcentagem + notificações)
function showDetectiveTest() {
  if (detectiveTestScreen && !detectiveTestScreen.classList.contains('hidden')) return;
  hideAllScreens();
  detectiveTestScreen?.classList.remove('hidden');

  // Esconder todos os resultados primeiro
  percentageTestResults?.classList.add('hidden');
  detectiveNotifications?.classList.add('hidden');
  detectiveTestContinueButton?.classList.add('hidden');

  const roomGameState = currentRoomData?.gameState || {};
  const percentageTestResult = roomGameState.detectivePercentageTest || gameRoles.getPercentageTestResults();
  const notifications = roomGameState.detectiveNotifications?.[currentPlayerId] || gameRoles.getDetectiveNotifications();

  const hasPercentageTest = percentageTestResult && percentageTestResult.activated;
  const hasNotifications = !!notifications;
  const isDetective = currentPlayerRole === ROLES.DETECTIVE;

  if (hasPercentageTest && isDetective) {
    percentageTestResults?.classList.remove('hidden');
    renderDetectivePercentageSelection(percentageTestResult);
    if (selectedDetectivePercentageTarget) {
      showDetectivePercentageForPlayer(selectedDetectivePercentageTarget, percentageTestResult);
    }
  }

  if (hasNotifications) {
    detectiveNotifications?.classList.remove('hidden');
    if (notifications && detectiveNotifications) {
      const alertMessage = notifications.message || translateString('detectiveInvestigationAlert');
      detectiveNotifications.innerHTML = `<div class="notification-alert">${escapeHtml(alertMessage)}</div>`;
    }
  }

  if (detectiveTestContinueButton) {
    const canContinue = hasNotifications || !isDetective || selectedDetectivePercentageTarget;
    detectiveTestContinueButton.classList.toggle('hidden', !(hasPercentageTest || hasNotifications) || !canContinue);
  }
}


function showDetectiveNotification(message) {
  if (isShowingDetectiveNotification) return;
  hideChatScreen();
  hideAllScreens();
  if (detectiveNotificationScreen) {
    detectiveNotificationScreen.classList.remove('hidden');
    detectiveNotificationScreen.style.display = 'grid';
    detectiveNotificationScreen.style.zIndex = '2000';
  }
  if (detectiveNotificationMessage) {
    detectiveNotificationMessage.textContent = message || translateString('detectiveNotificationMessage');
  }
  isShowingDetectiveNotification = true;
}

async function clearDetectiveNotification() {
  if (!currentRoom || !currentPlayerId) return;
  try {
    await update(ref(getDatabase(), `rooms/${currentRoom}`), {
      [`gameState/detectiveNotifications/${currentPlayerId}`]: null
    });
  } catch (err) {
    console.warn('⚠️ Falha ao limpar notificação do detetive:', err);
  }
}

// Mostra tela de votação
function showVotingScreen() {
  clearNightAnnouncementTimer();
  hideAllScreens();
  votingScreen?.classList.remove('hidden');

  // Reproduzir música de votação
  setupVotingMusic();
  setupVotingAudio();
  playVotingMusic();
  try {
    if (audioPermissionGranted && votingAudio) {
      playOverlayAudio(votingAudio, votingMusic, 0.15);
    }
  } catch (err) {
    console.warn('Erro ao tocar Voting audio:', err);
  }

  // Limpar seleção anterior
  selectedVoteTarget = null;
  votingConfirmButton.disabled = true;

  renderPlayerButtons('voting-players', (playerId) => {
    selectedVoteTarget = playerId;
    votingConfirmButton.disabled = false;
  });

  // Exibir votos já contabilizados
  updateVoteDisplay();
  updateVotingContinueButton();
}

// Mostra tela de discussão do dia
function showDayDiscussion(deathAnnouncement = '') {
  clearNightAnnouncementTimer();
  inWordTestPhase = false;
  hideAllScreens();
  heroScreen?.classList.add('hidden');
  dayDiscussionScreen?.classList.remove('hidden');

  if (!skipNextDayMusic) {
    setupDayMusic();
    playDayMusic();
  } else {
    console.log('⏭️ Day music suppressed because this DAY follows a non-night phase');
  }
  skipNextDayMusic = false;
  if (continueButton) continueButton.disabled = false;

  let announcement = deathAnnouncement;
  if (!announcement && gameState?.gameState?.dayAnnouncement) {
    announcement = gameState.gameState.dayAnnouncement;
    gameState.updateGameState({ dayAnnouncement: null }).catch(error => {
      console.warn('⚠️ Não foi possível limpar a mensagem do dia:', error);
    });
  }

  renderAlivePlayersList(announcement);
  
  // Mostrar botão secreto apenas para Assassino/Traidor
  if (openSecretChatButton) {
    const isAssassinOrTraitor = currentPlayerRole === ROLES.ASSASSIN || currentPlayerRole === ROLES.TRAITOR;
    openSecretChatButton.classList.toggle('hidden', !isAssassinOrTraitor);
  }
  
  updateSecretChatVisibility();
  
  // Iniciar chat com novo sistema
  startChatListeners();
  updatePrivateChatRecipients();
  showChatScreen();

  updateGroupContinueButtonCounts();
  updateVotingRequestButton();
}

// Mostra sequência de morte com mensagens
function showDeathSequence(deadPlayer, role, deadPlayerId, callback) {
  hideAllScreens();
  nightScreen?.classList.remove('hidden');

  // Primeira mensagem
  nightMessage.textContent = 'Ouve uma votação esta noite...';
  console.log('📢 Death sequence: Message 1 - Voting night');

  // Após 2.5 segundos, mostrar segunda mensagem
  const timeout1 = setTimeout(() => {
    nightMessage.textContent = `O cidadão ${deadPlayer.name} foi expulso da cidade!`;
    console.log(`📢 Death sequence: Message 2 - ${deadPlayer.name} expelled`);

    // Após mais 2.5 segundos, chamar o callback
    const timeout2 = setTimeout(() => {
      console.log('📢 Death sequence: Transitioning to death notification');
      if (callback) {
        callback();
      }
    }, 2500);
    
    deathNotificationTimeouts.push(timeout2);
  }, 2500);
  
  deathNotificationTimeouts.push(timeout1);
}

// Mostra tela de notificação de morte
function showDeathNotification(deadPlayer, role, options = {}) {
  const skipEliminationAudio = options.skipEliminationAudio === true;
  hideAllScreens();
  deathNotificationScreen?.classList.remove('hidden');

  clearDeathNotificationTimeouts();

  // Mostrar nome do jogador
  if (deathPlayerName) deathPlayerName.textContent = deadPlayer.name;
  
  // Começar com role escondido
  if (deathPlayerRole) {
    deathPlayerRole.textContent = '';
    deathPlayerRole.className = `death-player-role ${role}`;
  }
  
  if (deathNotificationExtra) {
    deathNotificationExtra.textContent = '';
  }

  const currentRoleName = gameRoles.getRoleName(role);

  // Passo 1: Mostrar "era..." sem revelar o role (após 1 segundo)
  const timeout1 = setTimeout(() => {
    console.log(`👤 Death notification: Showing "era..." for ${deadPlayer.name}`);
    if (deathPlayerRole) {
      deathPlayerRole.textContent = 'era...';
    }
  }, 1000);
  deathNotificationTimeouts.push(timeout1);

  // Passo 2: Esperar 4 segundos e depois revelar o role completo
  const timeout2 = setTimeout(() => {
    console.log(`🎭 Death notification: Revealing role ${currentRoleName} for ${deadPlayer.name}`);
    if (deathPlayerRole) {
      deathPlayerRole.textContent = currentRoleName;
    }
  }, 5000); // 1s (intro) + 4s (wait) = 5s total
  deathNotificationTimeouts.push(timeout2);

  // Passo 3: Mostrar mensagem extra (traidor vivo) se necessário
  const traitorAlive = Object.entries(gameRoles.roles || {}).some(([, roleData]) => roleData.role === ROLES.TRAITOR && roleData.alive !== false);
  const assassinEliminated = role === ROLES.ASSASSIN;
  
  if (assassinEliminated && traitorAlive) {
    const timeout3 = setTimeout(() => {
      console.log('⚠️ Death notification: Showing traitor alive warning');
      if (deathNotificationExtra) {
        deathNotificationExtra.innerHTML = `<div class="death-notification-line death-notification-warning">${translateString('deathTraitorAliveWarning')}</div>`;
      }
    }, 7000); // Após revelação do role (5s) + 2s de pausa
    deathNotificationTimeouts.push(timeout3);
  }

    // Play elimination audio after day audio finishes
  try {
    setupDayAudio();
    setupEliminationAudio();
    if (skipEliminationAudio) {
      console.log('⏭️ Skipping elimination audio for this death notification');
      return;
    }
    if (!audioPermissionGranted) {
      console.warn('Som não ativado: não será possível tocar Elimination. Peça ao usuário para ativar som.');
      if (statusText) statusText.textContent = 'Permita o som para ouvir efeitos de eliminação.';
    } else if (eliminationAudio) {
      const playElimination = () => {
        try {
          if (eliminationAudio) {
            try {
              playOverlayAudio(eliminationAudio, dayMusic, 0.15);
            } catch (e) {
              console.warn('Falha ao usar playOverlayAudio para Elimination:', e);
            }
            eliminationAudio.pause();
            eliminationAudio.currentTime = 0;
            eliminationAudio.muted = false;
            eliminationAudio.play?.().catch((e) => {
              console.warn('Falha ao tocar eliminationAudio diretamente:', e);
            });
          }
        } catch (e) {
          console.warn('Erro durante playElimination:', e);
        }
      };

      if (dayAudio && !dayAudio.paused) {
        dayAudio.addEventListener('ended', playElimination, { once: true });
      } else {
        playElimination();
      }
    }
  } catch (err) {
    console.warn('Erro ao tocar Elimination:', err);
  }
}

// Mostra tela de vitória
function showVictoryScreen(winner, players) {
  hideAllScreens();
  if (!victoryScreen) return;

  const playerEntries = Array.isArray(players) ? players : Object.entries(players || {});
  const aliveEntries = playerEntries.filter(([, player]) => player?.alive !== false);
  const hasAssassinAlive = aliveEntries.some(([, player]) => player?.role === ROLES.ASSASSIN);
  const hasTraitorAlive = aliveEntries.some(([, player]) => player?.role === ROLES.TRAITOR);
  const victoryRole = winner === 'assassin'
    ? (hasAssassinAlive ? ROLES.ASSASSIN : hasTraitorAlive ? ROLES.TRAITOR : ROLES.ASSASSIN)
    : null;

  victoryScreen.classList.remove('hidden', 'city-win', 'assassin-win', 'traitor-win');
  if (winner === 'assassin') {
    victoryScreen.classList.add(victoryRole === ROLES.TRAITOR ? 'traitor-win' : 'assassin-win');
  } else {
    victoryScreen.classList.add('city-win');
  }

  if (victoryTitle) {
    victoryTitle.textContent = winner === 'assassin'
      ? (victoryRole === ROLES.TRAITOR ? translateString('traitorVictory') : translateString('assassinVictory'))
      : translateString('cityVictory');
  }

  if (winner === 'assassin') {
    playAssassinWinMusic();
  } else {
    playCityWinMusic();
  }

  if (victoryPlayersList) {
    const displayPlayers = winner === 'assassin'
      ? aliveEntries.filter(([, player]) => player?.role === victoryRole)
      : aliveEntries;

    victoryPlayersList.innerHTML = displayPlayers.map(([id, player]) => {
      const playerName = player?.name || currentRoomData?.players?.[id]?.name || gameRoles?.getRoleName(player?.role) || translateString('unknown');
      return `<div class="victory-player">${playerName}</div>`;
    }).join('');
  }
}

// Esconde todas as telas
function hideAllScreens() {
  console.log('🔻 hideAllScreens invoked', { currentPlayerId, currentPlayerName, currentPlayerRole, currentRoom, phase: currentRoomData?.gameState?.phase });
  console.trace();
  const screens = [
    loginScreen, cityScreen, gameScreen, corruptionScreen, skyIntroScreen,
    roleRevealScreen, nightScreen, assassinScreen, traitorScreen, doctorScreen,
    detectiveScreen, detectiveTestScreen, wordTestScreen, votingScreen,
    deathNotificationScreen, dayDiscussionScreen, victoryScreen, detectiveNotificationScreen,
    chatScreen
  ];

  screens.forEach(screen => screen?.classList.add('hidden'));
}

// Renderiza botões de jogadores para seleção
function renderPlayerButtons(containerId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container || (!gameState && !gameRoles)) return;

  let alivePlayers = [];
  if (gameRoles && gameRoles.roles && Object.keys(gameRoles.roles).length) {
    alivePlayers = Object.entries(gameRoles.roles).filter(([, roleData]) => roleData.alive !== false);
  } else if (gameState) {
    alivePlayers = gameState.getAlivePlayers();
  }

  console.log(`📋 Rendering buttons for ${containerId}:`, alivePlayers.length, 'alive players');
  
  container.innerHTML = '';

  alivePlayers.forEach(([playerId, player]) => {
    if (String(playerId) === String(currentPlayerId)) return; // Não pode selecionar a si mesmo

    const playerName = currentRoomData?.players?.[playerId]?.name || player?.name || 'Jogador';
    const button = document.createElement('button');
    button.className = 'player-button';
    button.textContent = playerName;
    button.onclick = () => {
      // Remover seleção anterior
      container.querySelectorAll('.player-button').forEach(btn =>
        btn.classList.remove('selected')
      );
      button.classList.add('selected');
      onSelect(playerId);
    };

    container.appendChild(button);
  });
}

// Renderiza lista de jogadores vivos
function renderAlivePlayersList(deathAnnouncement = '') {
  const container = document.getElementById('players-list-discussion');
  if (!container || !gameState) return;

  const alivePlayers = gameState.getAlivePlayers();
  console.log('👥 Rendering alive players list:', alivePlayers.length, 'players');
  console.log('Players:', alivePlayers.map(([id, p]) => p.name).join(', '));
  
  container.innerHTML = `
    ${deathAnnouncement ? `<div class="day-death-announcement">${deathAnnouncement}</div>` : ''}
    <h3>Jogadores Vivos</h3>
    <ul>
      ${alivePlayers.map(([id, player]) => {
        const playerName = currentRoomData?.players?.[id]?.name || player?.name || 'Jogador';
        return `<li>${playerName}</li>`;
      }).join('')}
    </ul>
  `;
}

function getEffectiveRole() {
  return gameRoles?.getCurrentPlayerRole() ||
    currentPlayerRole ||
    currentRoomData?.roles?.[currentPlayerId]?.role ||
    gameRoles?.roles?.[currentPlayerId]?.role ||
    null;
}

function isCurrentPlayerAlive() {
  const roleFromState = gameState?.roles?.[currentPlayerId];
  const roleFromRoles = gameRoles?.roles?.[currentPlayerId];
  const roleFromRoomData = currentRoomData?.roles?.[currentPlayerId];
  const aliveFromState = roleFromState?.alive !== false;
  const aliveFromRoles = roleFromRoles?.alive !== false;
  const aliveFromRoomData = roleFromRoomData?.alive !== false;

  const result = aliveFromState || aliveFromRoles || aliveFromRoomData;

  console.log('🔍 isCurrentPlayerAlive check:', {
    currentPlayerId,
    roleFromState,
    roleFromRoles,
    roleFromRoomData,
    aliveFromState,
    aliveFromRoles,
    aliveFromRoomData,
    result,
    eliminatedPlayers: gameState?.eliminatedPlayers || []
  });

  return result;
}

// Variáveis para seleções
let selectedAssassinTarget = null;
let selectedTraitorTarget = null;
let selectedDoctorTarget = null;
let selectedVoteTarget = null;

async function initializeGameSystems() {
  if (gameInitialized) return;
  if (gameInitializingPromise) return gameInitializingPromise;

  gameInitializingPromise = (async () => {
    try {
      gameState = new GameState(currentRoom);
      await gameState.initialize();

      // Escutar mudanças de estado em tempo real IMEDIATAMENTE
      gameState.listenStateChanges((state) => {
      console.log('🔄 Game state updated:', state);
      
      // Detectar mudanças na lista de jogadores vivos
    const currentAlivePlayers = gameState.getAlivePlayers().map(([id]) => id).sort().join(',');
    const lastAlivePlayersStr = lastAlivePlayers.sort().join(',');
    
    if (currentAlivePlayers !== lastAlivePlayersStr) {
      console.log('📊 Alive players changed:', gameState.getAlivePlayers().length);
      lastAlivePlayers = gameState.getAlivePlayers().map(([id]) => id);
      
      // Atualizar lista de jogadores vivos na tela
      renderAlivePlayersList();
    }

    const myRole = gameRoles?.roles?.[currentPlayerId] || state.roles?.[currentPlayerId] || currentRoomData?.roles?.[currentPlayerId];
    const eliminatedPlayers = state.eliminatedPlayers || [];
    const roleDead = myRole?.alive === false;
    const inElimList = Array.isArray(eliminatedPlayers) && eliminatedPlayers.includes(currentPlayerId);
    const isActuallyEliminated = roleDead || inElimList;
    const currentPhase = state.gameState?.phase;
    const canKickOutPhase = [PHASES.DAY, PHASES.VOTING, PHASES.GAME_OVER].includes(currentPhase);
    const isNightPhase = [PHASES.ROLE_REVEAL, PHASES.NIGHT, PHASES.DOCTOR_TURN, PHASES.DETECTIVE_TURN].includes(currentPhase);

    console.log('🔄 Game state elimination check:', {
      currentPlayerId,
      currentPlayerName,
      myRole,
      eliminatedPlayers,
      isActuallyEliminated,
      currentPhase,
      canKickOutPhase,
      isNightPhase
    });

    if (isActuallyEliminated && canKickOutPhase) {
      const playerName = state.players?.[currentPlayerId]?.name || currentRoomData?.players?.[currentPlayerId]?.name;
      if (playerName === currentPlayerName) {
        console.log('💀 Você foi eliminado, retornando ao lobby', {
          currentPlayerId,
          currentPlayerName,
          currentPhase,
          myRole,
          eliminatedPlayers
        });
        returnToStartScreen();
        return;
      } else {
        console.log('Player ID mismatch, not kicking out', { currentPlayerId, currentPlayerName, playerName });
      }
    } else if (isActuallyEliminated && isNightPhase) {
      console.log('⏳ Eliminado mas em fase de noite/ação, aguardando resolução', { currentPlayerId, currentPhase, myRole, eliminatedPlayers });
    }
    
    const newNotification = state.gameState?.detectiveNotifications?.[currentPlayerId];
    const newNotificationTimestamp = newNotification?.timestamp || null;
    if (newNotificationTimestamp && newNotificationTimestamp !== lastDetectiveNotificationTimestamp) {
      lastDetectiveNotificationTimestamp = newNotificationTimestamp;
      console.log('🔔 Novo aviso de investigação recebido para mim:', newNotification);

      if (currentPlayerRole === ROLES.DETECTIVE) {
        if (dayDiscussionScreen?.classList.contains('hidden') === false || window.lastProcessedPhase === PHASES.DAY) {
          showDetectiveTest();
        }
      } else {
        showDetectiveNotification(newNotification?.message || translateString('detectiveInvestigationAlert'));
      }
    }
  });

  gameRoles = new GameRoles(currentRoom, currentPlayerId, currentLanguage);
  gameRoles.listenGameState((data) => {
    const previousRole = currentPlayerRole;
    const currentRoleFromDb = data.roles?.[currentPlayerId]?.role || null;
    if (currentPlayerRole !== currentRoleFromDb) {
      console.log('🔄 Role updated:', currentRoleFromDb);
      currentPlayerRole = currentRoleFromDb;
      // Update UI if on day discussion screen
      if (!dayDiscussionScreen?.classList.contains('hidden')) {
        const isAssassinOrTraitor = currentPlayerRole === ROLES.ASSASSIN || currentPlayerRole === ROLES.TRAITOR;
        openSecretChatButton?.classList.toggle('hidden', !isAssassinOrTraitor);
        updateSecretChatVisibility();
      }
    }

    if (currentPlayerRole === ROLES.TRAITOR) {
      // Não verificar promoção durante votação ou resolução de votação
      const currentPhase = currentRoomData?.gameState?.phase || data.gameState?.phase;
      if (currentPhase !== PHASES.VOTING && !isResolvingVoting) {
        checkAssassinDeath().catch(err => console.warn('⚠️ Falha ao verificar promoção do Traidor:', err));
      }
    }

    const currentPhase = currentRoomData?.gameState?.phase || data.gameState?.phase;
    if (previousRole !== currentPlayerRole && currentPhase) {
      console.log('🔁 Re-evaluating current phase after role sync:', currentPhase, 'role:', currentPlayerRole);
      void handlePhaseUpdate(currentPhase, currentRoomData?.gameState || data.gameState);
    }
  });

  if (gameRoles.listenDetectiveNotifications) {
    if (detectiveNotificationUnsubscribe) {
      detectiveNotificationUnsubscribe();
      detectiveNotificationUnsubscribe = null;
    }
    detectiveNotificationUnsubscribe = gameRoles.listenDetectiveNotifications((notification) => {
      if (!notification) return;
      const newNotificationTimestamp = notification.timestamp || null;
      if (!newNotificationTimestamp || newNotificationTimestamp === lastDetectiveNotificationTimestamp) return;

      lastDetectiveNotificationTimestamp = newNotificationTimestamp;
      console.log('🔔 Detective notification received for me:', notification);

      if (currentPlayerRole === ROLES.DETECTIVE) {
        if (dayDiscussionScreen?.classList.contains('hidden') === false || window.lastProcessedPhase === PHASES.DAY) {
          showDetectiveTest();
        }
      } else {
        showDetectiveNotification(notification.message || '⚠️ Você está sendo investigado pelo Detetive.');
      }
    });
  }

  // Redundant notification watcher in case the real-time notification path is missed
  const detectiveNotificationRef = ref(getDatabase(), `rooms/${currentRoom}/gameState/detectiveNotifications/${currentPlayerId}`);
  if (detectiveNotificationPathUnsubscribe) {
    detectiveNotificationPathUnsubscribe();
    detectiveNotificationPathUnsubscribe = null;
  }
  detectiveNotificationPathUnsubscribe = onValue(detectiveNotificationRef, (snapshot) => {
    const notification = snapshot.val();
    if (!notification) return;
    const newNotificationTimestamp = notification.timestamp || null;
    if (!newNotificationTimestamp || newNotificationTimestamp === lastDetectiveNotificationTimestamp) return;

    lastDetectiveNotificationTimestamp = newNotificationTimestamp;
    console.log('🔔 Detective notification received from direct path watcher:', notification);

    if (currentPlayerRole === ROLES.DETECTIVE) {
      if (dayDiscussionScreen?.classList.contains('hidden') === false || window.lastProcessedPhase === PHASES.DAY) {
        showDetectiveTest();
      }
    } else {
      showDetectiveNotification(notification.message || '⚠️ Você está sendo investigado pelo Detetive.');
    }
  });

  // Setup recruitment listeners for all players
  setupRecruitmentListeners();

  gameVoting = new GameVoting(currentRoom);
  
  // Escutar mudanças no status "pronto" dos jogadores
  if (readyStatusUnsubscribe) {
    readyStatusUnsubscribe();
    readyStatusUnsubscribe = null;
  }
  readyStatusUnsubscribe = gameVoting.listenReady((players) => {
    if (gameStarted || !currentRoomData) return;
    
    console.log('🔄 Ready status updated:', players);
    const playerCount = Object.keys(currentRoomData.players || {}).length;
    const readyCount = Object.values(players || {}).filter(p => p.ready === true).length;
    console.log(`👥 Players: ${playerCount}, Ready: ${readyCount}`);
    
    // Atualizar botão com contagem
    if (readyButton) {
      const isMyReady = players?.[currentPlayerId]?.ready === true;
      readyButton.textContent = translateString('readyCount', { count: readyCount, total: playerCount });
      readyButton.disabled = isMyReady;
      console.log(`✏️ Updated ready button: ${readyButton.textContent}, disabled=${isMyReady}`);
    }
    
    // Se todos os jogadores estão prontos, iniciar o jogo
    if (gameVoting.areAllPlayersReady(players) && playerCount >= 4) {
      console.log('✅ Todos os jogadores prontos! Iniciando jogo...');
      gameStarted = true;
      startGameSequence();
    }
  });
  
  gameChat = new GameChat(currentRoom);
  gameTurns = new GameTurns(currentRoom, gameState);
  gameInitialized = true;
  gameInitializingPromise = null;
    } catch (error) {
      gameInitializingPromise = null;
      throw error;
    }
  })();

  return gameInitializingPromise;
}

async function startGameSequence() {
  try {
    await initializeGameSystems();

    // Distribuir roles apenas se ainda não houver roles gravados
    // Resetar artefatos de jogos anteriores antes de iniciar uma nova partida
    const roomRef = ref(getDatabase(), `rooms/${currentRoom}`);
    const roleReadyUpdates = {};
    Object.keys(currentRoomData.players || {}).forEach(playerId => {
      roleReadyUpdates[`players/${playerId}/roleReady`] = false;
    });

    await update(roomRef, {
      eliminatedPlayers: [],
      votes: null,
      continueActions: null,
      votingRequests: null,
      ...roleReadyUpdates,
      'gameState/assassinAction': null,
      'gameState/traitorAction': null,
      'gameState/doctorAction': null,
      'gameState/doctorSave': null,
      'gameState/detectiveTest': null,
      'gameState/detectiveWordTest': null,
      'gameState/detectivePercentageTest': null,
      'gameState/detectiveNotifications': null,
      'gameState/votingRequests': null,
      'gameState/lastAction': null
    });

    if (!currentRoomData.roles || Object.keys(currentRoomData.roles).length === 0) {
      const assignedRoles = await gameRoles.assignRoles(currentRoomData.players);
      currentRoomData = { ...currentRoomData, roles: assignedRoles, eliminatedPlayers: [] };
    } else {
      gameRoles.roles = currentRoomData.roles;
      currentRoomData.eliminatedPlayers = [];
    }

    // Iniciar turnos
    await gameTurns.startGame();

    // Mostrar tela de corrupção
    cityScreen?.classList.add('hidden');
    corruptionScreen?.classList.remove('hidden');

    // Aguardar animação de corrupção e seguir direto para a revelação de roles
    setTimeout(() => {
      corruptionScreen?.classList.add('hidden');
      // skip the sky intro screen and go directly to role reveal
      setupGameListeners();
      showRoleReveal();
    }, 500);

  } catch (error) {
    console.error('Erro ao iniciar jogo:', error);
    alert('Erro ao iniciar o jogo. Tente novamente.');
  }
}

// ============= FUNÇÕES DE CHAT =============

// Envia mensagem pública
async function sendPublicMessage(message, isAssassinProfile = false, isTraitorProfile = false, isDoctorProfile = false, isDetectiveProfile = false) {
  if (!gameChat || !currentPlayerId || !currentPlayerName || !message.trim()) return;
  
  try {
    const displayNameOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskName) ? currentMaskName : null;
    const displayColorOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskColor) ? currentMaskColor : null;
    const isTraitorMask = maskEnabled && currentPlayerRole === ROLES.TRAITOR && !isAssassinProfile && !isTraitorProfile && !isDoctorProfile && !isDetectiveProfile && !!displayNameOverride;
    await gameChat.sendPublicMessage(currentPlayerId, currentPlayerName, message, isAssassinProfile, isTraitorProfile, isDoctorProfile, isDetectiveProfile, displayNameOverride, displayColorOverride, isTraitorMask);
    console.log('💬 Public message sent:', message, 'assassinProfile:', isAssassinProfile, 'traitorProfile:', isTraitorProfile, 'doctorProfile:', isDoctorProfile, 'detectiveProfile:', isDetectiveProfile, 'traidorMask:', isTraitorMask);
  } catch (error) {
    console.error('❌ Error sending public message:', error);
  }
}

// Envia mensagem privada para um destinatário específico
async function sendPrivateMessage(message, toPlayerId, isAssassinProfile = false, isTraitorProfile = false, isDoctorProfile = false, isDetectiveProfile = false, displayNameOverride = null, displayColorOverride = null, isTraitorMask = false) {
  if (!gameChat || !currentPlayerId || !currentPlayerName || !message.trim() || !toPlayerId) return;
  
  try {
    const finalTraitorMask = isTraitorMask || (maskEnabled && currentPlayerRole === ROLES.TRAITOR && !isAssassinProfile && !isTraitorProfile && !isDoctorProfile && !isDetectiveProfile && !!displayNameOverride);
    await gameChat.sendPrivateMessage(currentPlayerId, currentPlayerName, toPlayerId, message, isAssassinProfile, isTraitorProfile, isDoctorProfile, isDetectiveProfile, displayNameOverride, displayColorOverride, finalTraitorMask);
    console.log('🔐 Private message sent to:', toPlayerId, 'assassin:', isAssassinProfile, 'traitor:', isTraitorProfile, 'doctor:', isDoctorProfile, 'detective:', isDetectiveProfile, 'displayNameOverride:', displayNameOverride, 'displayColorOverride:', displayColorOverride, 'traidorMask:', finalTraitorMask);
  } catch (error) {
    console.error('❌ Error sending private message:', error);
  }
}


// Recrutar um jogador como traidor

if (title) {
  title.dataset.text = title.dataset.text || title.textContent;
  title.addEventListener('click', () => {
    body.classList.toggle('night-mode');
    title.classList.add('glitch');
    setTimeout(() => title.classList.remove('glitch'), 700);
  });
}

if (playButton && loginScreen) {
  playButton.addEventListener('click', () => {
    loginScreen.classList.remove('hidden');
    body.classList.add('in-universe');
  });
}

if (backButton && loginScreen) {
  backButton.addEventListener('click', () => {
    loginScreen.classList.add('hidden');
    body.classList.remove('in-universe');
  });
}

if (audioPermissionButton) {
  audioPermissionButton.addEventListener('click', requestAudioPermission);
}

if (lobbyAudioButton) {
  lobbyAudioButton.addEventListener('click', requestAudioPermission);
}

if (discussionAudioButton) {
  discussionAudioButton.addEventListener('click', requestAudioPermission);
}

initializeLanguageSwitcher();
translatePage(currentLanguage);

// 🌐 Exportar funções e variáveis para o escopo global (para módulos ES6)
window.currentLanguage = currentLanguage;
window.reloadNarratorAudio = reloadNarratorAudio;
window.getAudioPath = getAudioPath;
window.translatePage = translatePage;
window.AUDIO_PATHS = AUDIO_PATHS;
window.createAudio = createAudio;
window.setupAssassinWakeupAudio = setupAssassinWakeupAudio;
window.setupDoctorWakeupAudio = setupDoctorWakeupAudio;
window.setupDetectiveWakeupAudio = setupDetectiveWakeupAudio;
window.setupTraitorWakeupAudio = setupTraitorWakeupAudio;
window.setupTraitorWarningAudio = setupTraitorWarningAudio;
window.setupVotingAudio = setupVotingAudio;
window.setupDayAudio = setupDayAudio;
window.setupEliminationAudio = setupEliminationAudio;
window.setupNightAudio = setupNightAudio;

// Variáveis de áudio
Object.defineProperty(window, 'assassinWakeupAudio', {
  get: () => assassinWakeupAudio,
  set: (value) => { assassinWakeupAudio = value; }
});
Object.defineProperty(window, 'doctorWakeupAudio', {
  get: () => doctorWakeupAudio,
  set: (value) => { doctorWakeupAudio = value; }
});
Object.defineProperty(window, 'detectiveWakeupAudio', {
  get: () => detectiveWakeupAudio,
  set: (value) => { detectiveWakeupAudio = value; }
});
Object.defineProperty(window, 'traitorWakeupAudio', {
  get: () => traitorWakeupAudio,
  set: (value) => { traitorWakeupAudio = value; }
});
Object.defineProperty(window, 'traitorWarningAudio', {
  get: () => traitorWarningAudio,
  set: (value) => { traitorWarningAudio = value; }
});
Object.defineProperty(window, 'votingAudio', {
  get: () => votingAudio,
  set: (value) => { votingAudio = value; }
});
Object.defineProperty(window, 'dayAudio', {
  get: () => dayAudio,
  set: (value) => { dayAudio = value; }
});
Object.defineProperty(window, 'eliminationAudio', {
  get: () => eliminationAudio,
  set: (value) => { eliminationAudio = value; }
});
Object.defineProperty(window, 'nightAudio', {
  get: () => nightAudio,
  set: (value) => { nightAudio = value; }
});

if (leaveCityButton) {
  leaveCityButton.addEventListener('click', async () => {
    if (currentPlayerId && currentRoom && gameState) {
      try {
        await gameState.removePlayer(currentPlayerId);
        console.log('🚪 Jogador saiu da sala:', currentPlayerId);
      } catch (error) {
        console.error('❌ Erro ao remover jogador da sala:', error);
      }
    }
    hideCityScreen();
  });
}

if (readyButton) {
  readyButton.addEventListener('click', async () => {
    if (!gameVoting) {
      console.log('⏳ Ready clicked before gameVoting exists; initializing game systems now');
      try {
        await initializeGameSystems();
      } catch (error) {
        console.error('❌ Error initializing game systems before marking ready:', error);
      }
    }

    if (currentPlayerId && gameVoting) {
      const alreadyReady = currentRoomData?.players?.[currentPlayerId]?.ready === true;
      if (alreadyReady) {
        console.log('⚠️ Player is already ready:', currentPlayerId);
        return;
      }

      readyButton.disabled = true;
      console.log('✓ Marking player as ready:', currentPlayerId);
      
      // Calcular contagem atual antes do update
      const playerCount = Object.keys(currentRoomData.players || {}).length;
      const currentReadyCount = Object.values(currentRoomData.players || {}).filter(p => p.ready === true).length;
      
      try {
        await gameVoting.markReady(currentPlayerId);
        console.log('✓ Player marked as ready in Firebase');
        
        // Atualizar botão localmente para feedback imediato
        readyButton.textContent = translateString('readyCount', { count: currentReadyCount + 1, total: playerCount });
        console.log(`🔧 Locally updated ready button: ${readyButton.textContent}`);
      } catch (error) {
        console.error('❌ Error marking player as ready:', error);
        readyButton.disabled = false;
      }
    } else {
      console.log('⚠️ Cannot mark ready - currentPlayerId:', currentPlayerId, 'gameVoting:', gameVoting);
    }
  });
}

if (enterCityButton && playerNameInput && roomCodeInput && roomCodeOutput && statusText) {
  enterCityButton.addEventListener('click', async () => {
    const playerName = playerNameInput?.value.trim();
    const roomCode = roomCodeInput?.value.trim().toUpperCase();

    if (!playerName) {
      statusText.textContent = 'Digite seu nome para entrar na cidade.';
      playerNameInput?.focus();
      return;
    }

    enterCityButton.disabled = true;
statusText.textContent = roomCode ? translateString('enteringRoom') : translateString('openingPortal');

    try {
      let result;
      if (roomCode) {
        // Tentar entrar em sala existente
        result = await joinRoom(roomCode, playerName);
        statusText.textContent = translateString('welcomeRoom', { playerName, roomCode });
      } else {
        // Criar nova sala
        result = await createRoom(playerName, currentLanguage);
        statusText.textContent = `Bem-vindo, ${playerName}. Seu portal está aberto.`;
      }

      roomCodeOutput.textContent = result.roomCode;
      roomInfoBlock?.classList.remove('hidden');

      // Mostrar tela da cidade
      showCityScreen(result.roomCode, result.roomData, result.playerId);
    } catch (error) {
      console.error(error);
      if (error.message === 'Sala não encontrada') {
        statusText.textContent = translateString('roomNotFound');
      } else {
        statusText.textContent = translateString('enterCityError');
      }
    } finally {
      enterCityButton.disabled = false;
    }
  });
}

// ===== NOVOS EVENT LISTENERS PARA O SISTEMA DE JOGO =====

// Role reveal
if (roleReadyButton) {
  roleReadyButton.addEventListener('click', async () => {
    try {
      await markRoleRevealReady();
      roleRevealScreen?.classList.add('hidden');
      stopRoleMusic();
      showNightScreen(translateString('waitingForPlayers'), false);
    } catch (error) {
      console.error('❌ Erro ao marcar como pronto na revelação de roles:', error);
      alert(translateString('readyConfirmError'));
    }
  });
}

// TV Mode: Conectar à TV via código da sala
if (tvModeButton) {
  tvModeButton.addEventListener('click', async () => {
    try {
      // Mostrar modal com código da sala (modo mais simples)
      if (!currentRoom) {
        alert('Crie ou entre numa sala para conectar a TV.');
        return;
      }

      if (tvModal) tvModal.classList.remove('hidden');
      // Exibir código da sala e instruções
      if (tvCodeDisplay) tvCodeDisplay.textContent = currentRoom;
      setTVScannerStatus('Código gerado. No site da TV, cole este código e clique em conectar.', 'success');
    } catch (err) {
      console.error('Erro ao abrir scanner:', err);
    }
  });
}

if (tvCloseBtn) {
  tvCloseBtn.addEventListener('click', () => {
    if (tvModal) tvModal.classList.add('hidden');
  });
}

function setTVScannerStatus(message, type = 'info') {
  if (!tvScannerStatus) return;
  tvScannerStatus.textContent = message;
  tvScannerStatus.classList.toggle('error', type === 'error');
  tvScannerStatus.classList.toggle('success', type === 'success');
}

// Copiar código da sala
if (tvCopyCodeButton) {
  tvCopyCodeButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (!currentRoom) return setTVScannerStatus('Nenhuma sala ativa para copiar.', 'error');
    navigator.clipboard?.writeText(currentRoom).then(() => {
      setTVScannerStatus('Código copiado para a área de transferência.', 'success');
    }).catch(() => {
      setTVScannerStatus('Não foi possível copiar automaticamente.', 'error');
    });
  });
}

async function markRoleRevealReady() {
  if (!currentRoom || !currentPlayerId) {
    throw new Error('Sala ou jogador não definidos');
  }

  const roomRef = ref(getDatabase(), `rooms/${currentRoom}`);
  await update(roomRef, {
    [`players/${currentPlayerId}/roleReady`]: true
  });
}

// Inicializar listeners de chat
initializeChatListeners();

// Assassino
if (assassinSkipButton) {
  assassinSkipButton.addEventListener('click', async () => {
    await gameRoles.assassinKill(null); // Passa
    await gameTurns.nextPhase();
  });
}

if (assassinConfirmButton) {
  assassinConfirmButton.addEventListener('click', async () => {
    // ✅ Verificar se jogador está vivo
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot perform action');
      return;
    }
    if (selectedAssassinTarget) {
      await gameRoles.assassinKill(selectedAssassinTarget);
      await gameTurns.nextPhase();
    }
  });
}

// Médico
if (doctorSkipButton) {
  doctorSkipButton.addEventListener('click', async () => {
    // ✅ Verificar se jogador está vivo
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot perform action');
      return;
    }
    await gameRoles.savePlayer(null); // Passa
    await gameTurns.nextPhase();
  });
}

if (doctorConfirmButton) {
  doctorConfirmButton.addEventListener('click', async () => {
    // ✅ Verificar se jogador está vivo
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot perform action');
      return;
    }
    if (selectedDoctorTarget) {
      await gameRoles.savePlayer(selectedDoctorTarget);
      await gameTurns.nextPhase();
    }
  });
}

// Detetive - Teste da Palavra
if (detectiveWordTestButton) {
  detectiveWordTestButton.addEventListener('click', async () => {
    // ✅ Verificar se jogador está vivo
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot perform action');
      return;
    }
    await gameRoles.activateWordTest();
    setDetectiveSelection('word');
    console.log('🕵️ Teste da palavra ativado; resultados serão mostrados durante o dia.');
    if (detectiveInstruction) {
      detectiveInstruction.textContent = translateString('wordTestActivated');
    }
    // Não chama nextPhase() aqui - testes são mostrados na fase DAY
  });
}

// Detetive - Teste da Porcentagem
if (detectivePercentageTestButton) {
  detectivePercentageTestButton.addEventListener('click', async () => {
    // ✅ Verificar se jogador está vivo
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot perform action');
      return;
    }
    await gameRoles.activatePercentageTest();
    setDetectiveSelection('percentage');
    console.log('🕵️ Teste da porcentagem ativado; resultados serão mostrados durante o dia.');
    if (detectiveInstruction) {
      detectiveInstruction.textContent = translateString('percentageTestActivated');
    }
    // Não chama nextPhase() aqui - testes são mostrados na fase DAY
  });
}

// Detetive - Notificar Investigação
if (detectiveNotifyButton) {
  detectiveNotifyButton.addEventListener('click', async () => {
    // ✅ Verificar se jogador está vivo
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot perform action');
      return;
    }

    // Mostrar lista de jogadores para notificar (exclui o próprio detetive)
    const alivePlayers = Object.entries(gameRoles.roles).filter(([playerId, roleData]) => playerId !== currentPlayerId && roleData.alive !== false);
    const targetPlayerId = await showPlayerSelectionDialog(translateString('whoNotify'), alivePlayers);

    if (targetPlayerId) {
      try {
        await gameRoles.notifyInvestigation(targetPlayerId);
        console.log('📩 Notificação de investigação enviada para:', targetPlayerId);
      } catch (error) {
        console.error('❌ Erro ao enviar notificação de investigação:', error);
        alert(error.message || 'Erro ao enviar notificação de investigação.');
      }
      // Não chama nextPhase() aqui - continua na noite até todos terminarem
    }
  });
}

// Detetive - Terminei (avançar para próxima fase)
if (detectiveDoneButton) {
  detectiveDoneButton.addEventListener('click', async () => {
    await gameTurns.nextPhase();
  });
}


// Votação
if (votingConfirmButton) {
  votingConfirmButton.addEventListener('click', async () => {
    // ✅ Verificar se jogador está vivo
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot vote');
      return;
    }
    // ✅ Verificar se já votou
    if (playerRole?.voted === true) {
      console.log('🗳️ Player already voted');
      return;
    }
    if (selectedVoteTarget) {
      await gameVoting.castVote(currentPlayerId, selectedVoteTarget);
      votingConfirmButton.disabled = true;
    }
  });
}

if (votingSkipButton) {
  votingSkipButton.addEventListener('click', async () => {
    await gameTurns.setPhase(PHASES.DAY);
  });
}

// Dia - Continuar/Votar
if (continueButton) {
  continueButton.addEventListener('click', async () => {
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot continue');
      return;
    }
    console.log('🎯 Continue button clicked by:', currentPlayerId);
    if (continueButton) continueButton.disabled = true;
    
    // Atualizar botão localmente para feedback imediato
    const currentCount = Object.keys(gameVoting.continueActions || {}).length;
    const total = gameState.getAlivePlayers().length;
    const newCount = currentCount + 1;
    if (continueButton) {
      continueButton.textContent = translateString('continueCount', { count: newCount, total });
      console.log(`🔧 Locally updated continue button: ${continueButton.textContent}`);
    }
    
    await gameVoting.continueGame(currentPlayerId);
    updateGroupContinueButtonCounts();
  });
}

if (detectiveTestContinueButton) {
  detectiveTestContinueButton.addEventListener('click', async () => {
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot continue');
      return;
    }
    if (gameRoles?.clearDetectiveTests) {
      try {
        await gameRoles.clearDetectiveTests();
      } catch (error) {
        console.warn('⚠️ Não foi possível limpar o estado dos testes do detetive:', error);
      }
    }
    showDayDiscussion();
  });
}

if (wordTestContinueButton) {
  wordTestContinueButton.addEventListener('click', async () => {
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot continue');
      return;
    }
    if (wordTestContinueButton) wordTestContinueButton.disabled = true;
    
    // Atualizar botão localmente para feedback imediato
    const currentCount = Object.keys(gameVoting.continueActions || {}).length;
    const total = gameState.getAlivePlayers().length;
    const newCount = currentCount + 1;
    if (wordTestContinueButton) {
      wordTestContinueButton.textContent = translateString('goToDiscussionCount', { count: newCount, total });
      console.log(`🔧 Locally updated word test button: ${wordTestContinueButton.textContent}`);
    }
    
    await gameVoting.continueGame(currentPlayerId);
    updateGroupContinueButtonCounts();
  });
}

if (detectiveNotificationContinueButton) {
  detectiveNotificationContinueButton.addEventListener('click', async () => {
    // Ocultar a tela de notificação
    detectiveNotificationScreen?.classList.add('hidden');
    isShowingDetectiveNotification = false;

    await clearDetectiveNotification();

    switch (window.lastProcessedPhase) {
      case PHASES.DAY:
        showDayDiscussion();
        break;
      case PHASES.VOTING:
        showVotingScreen();
        break;
      default:
        showNightScreen(translateString('nightMessage'), false);
        break;
    }
  });
}

if (votingButton) {
  votingButton.addEventListener('click', async () => {
    if (!currentPlayerId || !gameVoting) {
      console.log('⚠️ Cannot request voting - currentPlayerId or gameVoting missing');
      return;
    }

    const alreadyRequested = gameVoting.votingRequests?.[currentPlayerId] === true;
    if (alreadyRequested) {
      console.log('⚠️ Voting already requested by this player');
      return;
    }

    await gameVoting.requestVoting(currentPlayerId);
    updateVotingRequestButton();
  });
}

// Morte
if (deathContinueButton) {
  deathContinueButton.addEventListener('click', async () => {
    if (gameRoles?.roles?.[currentPlayerId]?.alive === false) {
      returnToLobby();
      return;
    }

    clearDeathNotificationTimeouts();
    deathNotificationScreen?.classList.add('hidden');
    await gameTurns.setPhase(PHASES.DAY);
  });
}


// Vitória
if (victoryReplayButton) {
  victoryReplayButton.addEventListener('click', () => {
    // TODO: Reiniciar jogo
    location.reload();
  });
}

async function handlePhaseUpdate(phase, gameStateData, previousPhase = null) {
  if (!phase || !gameTurns) return;

  const effectiveRole = getEffectiveRole();
  if (effectiveRole && effectiveRole !== currentPlayerRole) {
    currentPlayerRole = effectiveRole;
  }

  console.log('🎛️ Handling phase update:', phase, 'effectiveRole:', effectiveRole, 'playerRole:', currentPlayerRole);

  switch (phase) {
    case PHASES.NIGHT:
      try {
        setupNightAudio();
        if (audioPermissionGranted && nightAudio) {
          playOverlayAudio(nightAudio, nightMusic, 0.15);
        }
      } catch (err) {
        console.warn('Erro ao tocar Night:', err);
      }
      if (pendingTraitorNeighborhoodAnnouncement && currentPlayerRole === ROLES.TRAITOR) {
        pendingTraitorNeighborhoodAnnouncement = false;
        const callback = pendingTraitorNeighborhoodCallback;
        pendingTraitorNeighborhoodCallback = null;
        showNightAnnouncement('Existe um traidor na vizinhança', () => {
          if (callback) callback();
          showNightScreen(translateString('nightMessage'), true);
        });
      } else {
        showNightScreen(translateString('nightMessage'), true);
      }
      break;
    case PHASES.ASSASSIN_TURN:
      if (pendingTraitorNeighborhoodAnnouncement && currentPlayerRole === ROLES.TRAITOR) {
        pendingTraitorNeighborhoodAnnouncement = false;
        const callback = pendingTraitorNeighborhoodCallback;
        pendingTraitorNeighborhoodCallback = null;
        showNightAnnouncement('Existe um traidor na vizinhança', () => {
          if (callback) callback();
          if (!hasAliveRole(ROLES.ASSASSIN)) {
            console.log('⏭️ Nenhum assassino ativo, pulando para o próximo turno');
            void gameTurns.setPhase(PHASES.TRAITOR_TURN).catch(err => console.error('Erro ao avançar fase para TRAITOR_TURN após aviso:', err));
            return;
          }
          if (effectiveRole === ROLES.ASSASSIN && isCurrentPlayerAlive()) {
            try {
              setupAssassinWakeupAudio();
              if (audioPermissionGranted && assassinWakeupAudio) {
                playOverlayAudio(assassinWakeupAudio, nightMusic, 0.15);
                assassinWakeupAudio.onended = () => {
                  showAssassinScreen();
                };
              } else {
                showAssassinScreen();
              }
            } catch (err) {
              console.warn('Erro ao tocar AssassinWakeup:', err);
              showAssassinScreen();
            }
          } else {
            try {
              setupAssassinWakeupAudio();
              if (audioPermissionGranted && assassinWakeupAudio) {
                playOverlayAudio(assassinWakeupAudio, nightMusic, 0.15);
                assassinWakeupAudio.onended = () => {
                  showNightScreen('O assassino acorda e escolhe alguém para matar', false);
                };
              } else {
                showNightScreen('O assassino acorda e escolhe alguém para matar', false);
              }
            } catch (err) {
              console.warn('Erro ao tocar AssassinWakeup:', err);
              showNightScreen('O assassino acorda e escolhe alguém para matar', false);
            }
          }
        });
        return;
      }
      if (!hasAliveRole(ROLES.ASSASSIN)) {
        console.log('⏭️ Nenhum assassino ativo, pulando para o próximo turno');
        await gameTurns.setPhase(PHASES.TRAITOR_TURN);
        return;
      }
      if (effectiveRole === ROLES.ASSASSIN && isCurrentPlayerAlive()) {
          // Play assassin wakeup narrator when assassin turn begins
          try {
            setupAssassinWakeupAudio();
            if (audioPermissionGranted && assassinWakeupAudio) {
              playOverlayAudio(assassinWakeupAudio, nightMusic, 0.15);
              // Wait for audio to end before showing screen
              assassinWakeupAudio.onended = () => {
                showAssassinScreen();
              };
            } else {
              showAssassinScreen();
            }
          } catch (err) {
            console.warn('Erro ao tocar AssassinWakeup:', err);
            showAssassinScreen();
          }
      } else {
          try {
            setupAssassinWakeupAudio();
            if (audioPermissionGranted && assassinWakeupAudio) {
              playOverlayAudio(assassinWakeupAudio, nightMusic, 0.15);
              // Wait for audio to end before showing night screen
              assassinWakeupAudio.onended = () => {
                showNightScreen('O assassino acorda e escolhe alguém para matar', false);
              };
            } else {
              showNightScreen('O assassino acorda e escolhe alguém para matar', false);
            }
          } catch (err) {
            console.warn('Erro ao tocar AssassinWakeup:', err);
            showNightScreen('O assassino acorda e escolhe alguém para matar', false);
          }
      }
      break;
    case PHASES.TRAITOR_TURN:
      if (!hasAliveRole(ROLES.TRAITOR)) {
        console.log('⏭️ Nenhum traidor ativo, pulando para o médico');
        await gameTurns.setPhase(PHASES.DOCTOR_TURN);
        return;
      }
      // Play traitor wakeup audio and show screens — do NOT play the "warning" audio here.
      // The TraitorWarning narrator should only be played when the explicit night announcement
      // message ("Existe um traidor na vizinhança") is shown via showNightAnnouncement().
      try {
        setupTraitorWakeupAudio();
        if (audioPermissionGranted && traitorWakeupAudio) {
          // play wakeup and then show appropriate screen
          playOverlayAudio(traitorWakeupAudio, nightMusic, 0.15);
          if (effectiveRole === ROLES.TRAITOR && isCurrentPlayerAlive()) {
            const onEnd = () => {
              traitorWakeupAudio.removeEventListener('ended', onEnd);
              showTraitorScreen();
            };
            traitorWakeupAudio.addEventListener('ended', onEnd);
          } else {
            traitorWakeupAudio.onended = () => {
              showNightScreen('O traidor acorda e escolhe alguém para matar', false);
            };
          }
        } else {
          if (effectiveRole === ROLES.TRAITOR && isCurrentPlayerAlive()) {
            showTraitorScreen();
          } else {
            showNightScreen('O traidor acorda e escolhe alguém para matar', false);
          }
        }
      } catch (err) {
        console.warn('Erro ao tocar TraitorWakeup:', err);
        if (effectiveRole === ROLES.TRAITOR && isCurrentPlayerAlive()) {
          showTraitorScreen();
        } else {
          showNightScreen('O traidor acorda e escolhe alguém para matar', false);
        }
      }
      break;
    case PHASES.DOCTOR_TURN:
      if (!hasAliveRole(ROLES.DOCTOR)) {
        console.log('⏭️ Nenhum médico ativo, pulando para o detetive');
        await gameTurns.setPhase(PHASES.DETECTIVE_TURN);
        return;
      }
      if (effectiveRole === ROLES.DOCTOR && isCurrentPlayerAlive()) {
        try {
          setupDoctorWakeupAudio();
          if (audioPermissionGranted && doctorWakeupAudio) {
            playOverlayAudio(doctorWakeupAudio, nightMusic, 0.15);
            // Wait for audio to end before showing screen
            doctorWakeupAudio.onended = () => {
              showDoctorScreen();
            };
          } else {
            showDoctorScreen();
          }
        } catch (err) {
          console.warn('Erro ao tocar DoctorWakeup:', err);
          showDoctorScreen();
        }
      } else {
        try {
          setupDoctorWakeupAudio();
          if (audioPermissionGranted && doctorWakeupAudio) {
            playOverlayAudio(doctorWakeupAudio, nightMusic, 0.15);
            // Wait for audio to end before showing night screen
            doctorWakeupAudio.onended = () => {
              showNightScreen('O médico escolhe que alma irá salvar', false);
            };
          } else {
            showNightScreen('O médico escolhe que alma irá salvar', false);
          }
        } catch (err) {
          console.warn('Erro ao tocar DoctorWakeup:', err);
          showNightScreen('O médico escolhe que alma irá salvar', false);
        }
      }
      break;
    case PHASES.DETECTIVE_TURN:
      if (!hasAliveRole(ROLES.DETECTIVE)) {
        console.log('⏭️ Nenhum detetive ativo, pulando para o dia');
        await gameTurns.setPhase(PHASES.DAY);
        return;
      }
      if (effectiveRole === ROLES.DETECTIVE && isCurrentPlayerAlive()) {
        try {
          setupDetectiveWakeupAudio();
          if (audioPermissionGranted && detectiveWakeupAudio) {
            playOverlayAudio(detectiveWakeupAudio, nightMusic, 0.15);
            // Wait for audio to end before showing screen
            detectiveWakeupAudio.onended = () => {
              showDetectiveScreen();
            };
          } else {
            showDetectiveScreen();
          }
        } catch (err) {
          console.warn('Erro ao tocar DetectiveWakeup:', err);
          showDetectiveScreen();
        }
      } else {
        try {
          setupDetectiveWakeupAudio();
          if (audioPermissionGranted && detectiveWakeupAudio) {
            playOverlayAudio(detectiveWakeupAudio, nightMusic, 0.15);
            // Wait for audio to end before showing night screen
            detectiveWakeupAudio.onended = () => {
              showNightScreen('O detetive acorda e investiga o caso', false);
            };
          } else {
            showNightScreen('O detetive acorda e investiga o caso', false);
          }
        } catch (err) {
          console.warn('Erro ao tocar DetectiveWakeup:', err);
          showNightScreen('O detetive acorda e investiga o caso', false);
        }
      }
      break;
    case PHASES.DAY:
      {
        // Play day narration audio only when the day phase follows a night cycle.
        // Voting and similar non-night transitions should not trigger Day.mp3.
        try {
          if (![PHASES.VOTING, PHASES.DEATH].includes(previousPhase)) {
            setupDayAudio();
            if (audioPermissionGranted && dayAudio) {
              playOverlayAudio(dayAudio, dayMusic, 0.15);
            }
          } else {
            console.log('⏭️ Skip Day narration after voting/death phase');
          }
        } catch (err) {
          console.warn('Erro ao tocar Day:', err);
        }

        const pendingNotification = gameStateData?.detectiveNotifications?.[currentPlayerId];
        if (pendingNotification && currentPlayerRole !== ROLES.DETECTIVE) {
          if (isShowingDetectiveNotification) {
            return;
          }
          if (pendingNotification.timestamp === lastDetectiveNotificationTimestamp) {
            console.log('ℹ️ Notificação do detetive já exibida, continuando sem mostrar novamente');
          } else {
            console.log('📬 Notificação de investigação pendente encontrada:', pendingNotification);
            if (pendingNotification.timestamp) {
              lastDetectiveNotificationTimestamp = pendingNotification.timestamp;
            }
            showDetectiveNotification(pendingNotification.message || '⚠️ Você está sendo investigado pelo Detetive.');
            return;
          }
        }

        if (gameVoting) {
          try {
            await gameVoting.clearVotingRequests();
            updateVotingRequestButton();
            console.log('🧹 Voting requests cleared at day start');
          } catch (error) {
            console.warn('⚠️ Falha ao limpar pedidos de votação no início do dia:', error);
          }
        }

        await processNightActions();
      }
      break;
    case PHASES.VOTING:
      showVotingScreen();
      break;
    case PHASES.DEATH: {
      const lastEliminatedId = gameState?.gameState?.lastEliminated || (currentRoomData?.eliminatedPlayers || []).slice(-1)[0];
      const lastEliminatedPlayer = currentRoomData?.players?.[lastEliminatedId] || { name: lastEliminatedId || 'Unknown Player' };
      const lastEliminatedRole = currentRoomData?.roles?.[lastEliminatedId]?.role || null;
      showDeathSequence(lastEliminatedPlayer, lastEliminatedRole, lastEliminatedId, () => {
        showDeathNotification(lastEliminatedPlayer, lastEliminatedRole, { skipEliminationAudio: lastEliminatedRole === ROLES.ASSASSIN });
      });
      break;
    }
    case PHASES.GAME_OVER:
      const victory = gameRoles.checkVictory();
      if (victory) {
        showVictoryScreen(victory.winner, victory.players);
      }
      break;
  }
}

// ===== ESCUTADORES DE MUDANÇAS DE FASE =====
function setupGameListeners() {
  if (!gameTurns) return;

  // Escutar mudanças de fase
  gameTurns.listenPhaseChanges(async (phase, gameStateData) => {
    if (window.lastProcessedPhase === phase) {
      console.log('🔄 Same phase, skipping:', phase);
      return;
    }

    const previousPhase = window.lastProcessedPhase;
    window.previousPhase = previousPhase;
    window.lastProcessedPhase = phase;
    console.log('🔄 Phase change:', phase, 'Player:', currentPlayerId);

    if (currentRoomData) {
      currentRoomData.gameState = gameStateData;
    }

    await handlePhaseUpdate(phase, gameStateData, previousPhase);
  });

  // Escutar ações de continuar
  if (continueActionsUnsubscribe) {
    continueActionsUnsubscribe();
    continueActionsUnsubscribe = null;
  }
  continueActionsUnsubscribe = gameVoting.listenContinueActions(async (actions) => {
    console.log('🔄 Continue actions listener triggered:', actions);
    const alivePlayers = gameState.getAlivePlayers();
    const aliveIds = alivePlayers.map(([id]) => id);
    console.log('👥 Alive players:', aliveIds);
    console.log('📊 Actions count:', Object.keys(actions).length, 'Alive count:', aliveIds.length);

    updateGroupContinueButtonCounts();

    if (inWordTestPhase) {
      if (gameVoting.hasAllContinued(aliveIds)) {
        await gameVoting.clearContinueActions();
        console.log('✅ All continued during word test, showing day discussion');
        inWordTestPhase = false;
        if (gameRoles?.clearDetectiveTests) {
          try {
            await gameRoles.clearDetectiveTests();
            console.log('🧹 Detective test state cleared after word test phase');
          } catch (error) {
            console.warn('⚠️ Falha ao limpar estado do teste de detetive:', error);
          }
        }
        showDayDiscussion();
        return;
      }
      return;
    }

    if (gameVoting.hasMajorityContinued(aliveIds)) {
      await gameVoting.clearContinueActions();
      console.log('✅ Majority continued, night cycle begins');
      if (continueButton) continueButton.disabled = false;
      await gameTurns.setPhase(PHASES.NIGHT);
    }
  });

  if (votingRequestsUnsubscribe) {
    votingRequestsUnsubscribe();
    votingRequestsUnsubscribe = null;
  }
  votingRequestsUnsubscribe = gameVoting.listenVotingRequests(async (requests) => {
    console.log('🔄 Voting requests updated:', requests);
    updateVotingRequestButton();

    if (window.lastProcessedPhase !== PHASES.DAY) {
      console.log('⚠️ Voting request update ignored outside day phase:', window.lastProcessedPhase);
      return;
    }

    const alivePlayers = gameState.getAlivePlayers().map(([id]) => id);
    if (!alivePlayers.length) {
      return;
    }

    const requestedCount = Object.keys(requests || {}).length;
    const requiredCount = Math.floor(alivePlayers.length / 2) + 1;
    console.log(`📊 Voting requests: ${requestedCount}/${alivePlayers.length}, required=${requiredCount}`);

    if (requestedCount >= requiredCount) {
      console.log('✅ Majority reached for voting, going to voting phase');
      await gameVoting.clearVotingRequests();
      await gameTurns.goToVoting();
    }
  });

  if (votingContinueActionsUnsubscribe) {
    votingContinueActionsUnsubscribe();
    votingContinueActionsUnsubscribe = null;
  }
  votingContinueActionsUnsubscribe = gameVoting.listenVotingContinueActions(async (actions) => {
    console.log('🔄 Voting continue actions listener triggered:', actions);
    if (window.lastProcessedPhase !== PHASES.VOTING) {
      console.log('⚠️ Voting continue update ignored outside voting phase:', window.lastProcessedPhase);
      return;
    }

    const alivePlayers = gameState.getAlivePlayers();
    const aliveIds = alivePlayers.map(([id]) => id);

    updateVotingContinueButton();

    if (gameVoting.hasMajorityVotingContinued(aliveIds)) {
      await gameVoting.clearVotingContinueActions();
      console.log('✅ Majority continued from voting, returning to day discussion');
      await gameTurns.setPhase(PHASES.DAY);
    }
  });

  // Escutar votos
  if (votesUnsubscribe) {
    votesUnsubscribe();
    votesUnsubscribe = null;
  }
  votesUnsubscribe = gameVoting.listenVotes((votes) => {
    const alivePlayers = gameState.getAlivePlayers();
    const aliveIds = alivePlayers.map(([id]) => id);

    // Atualizar exibição de votos em tempo real
    updateVoteDisplay();

    if (gameVoting.hasAllVoted(aliveIds)) {
      // Resolver votação
      resolveVoting();
    }
  });

  // Escutar ofertas de recrutamento
}

// Mostra oferta de recrutamento em uma aba dedicada
// ============= FUNÇÕES DE UI DE CHAT =============

// Mostra a tela de chat
function activateChatTab(tabName) {
  if (!tabName) return;
  chatTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  chatTabContents.forEach(content => content.classList.toggle('active', content.id === `chat-${tabName}`));
}

function highlightConversationSelection() {
  if (chatConversationList) {
    chatConversationList.querySelectorAll('.private-recipient-button').forEach(button => {
      const isActive = button.dataset.playerId === selectedChatConversationId &&
        (button.dataset.profile || 'player') === selectedPrivateRecipientProfile;
      button.classList.toggle('active', isActive);
    });
  }
}

function highlightGroupSelection() {
  if (groupCondominioButton) {
    groupCondominioButton.classList.toggle('active', selectedChatConversationId === 'public');
  }
}

function clearPrivateConversationSelection() {
  if (privateChatUnsubscribe) {
    privateChatUnsubscribe();
    privateChatUnsubscribe = null;
  }
  selectedChatConversationId = null;
  selectedPrivateRecipientId = null;
  selectedPrivateRecipientName = null;
  selectedPrivateRecipientProfile = 'player';

  if (contactsListView) {
    contactsListView.classList.remove('hidden');
  }
  if (privateChatView) {
    privateChatView.classList.add('hidden');
  }
  if (privateRecipientLabel) {
    privateRecipientLabel.textContent = translateString('selectContact');
  }
  if (privateMessageInput) {
    privateMessageInput.disabled = true;
  }
  if (privateSendButton) {
    privateSendButton.disabled = true;
  }
  if (chatBackButton) {
    chatBackButton.classList.add('hidden');
  }
  if (privateMessagesDiv) {
    privateMessagesDiv.innerHTML = '';
  }
  if (chatConversationList) {
    chatConversationList.querySelectorAll('.private-recipient-button').forEach(b => b.classList.remove('active'));
  }
  activateChatTab('contacts');
}


function selectGroupConversation() {
  if (chatBackButton) {
    chatBackButton.classList.add('hidden');
  }
  selectedChatConversationId = 'public';
  if (privateRecipientLabel) privateRecipientLabel.textContent = translateString('groupsTab');
  if (publicMessageInput) publicMessageInput.disabled = false;
  if (privateMessageInput) privateMessageInput.disabled = true;
  if (privateSendButton) privateSendButton.disabled = true;
  activateChatTab('groups');
  highlightGroupSelection();
  if (publicMessageInput) publicMessageInput.focus();
}

function showChatScreen() {
  if (chatScreen) {
    chatScreen.classList.remove('hidden');
    if (selectedPrivateRecipientId) {
      if (contactsListView) {
        contactsListView.classList.add('hidden');
      }
      if (privateChatView) {
        privateChatView.classList.remove('hidden');
      }
      if (chatBody) {
        chatBody.classList.add('fullscreen-private-active');
      }
      selectPrivateRecipient(selectedPrivateRecipientId, selectedPrivateRecipientName);
    } else if (selectedChatConversationId === 'public') {
      selectGroupConversation();
    } else {
      if (contactsListView) {
        contactsListView.classList.remove('hidden');
      }
      if (privateChatView) {
        privateChatView.classList.add('hidden');
      }
      if (chatBody) {
        chatBody.classList.remove('fullscreen-private-active');
      }
      activateChatTab('contacts');
      if (chatBackButton) {
        chatBackButton.classList.add('hidden');
      }
      updatePrivateChatRecipients();
    }
  }
}

// Esconde a tela de chat
function hideChatScreen() {
  if (chatScreen) {
    chatScreen.classList.add('hidden');
  }
}

function setChatMode(mode) {
  currentChatMode = mode || 'civil';

  if (chatScreen) {
    chatScreen.classList.toggle('chat-mode-assassin', currentChatMode === 'assassin');
    chatScreen.classList.toggle('chat-mode-traitor', currentChatMode === 'traitor');
  }

  if (publicMessageInput) {
    publicMessageInput.placeholder = mode === 'assassin'
      ? 'Enviar mensagem como ASSASSINO...'
      : mode === 'traitor'
        ? 'Enviar mensagem como TRAIDOR...'
        : 'Digite uma mensagem...';
  }

  if (privateMessageInput) {
    privateMessageInput.placeholder = mode === 'assassin'
      ? 'Enviar mensagem privada como ASSASSINO...'
      : mode === 'traitor'
        ? 'Enviar mensagem privada como TRAIDOR...'
        : 'Digite uma mensagem privada...';
  }

  updateSecretChatVisibility();

  if (currentPlayerRole === ROLES.ASSASSIN && currentChatMode === 'assassin') {
    renderOrdersPanel();
  }
}

// Renderiza uma mensagem no chat
function renderMessage(container, message, isOwn = false, isAssassinProfile = false, isTraitorProfile = false) {
  const messageEl = document.createElement('div');
  const classes = ['chat-message'];
  if (isOwn) classes.push('own');
  if (isAssassinProfile) classes.push('assassin');
  if (isTraitorProfile) classes.push('traitor');
  if (message.isDoctorProfile) classes.push('doctor');
  if (message.isDetectiveProfile) classes.push('detective');
  messageEl.className = classes.join(' ');
  
  const locale = currentLanguage === 'en' ? 'en-US' : 'pt-BR';
  const time = new Date(message.timestamp).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const sanitizeName = (name) => {
    if (!name) return translateString('unknown');
    const trimmed = name.trim();
    return trimmed.replace(/\s*-\s*(Assassino|Traidor|Médico|Detetive|assassin|traitor|doctor|detective)$/i, '').trim();
  };

  const rawName = message.displayName || message.playerName || message.fromPlayerName || '';
  const senderName = isAssassinProfile ? translateString('assassinTitle')
    : isTraitorProfile ? translateString('traitorTitle')
    : message.isDoctorProfile ? translateString('doctorTitle')
    : message.isDetectiveProfile ? translateString('detectiveTitle')
    : sanitizeName(rawName);

  messageEl.innerHTML = `
    <div class="chat-sender">${senderName}</div>
    <div class="chat-text">${escapeHtml(message.message)}</div>
    <div class="chat-time">${time}</div>
  `;
  // prefer explicit displayName if provided (used by Traitor mask)
  const senderEl = messageEl.querySelector('.chat-sender');
  const displayName = message.displayName || null;
  const displayColor = message.displayColor || null;
  if (message.isTraitorMask) console.debug('Rendering masked traitor message:', message);
  const isMaskingTraitor = message.isTraitorMask === true;
  const useDisplayName = displayName && !isMaskingTraitor && !isAssassinProfile && !isTraitorProfile && !message.isDoctorProfile && !message.isDetectiveProfile;
  if (useDisplayName) {
    senderEl.textContent = displayName;
  }
  if (displayColor) {
    senderEl.style.color = displayColor;
    messageEl.style.borderLeftColor = displayColor;
  }
  
  container.appendChild(messageEl);
  container.scrollTop = container.scrollHeight;
}

// Escapa HTML para segurança
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toggle fullscreen chat
function toggleChatFullscreen() {
  if (!chatScreen) return;
  const isFull = chatScreen.classList.toggle('chat-fullscreen');
  if (isFull) {
    // save prev position/sizing
    chatScreen.dataset.prevRight = chatScreen.style.right || '';
    chatScreen.dataset.prevBottom = chatScreen.style.bottom || '';
    chatScreen.dataset.prevWidth = chatScreen.style.width || '';
    chatScreen.style.left = '0';
    chatScreen.style.top = '0';
    chatScreen.style.right = '0';
    chatScreen.style.bottom = '0';
    chatScreen.style.width = '100%';
    chatScreen.style.maxHeight = '100%';
    chatScreen.style.borderRadius = '0';
  } else {
    // restore
    chatScreen.style.right = chatScreen.dataset.prevRight || '20px';
    chatScreen.style.bottom = chatScreen.dataset.prevBottom || '20px';
    chatScreen.style.width = chatScreen.dataset.prevWidth || '420px';
    chatScreen.style.maxHeight = '';
    chatScreen.style.borderRadius = '';
  }
}

// Make an element draggable by a handle
function enableChatDrag(el, handle) {
  let isDown = false;
  let startX = 0, startY = 0, origX = 0, origY = 0;

  handle.style.touchAction = 'none';
  handle.addEventListener('pointerdown', (e) => {
    if (!el) return;
    if (el.classList.contains('chat-fullscreen')) return; // disable while fullscreen
    // ignore pointerdown on header controls (buttons/icons)
    if (e.target && e.target.closest && e.target.closest('.chat-header-controls')) return;
    isDown = true;
    handle.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    origX = rect.left;
    origY = rect.top;
    el.style.transition = 'none';
    el.style.position = 'fixed';
    el.style.left = origX + 'px';
    el.style.top = origY + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    document.body.style.userSelect = 'none';
    handle.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.left = (origX + dx) + 'px';
    el.style.top = (origY + dy) + 'px';
  });

  window.addEventListener('pointerup', (e) => {
    if (!isDown) return;
    isDown = false;
    try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
    document.body.style.userSelect = '';
    handle.style.cursor = 'grab';
    el.style.transition = '';
  });
}

// Inicializa listeners de chat
function initializeChatListeners() {
  // Fechar chat
  if (chatCloseButton) {
    chatCloseButton.addEventListener('click', hideChatScreen);
  }

  // Abrir chat quando o botão for clicado
  if (openChatButton) {
    openChatButton.addEventListener('click', () => {
      clearPrivateConversationSelection();
      setChatMode('civil');
      updatePrivateChatRecipients();
      activateChatTab('contacts');
      showChatScreen();
    });
  }

  if (chatBackButton) {
    chatBackButton.addEventListener('click', (e) => {
      e.preventDefault();
      clearPrivateConversationSelection();
      updatePrivateChatRecipients();
    });
  }

  if (groupCondominioButton) {
    groupCondominioButton.addEventListener('click', () => {
      selectGroupConversation();
    });
  }

  // Fullscreen toggle
  if (chatFullscreenButton) {
    chatFullscreenButton.addEventListener('click', (e) => {
      e.preventDefault();
      toggleChatFullscreen();
    });
  }

  // Enable drag to move chat
  if (chatHeaderEl && chatScreen) {
    enableChatDrag(chatScreen, chatHeaderEl);
  }

  // Wire mask apply button once to avoid duplicated handlers
  if (maskApplyButton) {
    maskApplyButton.addEventListener('click', (e) => {
      e.preventDefault();
      const name = maskNameInput?.value?.trim() || null;
      const selectedColor = maskColorSelect?.value || null;
      const use = maskUseToggle?.checked || false;
      currentMaskName = name;
      currentMaskColor = selectedColor;
      maskEnabled = use;
      if (maskPanel) maskPanel.classList.add('hidden');
      console.log('Mask updated:', { currentMaskName, currentMaskColor, maskEnabled });
    });
  }

  // Wire mask apply button for fullscreen
  if (maskApplyButtonFullscreen) {
    maskApplyButtonFullscreen.addEventListener('click', (e) => {
      e.preventDefault();
      const name = maskNameInputFullscreen?.value?.trim() || null;
      const selectedColor = maskColorSelectFullscreen?.value || null;
      const use = maskUseToggleFullscreen?.checked || false;
      currentMaskName = name;
      currentMaskColor = selectedColor;
      maskEnabled = use;
      if (maskPanelFullscreen) maskPanelFullscreen.classList.add('hidden');
      console.log('Mask updated (fullscreen):', { currentMaskName, currentMaskColor, maskEnabled });
    });
  }

  const closeMaskPanel = (panel) => {
    if (!panel) return;
    panel.classList.add('hidden');
  };

  const resetMask = () => {
    currentMaskName = null;
    currentMaskColor = null;
    maskEnabled = false;
    if (maskUseToggle) maskUseToggle.checked = false;
    if (maskNameInput) maskNameInput.value = '';
    if (maskColorSelect) maskColorSelect.value = '#fdd835';
    if (maskUseToggleFullscreen) maskUseToggleFullscreen.checked = false;
    if (maskNameInputFullscreen) maskNameInputFullscreen.value = '';
    if (maskColorSelectFullscreen) maskColorSelectFullscreen.value = '#fdd835';
    console.log('Mask disabled');
  };

  if (maskCloseButton) {
    maskCloseButton.addEventListener('click', (e) => {
      e.preventDefault();
      closeMaskPanel(maskPanel);
    });
  }

  if (maskCloseButtonFullscreen) {
    maskCloseButtonFullscreen.addEventListener('click', (e) => {
      e.preventDefault();
      closeMaskPanel(maskPanelFullscreen);
    });
  }

  if (maskRemoveButton) {
    maskRemoveButton.addEventListener('click', (e) => {
      e.preventDefault();
      resetMask();
      closeMaskPanel(maskPanel);
    });
  }

  if (maskRemoveButtonFullscreen) {
    maskRemoveButtonFullscreen.addEventListener('click', (e) => {
      e.preventDefault();
      resetMask();
      closeMaskPanel(maskPanelFullscreen);
    });
  }

  // Close fullscreen private chat button
  if (privateChatBackBtn) {
    privateChatBackBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeFullscreenPrivateChat();
    });
  }

  // Enviar mensagem privada no fullscreen
  if (privateSendButtonFullscreen) {
    privateSendButtonFullscreen.addEventListener('click', async () => {
      const message = privateMessageInputFullscreen?.value.trim();
      const isAssassinProfile = assassinProfileToggleFullscreen?.checked || false;
      const isTraitorProfile = traitorProfileToggleFullscreen?.checked || false;
      const isDoctorProfile = doctorProfileToggleFullscreen?.checked || false;
      const isDetectiveProfile = detectiveProfileToggleFullscreen?.checked || false;

      if (message && selectedPrivateRecipientId) {
        const displayNameOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskName) ? currentMaskName : null;
        const displayColorOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskColor) ? currentMaskColor : null;
        const isTraitorMask = maskEnabled && currentPlayerRole === ROLES.TRAITOR && !isAssassinProfile && !isTraitorProfile && !isDoctorProfile && !isDetectiveProfile && !!displayNameOverride;
        await sendPrivateMessage(message, selectedPrivateRecipientId, isAssassinProfile, isTraitorProfile, isDoctorProfile, isDetectiveProfile, displayNameOverride, displayColorOverride, isTraitorMask);
        if (privateMessageInputFullscreen) {
          privateMessageInputFullscreen.value = '';
          privateMessageInputFullscreen.focus();
        }
      }
    });

    // Enter para enviar
    if (privateMessageInputFullscreen) {
      privateMessageInputFullscreen.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          const message = privateMessageInputFullscreen.value.trim();
          const isAssassinProfile = assassinProfileToggleFullscreen?.checked || false;
          const isTraitorProfile = traitorProfileToggleFullscreen?.checked || false;
          const isDoctorProfile = doctorProfileToggleFullscreen?.checked || false;
          const isDetectiveProfile = detectiveProfileToggleFullscreen?.checked || false;

          if (message && selectedPrivateRecipientId) {
            const displayNameOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskName) ? currentMaskName : null;
            const displayColorOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskColor) ? currentMaskColor : null;
            const isTraitorMask = maskEnabled && currentPlayerRole === ROLES.TRAITOR && !isAssassinProfile && !isTraitorProfile && !isDoctorProfile && !isDetectiveProfile && !!displayNameOverride;
            await sendPrivateMessage(message, selectedPrivateRecipientId, isAssassinProfile, isTraitorProfile, isDoctorProfile, isDetectiveProfile, displayNameOverride, displayColorOverride, isTraitorMask);
            privateMessageInputFullscreen.value = '';
          }
        }
      });
    }
  }

  if (openSecretChatButton) {
    openSecretChatButton.addEventListener('click', () => {
      clearPrivateConversationSelection();
      const mode = currentPlayerRole === ROLES.ASSASSIN ? 'assassin' : currentPlayerRole === ROLES.TRAITOR ? 'traitor' : 'civil';
      setChatMode(mode);
      updatePrivateChatRecipients();
      activateChatTab('contacts');
      showChatScreen();
    });
  }

  // Trocar abas
  if (chatTabs) {
    chatTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = tab.dataset.tab; // use the tab element directly

        // Desativar todas as abas
        chatTabs.forEach(t => t.classList.remove('active'));
        chatTabContents.forEach(content => content.classList.remove('active'));

        // Ativar tab selecionada
        tab.classList.add('active');
        const targetContent = document.getElementById(`chat-${tabName}`);
        if (targetContent) targetContent.classList.add('active');

        // Focar input apropriado e atualizar seletor se estiver em Contactos
        if (tabName === 'contacts') {
          updatePrivateChatRecipients(); // Atualizar destinatários
          if (privateMessageInput) {
            privateMessageInput.focus();
          }
        } else if (tabName === 'groups') {
          selectGroupConversation();
        }
      });
    });
  }

  // Ensure orders tab button has behavior if present
  if (ordersTabButton) {
    ordersTabButton.addEventListener('click', (e) => {
      e.preventDefault();
      // activate orders tab
      chatTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === 'orders'));
      chatTabContents.forEach(content => content.classList.toggle('active', content.id === 'chat-orders'));
      if (ordersInputArea) ordersInputArea.style.display = 'block';
      if (orderInput) orderInput.focus();
    });
  }

  // Enviar mensagem pública
  if (publicSendButton) {
    publicSendButton.addEventListener('click', async () => {
      const message = publicMessageInput?.value.trim();
      const isAssassinProfile = assassinProfileTogglePublic?.checked || false;
      const isTraitorProfile = traitorProfileTogglePublic?.checked || false;
      const isDoctorProfile = doctorProfileTogglePublic?.checked || false;
      const isDetectiveProfile = detectiveProfileTogglePublic?.checked || false;
      if (message) {
        await sendPublicMessage(message, isAssassinProfile, isTraitorProfile, isDoctorProfile, isDetectiveProfile);
        if (publicMessageInput) {
          publicMessageInput.value = '';
          publicMessageInput.focus();
        }
      }
    });

    // Enter para enviar
    if (publicMessageInput) {
      publicMessageInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          const message = publicMessageInput.value.trim();
          const isAssassinProfile = assassinProfileTogglePublic?.checked || false;
          const isTraitorProfile = traitorProfileTogglePublic?.checked || false;
          const isDoctorProfile = doctorProfileTogglePublic?.checked || false;
          const isDetectiveProfile = detectiveProfileTogglePublic?.checked || false;
          if (message) {
            await sendPublicMessage(message, isAssassinProfile, isTraitorProfile, isDoctorProfile, isDetectiveProfile);
            publicMessageInput.value = '';
          }
        }
      });
    }
  }

  // Enviar mensagem privada - com novo sistema
  if (privateSendButton) {
    privateSendButton.disabled = true; // Desabilitar por padrão
    privateSendButton.addEventListener('click', async () => {
      const message = privateMessageInput?.value.trim();
      const isAssassinProfile = assassinProfileToggle?.checked || false;
      const isTraitorProfile = traitorProfileToggle?.checked || false;
      const isDoctorProfile = doctorProfileToggle?.checked || false;
      const isDetectiveProfile = detectiveProfileToggle?.checked || false;

      if (message && selectedPrivateRecipientId) {
        const displayNameOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskName) ? currentMaskName : null;
        const displayColorOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskColor) ? currentMaskColor : null;
        const isTraitorMask = maskEnabled && currentPlayerRole === ROLES.TRAITOR && !isAssassinProfile && !isTraitorProfile && !isDoctorProfile && !isDetectiveProfile && !!displayNameOverride;
        await sendPrivateMessage(message, selectedPrivateRecipientId, isAssassinProfile, isTraitorProfile, isDoctorProfile, isDetectiveProfile, displayNameOverride, displayColorOverride, isTraitorMask);
        if (privateMessageInput) {
          privateMessageInput.value = '';
          privateMessageInput.focus();
        }
      } else {
        console.warn('⚠️ Selecione um destinatário ou escreva uma mensagem');
      }
    });

    // Enter para enviar
    if (privateMessageInput) {
      privateMessageInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          const message = privateMessageInput.value.trim();
          const isAssassinProfile = assassinProfileToggle?.checked || false;
          const isTraitorProfile = traitorProfileToggle?.checked || false;
          const isDoctorProfile = doctorProfileToggle?.checked || false;
          const isDetectiveProfile = detectiveProfileToggle?.checked || false;

          if (message && selectedPrivateRecipientId) {
            const displayNameOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskName) ? currentMaskName : null;
            const displayColorOverride = (maskEnabled && currentPlayerRole === ROLES.TRAITOR && currentMaskColor) ? currentMaskColor : null;
            const isTraitorMask = maskEnabled && currentPlayerRole === ROLES.TRAITOR && !isAssassinProfile && !isTraitorProfile && !isDoctorProfile && !isDetectiveProfile && !!displayNameOverride;
            await sendPrivateMessage(message, selectedPrivateRecipientId, isAssassinProfile, isTraitorProfile, isDoctorProfile, isDetectiveProfile, displayNameOverride, displayColorOverride, isTraitorMask);
            privateMessageInput.value = '';
          }
        }
      });
    }
  }

  // Desabilitar input por padrão até selecionar um destinatário
  if (privateMessageInput) {
    privateMessageInput.disabled = true;
  }

  setChatMode('civil');
}

// Renderiza mensagens de um chat
function renderChatMessages(messages, container, isPrivate = false) {
  if (!container) return;
  
  container.innerHTML = '';
  const messageArray = Object.values(messages || {});
  messageArray.sort((a, b) => a.timestamp - b.timestamp);
  
  messageArray.forEach(msg => {
    const isOwn = msg.playerId === currentPlayerId || msg.fromPlayerId === currentPlayerId;
    const isAssassinMsg = msg.isAssassinProfile === true;
    const isTraitorProfile = msg.isTraitorProfile === true;
    renderMessage(container, msg, isOwn, isAssassinMsg, isTraitorProfile);
  });
}

// Inicia listeners de chat em tempo real
function startChatListeners() {
  if (!gameChat) return;

  // Escuta mensagens públicas
  if (publicChatUnsubscribe) {
    publicChatUnsubscribe();
    publicChatUnsubscribe = null;
  }

  if (roleProfileUnsubscribe) {
    roleProfileUnsubscribe();
    roleProfileUnsubscribe = null;
  }
  publicChatUnsubscribe = gameChat.listenPublicMessages((messages) => {
    renderChatMessages(messages, publicMessagesDiv);
  });

  // Carregar lista de jogadores vivos para chat privado
  updatePrivateChatRecipients();

  // Listen for role-profile requests (when someone wants you to reply as your role)
  if (roleProfileUnsubscribe) {
    roleProfileUnsubscribe();
    roleProfileUnsubscribe = null;
  }
  if (currentPlayerId) {
    roleProfileUnsubscribe = gameChat.listenRoleProfileRequests(currentPlayerId, (requests) => {
      if (!requests) return;
      Object.entries(requests).forEach(async ([fromId, req]) => {
        const roleRequested = req.role;
        // auto-check appropriate toggle so replies come from role
        if (roleRequested === 'assassin' && assassinProfileToggle) {
          assassinProfileToggle.checked = true;
          if (assassinProfileToggleLabel) assassinProfileToggleLabel.classList.remove('hidden');
        }
        if (roleRequested === 'traitor' && traitorProfileToggle) {
          traitorProfileToggle.checked = true;
          if (traitorProfileToggleLabel) traitorProfileToggleLabel.classList.remove('hidden');
        }

        // optionally clear the request after a short delay
        try {
          await gameChat.clearRoleProfileRequest(currentPlayerId, fromId);
        } catch (err) {
          console.warn('Erro limpando request de profile:', err);
        }
      });
    });
  }
}

// Atualiza lista de destinatários no chat privado
function updatePrivateChatRecipients() {
  if (!chatConversationList || !privateRecipientLabel || !gameState || !currentRoomData?.players) return;

  const alivePlayers = gameState.getAlivePlayers();
  chatConversationList.innerHTML = '';

  const allRolesData = currentRoomData?.roles || gameRoles?.roles || {};
  const roleRecipients = Object.entries(allRolesData)
    .filter(([playerId, roleData]) =>
      playerId !== currentPlayerId &&
      [ROLES.ASSASSIN, ROLES.DOCTOR, ROLES.DETECTIVE, ROLES.TRAITOR].includes(roleData.role) &&
      roleData.alive !== false &&
      // Only show traitor if they have been recruited (alive is true/not false, meaning they have a role)
      (roleData.role !== ROLES.TRAITOR || (roleData.role === ROLES.TRAITOR && roleData.alive !== false))
    );

  const rolePlayerIds = new Set(roleRecipients.map(([playerId]) => playerId));

  roleRecipients.forEach(([playerId, roleData]) => {
    const roleName = gameRoles.getRoleName(roleData.role);
    const playerName = currentRoomData.players?.[playerId]?.name || translateString('unknown');
    const button = document.createElement('button');
    button.type = 'button';
    const roleSlug = String(roleData.role || '').toLowerCase();
    button.className = `private-recipient-button role-recipient-button role-recipient-button--${roleSlug}`;
    button.dataset.playerId = playerId;
    button.dataset.profile = 'role';
    button.dataset.role = roleSlug;
    button.textContent = roleName;
    button.title = playerName;

    if (selectedPrivateRecipientId === playerId && selectedPrivateRecipientName === roleName) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      selectPrivateRecipient(playerId, roleName, 'role');
    });
    chatConversationList.appendChild(button);
  });

  const recipients = alivePlayers.filter(([playerId]) => playerId !== currentPlayerId);
  const totalRecipientCount = roleRecipients.length + recipients.length;

  recipients.forEach(([playerId, playerData]) => {
    const playerName = currentRoomData.players[playerId]?.name || playerData.name || translateString('unknown');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'private-recipient-button';
    button.dataset.playerId = playerId;
    button.dataset.profile = 'player';
    button.textContent = playerName;

    if (selectedPrivateRecipientId === playerId && selectedPrivateRecipientName === playerName) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      selectPrivateRecipient(playerId, playerName, 'player');
    });

    chatConversationList.appendChild(button);
  });

  if (totalRecipientCount === 0 && privateRecipientLabel) {
    privateRecipientLabel.textContent = translateString('noPlayersToTalk');
  }

  const selectedIsAlive = rolePlayerIds.has(selectedPrivateRecipientId) || recipients.some(([playerId]) => playerId === selectedPrivateRecipientId);
  if (!selectedIsAlive) {
    selectedPrivateRecipientId = null;
    selectedPrivateRecipientName = null;
  }

  const hasActiveRecipient = Boolean(selectedPrivateRecipientId);
  privateRecipientLabel.textContent = hasActiveRecipient
    ? `${translateString('talkWith')} ${selectedPrivateRecipientName}`
    : (totalRecipientCount ? translateString('selectPlayer') : translateString('noPlayersToTalk'));

  if (contactsListView) {
    contactsListView.classList.toggle('hidden', hasActiveRecipient);
  }
  if (privateChatView) {
    privateChatView.classList.toggle('hidden', !hasActiveRecipient);
  }

  if (chatBackButton) {
    chatBackButton.classList.toggle('hidden', !hasActiveRecipient);
  }

  const shouldEnableChat = hasActiveRecipient && totalRecipientCount > 0;
  if (privateMessageInput) privateMessageInput.disabled = !shouldEnableChat;
  if (privateSendButton) privateSendButton.disabled = !shouldEnableChat;
}

function selectPrivateRecipient(playerId, playerName, playerProfile = 'player') {
  if (!gameChat || !privateRecipientLabel || !chatConversationList) return;

  if (privateChatUnsubscribe) {
    privateChatUnsubscribe();
    privateChatUnsubscribe = null;
  }

  selectedChatConversationId = playerId;
  selectedPrivateRecipientId = playerId;
  selectedPrivateRecipientName = playerName;
  selectedPrivateRecipientProfile = playerProfile;
  privateRecipientLabel.textContent = `${translateString('talkWith')} ${playerName}`;

  if (contactsListView) {
    contactsListView.classList.add('hidden');
  }
  if (privateChatView) {
    privateChatView.classList.remove('hidden');
  }
  if (chatBody) {
    chatBody.classList.add('fullscreen-private-active');
  }
  activateChatTab('contacts');
  highlightConversationSelection();

  if (privateMessageInput) {
    privateMessageInput.disabled = false;
    privateMessageInput.focus();
  }
  if (privateSendButton) {
    privateSendButton.disabled = false;
  }

  if (chatBackButton) {
    chatBackButton.classList.remove('hidden');
  }

  if (assassinProfileToggleLabel) {
    assassinProfileToggleLabel.classList.toggle('hidden', currentPlayerRole !== ROLES.ASSASSIN);
  }

  if (traitorProfileToggleLabel) {
    traitorProfileToggleLabel.classList.toggle('hidden', currentPlayerRole !== ROLES.TRAITOR);
  }

  if (maskPanel) {
    maskPanel.classList.toggle('hidden', currentPlayerRole !== ROLES.TRAITOR);
  }

  if (privateMessagesDiv) {
    privateMessagesDiv.innerHTML = '';
  }

  // mask apply is wired once during chat initialization (prevents duplicate listeners)

  privateChatUnsubscribe = gameChat.listenPrivateMessages(currentPlayerId, playerId, (messages) => {
    renderPrivateMessages(messages, playerId);
  });

  // Ativar fullscreen para conversa privada
  openFullscreenPrivateChat(playerId, playerName);
}

function openFullscreenPrivateChat(playerId, playerName) {
  if (!privateChatFullscreen) return;

  // Update fullscreen title
  if (privateChatFullscreenTitle) {
    privateChatFullscreenTitle.textContent = playerName;
  }

  // Clear fullscreen message div
  if (privateMessagesFullscreenDiv) {
    privateMessagesFullscreenDiv.innerHTML = '';
  }

  // Update fullscreen input elements visibility
  if (assassinProfileToggleLabelFullscreen) {
    const hidden = currentPlayerRole !== ROLES.ASSASSIN;
    assassinProfileToggleLabelFullscreen.classList.toggle('hidden', hidden);
    if (hidden && assassinProfileToggleFullscreen) assassinProfileToggleFullscreen.checked = false;
  }
  if (traitorProfileToggleLabelFullscreen) {
    const hidden = currentPlayerRole !== ROLES.TRAITOR;
    traitorProfileToggleLabelFullscreen.classList.toggle('hidden', hidden);
    if (hidden && traitorProfileToggleFullscreen) traitorProfileToggleFullscreen.checked = false;
  }
  if (doctorProfileToggleLabelFullscreen) {
    const hidden = currentPlayerRole !== ROLES.DOCTOR;
    doctorProfileToggleLabelFullscreen.classList.toggle('hidden', hidden);
    if (hidden && doctorProfileToggleFullscreen) doctorProfileToggleFullscreen.checked = false;
  }
  if (detectiveProfileToggleLabelFullscreen) {
    const hidden = currentPlayerRole !== ROLES.DETECTIVE;
    detectiveProfileToggleLabelFullscreen.classList.toggle('hidden', hidden);
    if (hidden && detectiveProfileToggleFullscreen) detectiveProfileToggleFullscreen.checked = false;
  }

  if (maskPanelFullscreen) {
    maskPanelFullscreen.classList.toggle('hidden', currentPlayerRole !== ROLES.TRAITOR);
  }

  // Enable fullscreen input
  if (privateMessageInputFullscreen) {
    privateMessageInputFullscreen.disabled = false;
    privateMessageInputFullscreen.focus();
  }
  if (privateSendButtonFullscreen) {
    privateSendButtonFullscreen.disabled = false;
  }

  // Show fullscreen and hide sidebar
  privateChatFullscreen.classList.add('active');
  if (chatBody) {
    chatBody.classList.add('fullscreen-private-active');
  }

  // Listen for messages in fullscreen
  if (privateMessagesFullscreenDiv && gameChat) {
    const unsubscribe = gameChat.listenPrivateMessages(currentPlayerId, playerId, (messages) => {
      renderChatMessages(messages, privateMessagesFullscreenDiv, true);
    });
    // Store for cleanup
    window.fullscreenPrivateChatUnsubscribe = unsubscribe;
  }
}

function closeFullscreenPrivateChat() {
  if (!privateChatFullscreen) return;

  // Hide fullscreen
  privateChatFullscreen.classList.remove('active');
  if (chatBody) {
    chatBody.classList.remove('fullscreen-private-active');
  }

  // Cleanup fullscreen listener
  if (window.fullscreenPrivateChatUnsubscribe) {
    window.fullscreenPrivateChatUnsubscribe();
    window.fullscreenPrivateChatUnsubscribe = null;
  }

  // Clear fullscreen inputs
  if (privateMessageInputFullscreen) {
    privateMessageInputFullscreen.value = '';
    privateMessageInputFullscreen.disabled = true;
  }
  if (privateSendButtonFullscreen) {
    privateSendButtonFullscreen.disabled = true;
  }

  // Reset checkboxes
  if (assassinProfileToggleFullscreen) assassinProfileToggleFullscreen.checked = false;
  if (traitorProfileToggleFullscreen) traitorProfileToggleFullscreen.checked = false;
  if (doctorProfileToggleFullscreen) doctorProfileToggleFullscreen.checked = false;
  if (detectiveProfileToggleFullscreen) detectiveProfileToggleFullscreen.checked = false;
}


// Renderiza mensagens privadas entre dois jogadores
function renderPrivateMessages(messages, recipientId) {
  if (!gameChat) return;

  renderChatMessages(messages, privateMessagesDiv, true);
}

function returnToStartScreen(force = false) {
  const phase = currentRoomData?.gameState?.phase || window.lastProcessedPhase;
  const blockingPhases = [PHASES.ROLE_REVEAL, PHASES.NIGHT, PHASES.ASSASSIN_TURN, PHASES.TRAITOR_TURN, PHASES.DOCTOR_TURN, PHASES.DETECTIVE_TURN];
  console.log('🔁 returnToStartScreen invoked', { currentPlayerId, currentPlayerName, currentPlayerRole, currentRoom, phase, force });
  if (!force && phase && blockingPhases.includes(phase)) {
    console.log('⛔ returnToStartScreen blocked during active phase:', phase);
    return;
  }
  console.trace();
  hideAllScreens();
  cityScreen?.classList.add('hidden');
  loginScreen?.classList.remove('hidden');
  body.classList.remove('in-universe');
  body.classList.remove('night-mode');

  if (privateChatUnsubscribe) {
    privateChatUnsubscribe();
    privateChatUnsubscribe = null;
  }

  if (gameState?.cleanup) {
    gameState.cleanup();
  }

  if (gameRoles?.cleanup) {
    gameRoles.cleanup();
  }

  if (gameVoting?.cleanup) {
    gameVoting.cleanup();
  }

  if (publicChatUnsubscribe) {
    publicChatUnsubscribe();
    publicChatUnsubscribe = null;
  }

  if (continueActionsUnsubscribe) {
    continueActionsUnsubscribe();
    continueActionsUnsubscribe = null;
  }

  if (votingRequestsUnsubscribe) {
    votingRequestsUnsubscribe();
    votingRequestsUnsubscribe = null;
  }

  if (votesUnsubscribe) {
    votesUnsubscribe();
    votesUnsubscribe = null;
  }

  if (readyStatusUnsubscribe) {
    readyStatusUnsubscribe();
    readyStatusUnsubscribe = null;
  }

  if (detectiveNotificationUnsubscribe) {
    detectiveNotificationUnsubscribe();
    detectiveNotificationUnsubscribe = null;
  }

  if (detectiveNotificationPathUnsubscribe) {
    detectiveNotificationPathUnsubscribe();
    detectiveNotificationPathUnsubscribe = null;
  }

  if (roomListener) {
    roomListener();
    roomListener = null;
  }

  // Clear recruitment listener
  if (recruitmentCheckInterval) {
    clearInterval(recruitmentCheckInterval);
    recruitmentCheckInterval = null;
    lastRecruitmentOfferStatus = null;
  }

  currentRoom = null;
  currentRoomData = null;
  gameRoles = null;
  gameVoting = null;
  gameTurns = null;
  gameState = null;
  gameChat = null;
  currentPlayerRole = null;
  gameInitialized = false;
  gameStarted = false;

  if (statusText) statusText.textContent = translateString('playerDeadLobby');
}

// Retorna o jogador para o looby (quando expulso durante o jogo)
function returnToLobby() {
  console.log('🔁 returnToLobby invoked', { currentPlayerId, currentPlayerName, currentRoom });
  
  if (!currentRoom || !currentRoomData || !currentPlayerId) {
    console.log('⚠️ Cannot return to lobby - missing room or player data');
    returnToStartScreen(true);
    return;
  }

  // Esconder todas as telas de jogo e mostrar a tela da cidade
  hideAllScreens();
  gameScreen?.classList.add('hidden');
  cityScreen?.classList.remove('hidden');
  body.classList.add('in-universe');
  body.classList.remove('night-mode');

  // Limpar listeners de jogo
  if (continueActionsUnsubscribe) {
    continueActionsUnsubscribe();
    continueActionsUnsubscribe = null;
  }

  if (votingRequestsUnsubscribe) {
    votingRequestsUnsubscribe();
    votingRequestsUnsubscribe = null;
  }

  if (votesUnsubscribe) {
    votesUnsubscribe();
    votesUnsubscribe = null;
  }

  if (detectiveNotificationUnsubscribe) {
    detectiveNotificationUnsubscribe();
    detectiveNotificationUnsubscribe = null;
  }

  // Renderizar casas dos jogadores no looby
  if (currentRoomData) {
    renderPlayerHouses(currentRoomData);
  }

  // Reproduzir música do lobby
  playLobbyMusic();

  // Mostrar mensagem de que o jogador foi expulso
  if (gameStatus) {
    gameStatus.textContent = translateString('playerEliminatedWatching');
  }
}

function updateVoteDisplay() {
  const voteCounts = gameVoting.getVoteCounts();
  const votesContainer = document.getElementById('vote-counts');
  
  if (!votesContainer) return;

  votesContainer.innerHTML = '';
  
  Object.entries(voteCounts).forEach(([playerId, count]) => {
    const playerName = currentRoomData.players[playerId]?.name || translateString('unknown');
    const voteItem = document.createElement('div');
    voteItem.className = 'vote-item';
    voteItem.innerHTML = `<strong>${playerName}:</strong> ${count === 1 ? translateString('voteCountSingular', { count }) : translateString('voteCountPlural', { count })}`;
    votesContainer.appendChild(voteItem);
  });
}

// Flag para evitar loops de processamento
let isProcessingNightActions = false;
let isResolvingVoting = false;
let deathNotificationTimeouts = [];

function clearDeathNotificationTimeouts() {
  deathNotificationTimeouts.forEach(clearTimeout);
  deathNotificationTimeouts = [];
}

async function processNightActions() {
  if (isProcessingNightActions) {
    console.log('⏳ Already processing night actions, skipping');
    return;
  }

  isProcessingNightActions = true;
  console.log('🌙 Processing night actions for player:', currentPlayerId);

  try {
    const gameStateData = currentRoomData.gameState || {};
    const assassinTarget = gameStateData.assassinAction?.action === 'assassinKill' ? gameStateData.assassinAction.target : null;
    const traitorTarget = gameStateData.traitorAction?.action === 'traitorKill' ? gameStateData.traitorAction.target : null;
    const doctorSave = gameStateData.doctorSave;

    console.log('🎯 Night actions data:', {
      assassinTarget,
      traitorTarget,
      doctorSave,
      currentPlayerId,
      currentPlayerRole,
      gameStateData
    });

    const targets = [assassinTarget, traitorTarget].filter(Boolean);
    console.log('🎯 Targets before filtering:', targets);
    console.log('📜 Roles data:', gameRoles.roles);
    const killedTargets = targets.filter(target => {
      const isSaved = target === doctorSave;
      console.log(`🔍 Checking target ${target}: saved=${isSaved}`);
      return !isSaved;
    });
    console.log('💀 Killed targets after filtering:', killedTargets);

    if (killedTargets.length > 0) {
      const killedTarget = killedTargets[0];
      console.log('💀 Player killed:', killedTargets.join(', '));
      const killedPlayer = currentRoomData.players?.[killedTarget];
      const killedRole = gameState.roles[killedTarget]?.role;

      for (const target of killedTargets) {
        await gameState.updatePlayerRole(target, { alive: false });
      }

      const roomRef = ref(getDatabase(), `rooms/${currentRoom}`);
      await update(roomRef, {
        'gameState/lastAction': null,
        'gameState/assassinAction': null,
        'gameState/traitorAction': null,
        'gameState/doctorAction': null,
        'gameState/doctorSave': null
      });

      const alivePlayersAfterNight = Object.entries(gameState.roles).filter(([, roleData]) => roleData.alive !== false);
      const assassinAliveAfterNight = alivePlayersAfterNight.some(([, roleData]) => roleData.role === ROLES.ASSASSIN);
      const traitorAliveAfterNight = alivePlayersAfterNight.some(([, roleData]) => roleData.role === ROLES.TRAITOR);
      const aliveCountAfterNight = alivePlayersAfterNight.length;
      const assassinVictoryAfterNight = (assassinAliveAfterNight || traitorAliveAfterNight) && aliveCountAfterNight <= 2;

      let deathAnnouncement = `Durante a noite, ${killedPlayer.name} foi morto. Ele era ${gameRoles.getRoleName(killedRole)}.`;
      if (!assassinAliveAfterNight && traitorAliveAfterNight) {
        deathAnnouncement += ' Ainda existe um Traidor na cidade. O jogo continua até que ele seja descoberto.';
      }

      isProcessingNightActions = false;

      if (assassinVictoryAfterNight || (!assassinAliveAfterNight && !traitorAliveAfterNight)) {
        await gameTurns.setPhase(PHASES.GAME_OVER);
        return;
      }

      if (killedTargets.includes(currentPlayerId)) {
        showDayDiscussion(deathAnnouncement);
        setTimeout(() => {
          returnToStartScreen();
        }, 3500);
        return;
      }

      showDayDiscussion(deathAnnouncement);
    } else {
      console.log('✅ No one died, moving to day discussion');

      const roomRef2 = ref(getDatabase(), `rooms/${currentRoom}`);
      await update(roomRef2, {
        'gameState/lastAction': null,
        'gameState/assassinAction': null,
        'gameState/traitorAction': null,
        'gameState/doctorAction': null,
        'gameState/doctorSave': null
      });

      isProcessingNightActions = false;

      let latestGameState = currentRoomData?.gameState || {};
      try {
        const snapshot = await get(ref(getDatabase(), `rooms/${currentRoom}/gameState`));
        if (snapshot.exists()) {
          latestGameState = snapshot.val();
          if (currentRoomData) {
            currentRoomData.gameState = latestGameState;
          }
          if (gameRoles) {
            gameRoles.gameState = latestGameState;
          }
        }
      } catch (error) {
        console.warn('⚠️ Não foi possível buscar gameState atualizado do Firebase:', error);
      }

      const detectiveWordTest = latestGameState?.detectiveWordTest;
      const percentageTestResult = latestGameState?.detectivePercentageTest;
      const notificationData = latestGameState?.detectiveNotifications?.[currentPlayerId];
      const isDetective = currentPlayerRole === ROLES.DETECTIVE;

      const wordTestResult = detectiveWordTest?.activated
        ? GameRoles.getTranslatedDetectiveWordTestResult(detectiveWordTest, currentLanguage, currentPlayerRole)
        : null;
      const hasWordTest = !!wordTestResult;
      const hasDetectiveOnlyTests = isDetective && (
        percentageTestResult?.activated || !!notificationData
      );

      const announcement = latestGameState.dayAnnouncement || '';

      if (hasWordTest) {
        showWordTestScreen(wordTestResult);
      } else if (isDetective && hasDetectiveOnlyTests) {
        showDetectiveTest();
      } else {
        showDayDiscussion(announcement);
      }
    }
  } catch (error) {
    console.error('❌ Error processing night actions:', error);
    isProcessingNightActions = false;
  }
}

// Flag para evitar loops de processamento já declarada acima

async function resolveVoting() {
  if (isResolvingVoting) {
    console.log('⏳ Already resolving voting, skipping');
    return;
  }

  isResolvingVoting = true;
  console.log('🗳️ Resolving voting');

  try {
    const eliminated = await gameVoting.resolveVote();

    if (eliminated) {
      console.log('💀 Player eliminated by voting:', eliminated);
      const eliminatedPlayer = currentRoomData.players[eliminated];
      const eliminatedRole = gameState.roles[eliminated]?.role;

      // Marcar jogador como morto
      await gameState.updatePlayerRole(eliminated, { alive: false });

      // Broadcast the death phase so spectators and all clients can render the voting elimination screen.
      const roomRef = ref(getDatabase(), `rooms/${currentRoom}`);
      await update(roomRef, {
        'gameState/phase': PHASES.DEATH,
        'gameState/lastEliminated': eliminated
      });

      // Limpar votos
      await gameVoting.clearVotes();
      // 🧹 Resetar flag voted em todos
      const rolesUpdate = {};
      Object.keys(gameRoles.roles).forEach(playerId => {
        rolesUpdate[`roles/${playerId}/voted`] = false;
      });
      await update(roomRef, rolesUpdate);

      // Calcular estado do jogo
      const alivePlayers = Object.entries(gameState.roles).filter(([, roleData]) => roleData.alive !== false);
      const assassinAlive = alivePlayers.some(([, roleData]) => roleData.role === ROLES.ASSASSIN);
      const traitorAlive = alivePlayers.some(([, roleData]) => roleData.role === ROLES.TRAITOR);
      const aliveCount = alivePlayers.length;
      const assassinKilledByVote = eliminatedRole === ROLES.ASSASSIN;
      const assassinVictoryByCountdown = assassinAlive && aliveCount <= 2;

      // Timings for display:
      // 0-5s: Reveal role (handled by the death notification sequence)
      // 5-7s: If assassin was killed and traitor is still alive, show traitor warning
      // 7s+: Advance to next phase
      const timeBeforeAdvance = (assassinKilledByVote && traitorAlive) ? 9500 : 6500;

      deathNotificationTimeouts.push(setTimeout(async () => {
        console.log('⏭️ Advancing after voting death');
        isResolvingVoting = false;

        if (eliminated === currentPlayerId) {
          console.log('💀 Current player was eliminated');
          returnToStartScreen();
          return;
        }

        if (assassinKilledByVote && !traitorAlive) {
          console.log('🎉 Assassino eliminado, nenhum Traidor vivo → GAME OVER (Cidade venceu)');
          await gameTurns.setPhase(PHASES.GAME_OVER);
          return;
        }

        if (assassinVictoryByCountdown) {
          console.log('🎉 Assassino + Traidor vivo com poucos jogadores → GAME OVER (Assassino venceu)');
          await gameTurns.setPhase(PHASES.GAME_OVER);
          return;
        }

        console.log('🌅 Transitioning to DAY phase');
        skipNextDayMusic = true;
        await gameTurns.setPhase(PHASES.DAY);
      }, timeBeforeAdvance));
    } else {
      console.log('✅ No one eliminated by voting');
      // 🧹 Limpar votos
      await gameVoting.clearVotes();
      // 🧹 Resetar flag voted em todos
      const roomRef = ref(getDatabase(), `rooms/${currentRoom}`);
      const rolesUpdate = {};
      Object.keys(gameRoles.roles).forEach(playerId => {
        rolesUpdate[`roles/${playerId}/voted`] = false;
      });
      await update(roomRef, rolesUpdate);
      isResolvingVoting = false;
      skipNextDayMusic = true;
      await gameTurns.setPhase(PHASES.DAY);
    }
  } catch (error) {
    console.error('❌ Error resolving voting:', error);
    isResolvingVoting = false;
  }
}

// Inicializar listeners quando o jogo começar
function initializeGame() {
  if (gameTurns && gameVoting && gameState) {
    setupGameListeners();
  }
}

// ============= FUNÇÕES DE CHAT SECRETO E RECRUTAMENTO =============

// Mostra modal de recrutamento
function showRecruitmentModal() {
  if (!recruitmentModal) return;
  recruitmentModal.classList.remove('hidden');
}

// Esconde modal de recrutamento
function hideRecruitmentModal() {
  if (!recruitmentModal) return;
  recruitmentModal.classList.add('hidden');
}

// Adiciona listeners para recrutamento
if (acceptRecruitmentButton) {
  acceptRecruitmentButton.addEventListener('click', async () => {
    if (currentPlayerId && gameRoles) {
      try {
        await gameRoles.acceptRecruitment();
        console.log('✅ Recrutamento aceito');
        hideRecruitmentModal();
        // Reset status to detect next offer
        lastRecruitmentOfferStatus = null;
        // Atualizar role local
        currentPlayerRole = ROLES.TRAITOR;
        // Preserve the warning until the night/assassin flow begins
        pendingTraitorNeighborhoodAnnouncement = true;
        pendingTraitorNeighborhoodCallback = () => {
          if (gameChat && !privateChatUnsubscribe) {
            startChatListeners();
          }
        };
      } catch (error) {
        console.error('❌ Erro ao aceitar recrutamento:', error);
      }
    }
  });
}

if (declineRecruitmentButton) {
  declineRecruitmentButton.addEventListener('click', async () => {
    if (currentPlayerId && gameRoles) {
      try {
        await gameRoles.declineRecruitment();
        console.log('✅ Recrutamento recusado');
        hideRecruitmentModal();
        // Reset status to detect next offer
        lastRecruitmentOfferStatus = null;
      } catch (error) {
        console.error('❌ Erro ao recusar recrutamento:', error);
      }
    }
  });
}

if (recruitTraitorButton) {
  recruitTraitorButton.addEventListener('click', async () => {
    if (currentPlayerId && gameRoles && currentPlayerRole === ROLES.ASSASSIN) {
      if (!selectedPrivateRecipientId) {
        alert('Selecione um jogador no chat privado para recrutar.');
        return;
      }
      try {
        await gameRoles.sendRecruitmentOffer(selectedPrivateRecipientId);
        console.log('📩 Oferta de recrutamento enviada ao jogador selecionado');
        alert('Oferta de recrutamento enviada!');
      } catch (error) {
        console.error('❌ Erro ao enviar oferta de recrutamento:', error);
        alert(error.message || 'Erro ao enviar oferta de recrutamento.');
      }
    }
  });
}

// Traidor - Herdança de Assassino quando Assassino morre
async function checkAssassinDeath() {
  if (!gameRoles || currentPlayerRole !== ROLES.TRAITOR) return;

  const traitorData = gameRoles.roles[currentPlayerId];
  if (!traitorData || traitorData.alive === false) {
    console.log('⚠️ Traidor morto não pode assumir Assassino');
    return;
  }

  const assassinAlive = Object.entries(gameRoles.roles).some(
    ([, roleData]) => roleData.role === ROLES.ASSASSIN && roleData.alive !== false
  );

  if (!assassinAlive) {
    console.log('🔄 Assassino morreu, Traidor assume o papel de Assassino');
    try {
      const promoted = await gameRoles.promoteTraitorToAssassin();
      if (!promoted) {
        console.warn('⚠️ Promoção de Traidor falhou ou não foi permitida');
        return;
      }
      currentPlayerRole = ROLES.ASSASSIN;
      showNightAnnouncement('O Traidor agora é o novo Assassino!', () => {
        void gameTurns.nextPhase().catch(error => console.error('Erro ao avançar fase após promoção do traidor:', error));
      });
    } catch (error) {
      console.error('❌ Erro ao promover Traidor para Assassino:', error);
    }
  }
}

// Atualizar panels de chat secreto para Assassino/Traidor
function updateSecretChatVisibility() {
  if (recruitmentArea) {
    recruitmentArea.style.display = currentPlayerRole === ROLES.ASSASSIN && currentChatMode === 'assassin' ? 'flex' : 'none';
  }

  if (assassinProfileToggleLabel) {
    const hidden = currentChatMode !== 'assassin' || currentPlayerRole !== ROLES.ASSASSIN;
    assassinProfileToggleLabel.classList.toggle('hidden', hidden);
    if (hidden && assassinProfileToggle) assassinProfileToggle.checked = false;
    if (hidden && assassinProfileTogglePublic) assassinProfileTogglePublic.checked = false;
  }

  if (assassinProfileToggleLabelPublic) {
    const hidden = currentChatMode !== 'assassin' || currentPlayerRole !== ROLES.ASSASSIN;
    assassinProfileToggleLabelPublic.classList.toggle('hidden', hidden);
    if (hidden && assassinProfileToggle) assassinProfileToggle.checked = false;
    if (hidden && assassinProfileTogglePublic) assassinProfileTogglePublic.checked = false;
  }

  if (doctorProfileToggleLabel) {
    const hidden = currentPlayerRole !== ROLES.DOCTOR;
    doctorProfileToggleLabel.classList.toggle('hidden', hidden);
    if (hidden && doctorProfileToggle) doctorProfileToggle.checked = false;
    if (hidden && doctorProfileTogglePublic) doctorProfileTogglePublic.checked = false;
  }

  if (doctorProfileToggleLabelPublic) {
    const hidden = currentPlayerRole !== ROLES.DOCTOR;
    doctorProfileToggleLabelPublic.classList.toggle('hidden', hidden);
    if (hidden && doctorProfileToggle) doctorProfileToggle.checked = false;
    if (hidden && doctorProfileTogglePublic) doctorProfileTogglePublic.checked = false;
  }

  if (detectiveProfileToggleLabel) {
    const hidden = currentPlayerRole !== ROLES.DETECTIVE;
    detectiveProfileToggleLabel.classList.toggle('hidden', hidden);
    if (hidden && detectiveProfileToggle) detectiveProfileToggle.checked = false;
    if (hidden && detectiveProfileTogglePublic) detectiveProfileTogglePublic.checked = false;
  }

  if (detectiveProfileToggleLabelPublic) {
    const hidden = currentPlayerRole !== ROLES.DETECTIVE;
    detectiveProfileToggleLabelPublic.classList.toggle('hidden', hidden);
    if (hidden && detectiveProfileToggle) detectiveProfileToggle.checked = false;
    if (hidden && detectiveProfileTogglePublic) detectiveProfileTogglePublic.checked = false;
  }

  // show mask controls if player is traitor
  if (maskPanel) {
    maskPanel.classList.toggle('hidden', currentPlayerRole !== ROLES.TRAITOR);
  }

  if (traitorProfileToggleLabel) {
    traitorProfileToggleLabel.classList.toggle('hidden', currentChatMode !== 'traitor' || currentPlayerRole !== ROLES.TRAITOR);
  }

  if (traitorProfileToggleLabelPublic) {
    traitorProfileToggleLabelPublic.classList.toggle('hidden', currentChatMode !== 'traitor' || currentPlayerRole !== ROLES.TRAITOR);
  }

  if (chatOrdersContent) {
    // Remove orders tab from the chat entirely.
    if (ordersTabButton) {
      ordersTabButton.classList.add('hidden');
      ordersTabButton.disabled = true;
    }
    chatOrdersContent.classList.add('hidden');
    chatOrdersContent.classList.remove('active');
    if (ordersInputArea) ordersInputArea.style.display = 'none';
  }
}

// Renderiza painel de ordens para Assassino
function renderOrdersPanel() {
  if (!ordersPanel || currentPlayerRole !== ROLES.ASSASSIN) return;

  // Obter traidor vivo
  const traitorId = Object.entries(gameRoles.roles).find(
    ([, roleData]) => roleData.role === ROLES.TRAITOR && roleData.alive !== false
  )?.[0];

  if (!traitorId) {
    ordersPanel.innerHTML = '<p>Nenhum Traidor vivo</p>';
    if (ordersInputArea) ordersInputArea.style.display = 'none';
    return;
  }

  const traitorName = currentRoomData?.players?.[traitorId]?.name || 'Traidor';
  ordersPanel.innerHTML = `
    <div class="orders-info">
      <p>Traidor: <strong>${traitorName}</strong></p>
      <p>Envie uma ordem para o Traidor executar</p>
    </div>
  `;

  if (ordersInputArea) ordersInputArea.style.display = 'flex';
}

// Event listeners para ordens
if (orderSendButton) {
  orderSendButton.addEventListener('click', async () => {
    const order = orderInput?.value.trim();
    if (order && currentPlayerRole === ROLES.ASSASSIN && gameRoles) {
      try {
        await gameRoles.sendOrderToTraitor(order);
        console.log('📩 Ordem enviada ao Traidor');
        if (orderInput) {
          orderInput.value = '';
          orderInput.focus();
        }
      } catch (error) {
        console.error('❌ Erro ao enviar ordem:', error);
      }
    }
  });

  if (orderInput) {
    orderInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const order = orderInput.value.trim();
        if (order && currentPlayerRole === ROLES.ASSASSIN && gameRoles) {
          try {
            await gameRoles.sendOrderToTraitor(order);
            console.log('📩 Ordem enviada ao Traidor');
            orderInput.value = '';
          } catch (error) {
            console.error('❌ Erro ao enviar ordem:', error);
          }
        }
      }
    });
  }
}

// Traidor - Listeners para aceitar/recusar recrutamento
function setupRecruitmentListeners() {
  if (!gameRoles) return;

  // Clear existing interval if any
  if (recruitmentCheckInterval) {
    clearInterval(recruitmentCheckInterval);
  }

  recruitmentCheckInterval = setInterval(() => {
    const offers = gameRoles.getPendingRecruitmentOffers();
    const currentStatus = offers?.status;

    // Only show modal when transitioning to 'pending' status and player is innocent
    if (currentStatus === 'pending' && lastRecruitmentOfferStatus !== 'pending' && currentPlayerRole === ROLES.INNOCENT) {
      console.log('🎯 Recebeu proposta de recrutamento:', offers);
      showRecruitmentModal();
    }

    // Update last known status
    lastRecruitmentOfferStatus = currentStatus;
  }, 500); // Check every 500ms for faster detection
}

// Traidor - Escuta ordens do Assassino
function listenForTraitorOrders() {
  if (currentPlayerRole !== ROLES.TRAITOR || !gameRoles) return;

  const checkOrders = setInterval(() => {
    const orders = gameRoles.getTraitorOrders();
    if (orders) {
      console.log('📩 Traidor recebeu ordem:', orders.order);
      // Você pode mostrar a ordem em um painel ou notificação
      // Por enquanto, apenas registra no console
    }
  }, 1000);
}

// Traidor - Executar ação de morte
if (traitorSkipButton) {
  traitorSkipButton.addEventListener('click', async () => {
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot perform action');
      return;
    }
    await gameRoles.traitorKill(null); // Passa
    await gameTurns.nextPhase();
  });
}

if (traitorConfirmButton) {
  traitorConfirmButton.addEventListener('click', async () => {
    const playerRole = gameRoles.roles[currentPlayerId];
    if (playerRole?.alive === false) {
      console.log('💀 Player is dead, cannot perform action');
      return;
    }
    if (selectedTraitorTarget) {
      await gameRoles.traitorKill(selectedTraitorTarget);
      await gameTurns.nextPhase();
    }
  });
}
