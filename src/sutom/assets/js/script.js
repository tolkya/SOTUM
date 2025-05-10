let WORD = ""; // Le mot à deviner (récupéré via l'API)
let MAX_TRIES = 0; // Nombre d’essais autorisés (calculé en fonction du mot)
let currentRow = 0; // Ligne actuelle dans la grille (tentative en cours)
let currentGuess = ""; // Lettres tapées dans la tentative en cours
let fixedLetters = []; // Lettres déjà devinées et bien placées (fixées)
let gameOver = false; // État de la partie : true = fin du jeu
let NORMALIZED_WORD = ""; // Version du mot sans accents (pour comparaison)

const game = document.getElementById("game"); // Récupère l’élément HTML principal pour afficher la grille

// Fonction pour démarrer une nouvelle partie
async function initGame() { //async car appelle une API externe
  try {
    const response = await fetch("https://trouve-mot.fr/api/random"); // fetch appelle le site pour un mot aléatoire
    const data = await response.json(); // await -> on attend la réponse et transformation en JSON

    WORD = data[0].name.toUpperCase(); // Convertit le mot en majuscules
    NORMALIZED_WORD = WORD.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Supprime les accents
    MAX_TRIES = WORD.length + 1; // Nombre d’essais = longueur du mot + 1
    fixedLetters = Array(WORD.length).fill(""); // Tableau des lettres fixées, vide au départ
    fixedLetters[0] = WORD[0]; // Révèle la première lettre (avec accents)
    currentRow = 0; // Ligne courante = 0 (début)
    currentGuess = ""; // Aucune lettre tapée au début

    console.log("Mot choisi :", WORD); // Affiche le mot (debug)

   
    const oldCategory = document.getElementById("category"); 
    if (oldCategory) oldCategory.remove();  // Supprime l'indice catégorie précédente s'il en existe

    // création d'une div pour afficher la catégorie en dessus du jeu
    const categoryDiv = document.createElement("div"); // Crée une div pour afficher la catégorie
    categoryDiv.id = "category";
    categoryDiv.textContent = `Catégorie : ${data[0].categorie}`; // Texte : catégorie
    document.body.insertBefore(categoryDiv, game); // Ajoute l’indice au-dessus du jeu

    gameOver = false; // La partie commence
    document.activeElement.blur(); // force le navigateur à “désélectionner” tout élément actif
    generateGrid(); // Crée la grille vide
    generateVirtualKeyboard(); // création clavier virtuel
    listenToVirtualKeyboard(); // écoute du clavier virtuel
    updateGrid(); // Met à jour la ligne active
  } catch (error) {
    console.error("Erreur API :", error); // Affiche l’erreur si l’API échoue
    alert("Erreur de connexion. Réessaie plus tard !");
  }

  // Ajout du bouton rejouer s'il n'existe pas
  let replayButton = document.getElementById("replay-btn");
  // si pas de bouton rejouer on le créer
  if (!replayButton) {
    replayButton = document.createElement("button");
    replayButton.id = "replay-btn";
    replayButton.textContent = "🔁 Rejouer";
    replayButton.style.marginTop = "20px";
    // quand on clique dessus le bouton on relance une nouvelle partie
    replayButton.addEventListener("click", (e) => {
      e.target.blur(); // enlève le focus visuel et clavier du bouton
      initGame(); // Relance le jeu
    });    
    document.body.appendChild(replayButton); // Ajoute le bouton à la page

    document.getElementById("overlay-replay").addEventListener("click", (e) => {
      e.target.blur(); // Enlève le focus clavier
      document.getElementById("overlay").classList.remove("show"); // Cache l'overlay
      initGame(); // Relance le jeu
    });
    
    
  }
}

// Génère la grille de cases dynamiquement / fabrique les cases
function generateGrid() {
  game.innerHTML = ""; // Vide tout le contenu HTML existant dans la grille (reset du plateau)

  game.style.gridTemplateColumns = `repeat(${WORD.length}, 45px)`; 
  // Crée dynamiquement une grille CSS avec autant de colonnes que de lettres dans le mot

  for (let i = 0; i < MAX_TRIES * WORD.length; i++) { 
    // MAX_TRIES lignes * WORD.length colonnes = nombre total de cases à créer

    const cell = document.createElement("div"); // Crée une case (div)
    cell.className = "cell"; // On lui donne la classe "cell" pour le style CSS
    game.appendChild(cell); // On ajoute cette case dans la grille
  }
}

// compter combien de fois chaque lettre apparait dans le mot à deviner
function getLetterFrequencies(word, fixedLetters) {
  const frequencies = {}; // Dictionnaire pour compter le nombre de fois que chaque lettre apparaît

  for (let i = 0; i < word.length; i++) {
    const letter = word[i]; // Lettre actuelle
    const normalized = letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Supprime les accents pour comparer plus facilement

    const fixed = fixedLetters[i]; // Lettre déjà fixée (trouvée au bon endroit précédemment)
    const fixedNormalized = fixed.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (!fixed || fixedNormalized !== normalized) {
      // On ne compte que les lettres non déjà fixées ou mal fixées
      frequencies[normalized] = (frequencies[normalized] || 0) + 1;
    }
  }

  return frequencies; // Exemple : { A: 1, M: 1, I: 2 }
}

// Met à jour la ligne active avec les lettres saisies + lettres fixes
function updateGrid() {
  for (let i = 0; i < WORD.length; i++) {
    const index = currentRow * WORD.length + i; // Calcul l'index de la case dans le tableau plat
    const cell = game.children[index]; // Récupère la case

    const fixed = fixedLetters[i]; // Vérifie s’il y a une lettre fixée à cet endroit
    if (fixed) {
      cell.textContent = fixed; // Affiche la lettre fixée
      cell.classList.add("correct"); // Marque la case en vert
    } else {
      cell.textContent = currentGuess[i] || ""; // Sinon, affiche la lettre tapée ou rien
    }
  }
}

// Valide la tentative et affiche les couleurs
function submitGuess() {
  if (gameOver) return; // Si la partie est terminée, on ne fait rien

  let guessToSubmit = "";
  for (let i = 0; i < WORD.length; i++) {
    guessToSubmit += fixedLetters[i] || currentGuess[i] || "";
    // Construit le mot complet avec lettres fixées et lettres tapées
  }

  if ([...guessToSubmit].some(letter => letter === "")) return;
  // Si une lettre est manquante, on arrête ici

  // Normalise le mot et la proposition (supprime les accents)
  const normalizedWordArray = [...WORD.normalize("NFD").replace(/[\u0300-\u036f]/g, "")];
  const normalizedGuessArray = [...guessToSubmit.normalize("NFD").replace(/[\u0300-\u036f]/g, "")];

  const result = Array(WORD.length).fill("absent"); // Initialisation du tableau de résultats
  const frequencies = {};

  // 1️⃣ Compte combien de fois chaque lettre apparaît dans le mot à deviner
  for (let i = 0; i < normalizedWordArray.length; i++) {
    const l = normalizedWordArray[i];
    frequencies[l] = (frequencies[l] || 0) + 1;
  }

  // 2️⃣ Marque les lettres bien placées
  for (let i = 0; i < WORD.length; i++) {
    const index = currentRow * WORD.length + i;
    const cell = game.children[index];
    const guessLetter = guessToSubmit[i];
    const normalizedGuess = normalizedGuessArray[i];
    const normalizedTarget = normalizedWordArray[i];

    if (normalizedGuess === normalizedTarget) {
      result[i] = "correct";
      fixedLetters[i] = WORD[i]; // On garde la version avec accents
      frequencies[normalizedGuess]--; // Décrémente le stock de cette lettre
    }
  }

  // 3️⃣ Marque les lettres présentes mais mal placées
  for (let i = 0; i < WORD.length; i++) {
    const index = currentRow * WORD.length + i;
    const cell = game.children[index];
    const guessLetter = guessToSubmit[i];
    const normalizedGuess = normalizedGuessArray[i];

    if (result[i] === "correct") {
      cell.classList.add("correct"); // Bien placée (vert)
    } else if (frequencies[normalizedGuess] > 0) {
      result[i] = "present";
      cell.classList.add("present"); // Présente mais mal placée (jaune)
      cell.dataset.letter = guessLetter;
      frequencies[normalizedGuess]--;
    } else {
      result[i] = "absent";
      cell.classList.add("absent"); // Pas dans le mot (gris)
    }
  }

  const fullGuess = normalizedGuessArray.join("");
  const fullWord = normalizedWordArray.join("");
  if (fullGuess === fullWord) {
    gameOver = true;
    showOverlayMessage("Bravo ! Tu as trouvé ! 🎉");
    return;
  } else if (currentRow === MAX_TRIES - 1) {
    gameOver = true;
    showOverlayMessage(`Perdu ! Le mot était : ${WORD}`);
    return;
  }

  currentRow++; // Passe à la ligne suivante
  currentGuess = ""; // Reset la saisie
  updateGrid(); // Met à jour l'affichage
}

function showOverlayMessage(message) {
  const overlay = document.getElementById("overlay"); // Cible la pop-up
  const msg = document.getElementById("overlay-message"); // Texte dans la pop-up
  msg.textContent = message; // Change le texte
  overlay.classList.add("show"); // Affiche la pop-up
}

// clavier virtuel
function generateVirtualKeyboard() {
  // Supprime le clavier existant s’il y en a un
  let oldKeyboard = document.getElementById("keyboard");
  if (oldKeyboard) oldKeyboard.remove();

  const keyboard = document.createElement("div"); // Crée un conteneur pour le clavier
  keyboard.id = "keyboard";
  keyboard.className = "keyboard";

  const keys = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", // Lettres A-Z
    "BACKSPACE", // Touche pour effacer
    "ENTER" // Touche pour valider
  ];

  keys.forEach((key) => {
    const keyButton = document.createElement("button");
    keyButton.className = "key";
    keyButton.textContent = key === "BACKSPACE" ? "←" : key === "ENTER" ? "⏎" : key;
    keyButton.dataset.key = key;
    keyboard.appendChild(keyButton);
  });

  document.body.appendChild(keyboard); // Ajoute le clavier à la page
}

// Écoute le clavier pour les lettres, backspace et entrer
function listenToKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (currentRow >= MAX_TRIES || gameOver) return;

    if (e.key === "Enter") {
      submitGuess(); // Valide la ligne
    } else if (e.key === "Backspace") {
      // Supprime la dernière lettre tapée non fixée
      for (let i = WORD.length - 1; i >= 0; i--) {
        if (!fixedLetters[i] && currentGuess[i]) {
          currentGuess = currentGuess.substring(0, i) + "" + currentGuess.substring(i + 1);
          break;
        }
      }
      updateGrid();
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      const letter = e.key.toUpperCase(); // Met en majuscule

      // Ajoute la lettre dans la première case vide non fixée
      for (let i = 0; i < WORD.length; i++) {
        if (!fixedLetters[i] && !currentGuess[i]) {
          currentGuess = currentGuess.padEnd(i, "");
          currentGuess = currentGuess.substring(0, i) + letter + currentGuess.substring(i + 1);
          break;
        }
      }
      updateGrid();
    }
  });
}

function listenToVirtualKeyboard() {
  document.getElementById("keyboard").addEventListener("click", (e) => {
    const key = e.target.dataset.key;
    if (!key) return;

    // Simule un évènement clavier
    const fakeEvent = { key: key === "BACKSPACE" ? "Backspace" : key === "ENTER" ? "Enter" : key };
    document.dispatchEvent(new KeyboardEvent("keydown", fakeEvent));
  });
}
// Lancer le jeu au chargement
initGame();         // Démarre une nouvelle partie
listenToKeyboard(); // Active l'écoute du clavier
