let battle;

let trainerName;
let opponentName;

let trainerCurrentPokemon;
let opponentCurrentPokemon;

const skipAnimations = false;

async function startBattle(a, b){
    trainerName = a;
    opponentName = b;
    const result = await $.post(`/api/battles/${trainerName}/${opponentName}`);
    battle = result;

    await showMessage(`Starting battle between ${trainerName} and ${opponentName} !`);

    console.log(battle);

    // battle starts, get first pokemon for each trainer !
    trainerCurrentPokemon = battle.trainer1.team[0];
    opponentCurrentPokemon = battle.trainer2.team[0];

    await enterPokemon(trainerName, trainerCurrentPokemon, false);
    await enterPokemon(opponentName, opponentCurrentPokemon, true);

    await refreshBattle();
}

async function enterPokemon(trainerName, pokemon, front){
    await showMessage(`${trainerName}'s ${pokemon.pokemonTypeObject.name} enters battle !`);
    const pokemonSprite = front ? pokemon.pokemonTypeObject.sprites.front_default : pokemon.pokemonTypeObject.sprites.back_default;
    const pokemonImageSelector = `[id='${trainerName}-pokemon-img']`;
    $(pokemonImageSelector).attr("src", pokemonSprite);
    $(`#${trainerName}-pokemon-name`).text(pokemon.pokemonTypeObject.name);

    updatePokemon(trainerName, pokemon);

    await animateCss(pokemonImageSelector, "zoomIn");
    updatePokemon(trainerName, pokemon);
}


function updatePokemon(trainerName, pokemon){
    let pokemonHpBar = $(`[id='${trainerName}-pokemon-hp']`);

    pokemonHpBar.text(pokemon.currentStates.hp);
    pokemonHpBar.attr("aria-valuemax",pokemon.pokemonTypeObject.stats.hp);
    pokemonHpBar.attr("aria-valuenow",pokemon.currentStates.hp);
    pokemonHpBar.css("width",`${pokemon.currentStates.hp * 100 / pokemon.pokemonTypeObject.stats.hp}%` );
}

async function exitPokemon(trainerName, pokemon){
    await showMessage(`${trainerName}'s ${pokemon.pokemonTypeObject.name} exits battle !`);

    updatePokemon(trainerName, pokemon);

    const pokemonImageSelector = `[id='${trainerName}-pokemon-img']`;
    return animateCss(pokemonImageSelector, "zoomOut");
}

function checkBattleEnd(){
    // battle ends if all pokemons of a trainer1 are KO !
    if(battle.trainer1.team.every(poke => poke.ko === true)){
        // show the battle end
        showMessage("You Lost !");
        // exitPokemon(trainerName, trainerCurrentPokemon);
        return true;
    }
    if(battle.trainer2.team.every(poke => poke.ko === true)){
        showMessage("You win !");
        // exitPokemon(opponentName, opponentCurrentPokemon);
        return true;
    }
}

async function showMessage(message){
    const selector = "#message";
    console.log(message);
    $(selector).text("");

    if(skipAnimations){
        $(selector).text(message);
        return;
    }

    return new Promise(function(resolve, reject){
        let i = 0;
        let timer = setInterval(() => {
            if(i<message.length){
            $(selector).append(message.charAt(i));
            i++;
        }
    else{
            clearInterval(timer);
            resolve();
        }
    }, 50);
    });
}

async function refreshBattle(){
    updatePokemon(trainerName, trainerCurrentPokemon);
    updatePokemon(opponentName, opponentCurrentPokemon);

    if(checkBattleEnd()){
        return;
    }

    let firstAliveTrainerPokemon = battle.trainer1.team.find(poke => poke.alive === true);
    let firstAliveOpponentPokemon = battle.trainer2.team.find(poke => poke.alive === true);

    if(firstAliveTrainerPokemon.id !== trainerCurrentPokemon.id){
        // first alive pokemon changed !
        // means that the pokemon has changed (change action, or KO !)
        await showMessage(`${trainerName}'s ${trainerCurrentPokemon.pokemonTypeObject.name} is KO !`);
        await exitPokemon(trainerName, trainerCurrentPokemon);
        trainerCurrentPokemon = firstAliveTrainerPokemon;
        await enterPokemon(trainerName, trainerCurrentPokemon, false);
    }

    if(firstAliveOpponentPokemon.id !== opponentCurrentPokemon.id){
        // first alive pokemon changed !
        // means that the pokemon has changed (change action, or KO !)
        await showMessage(`${opponentName}'s ${opponentCurrentPokemon.pokemonTypeObject.name} is KO !`);
        await exitPokemon(opponentName, opponentCurrentPokemon);
        opponentCurrentPokemon = firstAliveOpponentPokemon;
        await enterPokemon(opponentName, opponentCurrentPokemon, true);
    }
    trainerCurrentPokemon = firstAliveTrainerPokemon;
    opponentCurrentPokemon = firstAliveOpponentPokemon;

    updateControls();

    if(battle.trainer2.nextTurn){
        // wait a bit, then execute an IA turn if necessary
        setTimeout(() => {
            iaTurn();
    }, 1000);
    }
}

async function iaTurn(){
    await showMessage(`${opponentCurrentPokemon.pokemonTypeObject.name} attacks !`);
    await sendAttack(opponentName);
    await animateAttack(opponentName, trainerName);
    refreshBattle();
}

function updateControls(){
    // check if player's turn
    const playersTurn = battle.trainer1.nextTurn;

    if(playersTurn){
        enableControls();
    }
    else{
        disableControls();
    }
}

function enableControls(){
    $("#attack-btn").removeAttr("disabled");
}

function disableControls(){
    $("#attack-btn").attr("disabled","disabled");
}

async function playerCommand(command){
    disableControls();
    if("ATTACK" === command){
        await showMessage(`${trainerCurrentPokemon.pokemonTypeObject.name} attacks !`);
        await sendAttack(trainerName);
        await animateAttack(trainerName, opponentName);
    }

    refreshBattle();
}

async function animateAttack(attackingTrainer, defendingTrainer){
    console.log(`${attackingTrainer} attacks ${defendingTrainer}`);

    const attackingPokemonImageSelector = `[id='${attackingTrainer}-pokemon-img']`;
    const defendingPokemonImageSelector = `[id='${defendingTrainer}-pokemon-img']`;

    await animateCss(attackingPokemonImageSelector, "bounce");
    await animateCss(defendingPokemonImageSelector, "flash");
}

async function sendAttack(trainerName){
    const result = await $.post(`/api/battles/${battle.uuid}/${trainerName}/attack`);
    updateBattleData(result);
}

function updateBattleData(data){
    battle = data;
    trainerCurrentPokemon = battle.trainer1.team.find(poke => poke.id === trainerCurrentPokemon.id);
    opponentCurrentPokemon = battle.trainer2.team.find(poke => poke.id === opponentCurrentPokemon.id);
}

function zoomOut(element, callback){
    const node = document.querySelector(element);
    node.classList.add('animated', "zoomOut");

    function handleAnimationEnd() {
        node.removeEventListener('animationend', handleAnimationEnd);

        if (typeof callback === 'function') callback()
    }

    node.addEventListener('animationend', handleAnimationEnd)
}

async function animateCss(element, animationName){
    return new Promise(function(resolve, reject){

        if(skipAnimations){
            console.log(`skipping animation ${animationName} on ${element}`);
            return resolve();
        }

        console.log(`starting animation ${animationName} on ${element}`);

        const node = document.querySelector(element);
        node.classList.add('animated', animationName);

        function handleAnimationEnd() {
            console.log(`ended animation ${animationName} on ${element}`);

            node.classList.remove('animated', animationName);
            node.removeEventListener('animationend', handleAnimationEnd);
            return resolve();
        }

        node.addEventListener('animationend', handleAnimationEnd);
    });
}