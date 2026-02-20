const {createApp, ref, component, computed} = Vue;

const socket=io("http://localhost:8080")

const getRelativePosition=(currentPlayer, targetPlayer)=>{
    const diff=((currentPlayer-targetPlayer)%4+4)%4; 
    const relativePosition=[
        "bottom", 
        "left",
        "top",
        "right"
    ]
    return relativePosition[diff]
} 

const positionConfig={
    "container":{
    "bottom": "absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3",
    "right": "absolute right-12 top-1/2 -translate-y-1/2 flex gap-2 -rotate-90",
    "top": "absolute top-8 left-1/2 -translate-x-1/2 flex gap-2", 
    "left": "absolute left-12 top-1/2 -translate-y-1/2 flex gap-2 rotate-90", 
},
"card":{
    "bottom": "w-[84px] h-[124px] pixel-art shadow-2xl rounded cursor-pointer transitin-all duration-100 hover:-translate-y-5",
    "right": "w-[63px] h-[93px] pixel-art shadow-2xl rounded",
    "top": "w-[63px] h-[93px] pixel-art shadow-2xl rounded", 
    "left": "w-[63px] h-[93px] pixel-art shadow-2xl rounded", 
},
"discard-stack-card":{
    "bottom": "absolute bottom-[12rem] left-1/2 -translate-x-1/2 -rotate-[5deg]",
    "right": "absolute right-[38%] top-1/2 -translate-y-1/2 rotate-[80deg]",
    "top": "absolute top-[12rem] left-1/2 -translate-x-1/2 rotate-[12deg]", 
    "left": "absolute left-[38%] top-1/2 -translate-y-1/2 rotate-[85deg]", 
}, 
"player-stack": { 
    "bottom": "absolute bottom-32 right-[32.5%] -translate-x-1/2",
    "right": "absolute right-48 top-1/4 -translate-y-1/2 -rotate-90",
}
}

const app=createApp({
    setup() {
        const room=ref(1);
        console.log("conectando com o servidor...");
        socket.emit('join_room', {'room': room.value});
        const playersDeckSize=ref([0,0,0,0]);
        const trunfoCard=ref("");   
        const deckSize=ref(40); 
        const playerDeck=ref([]);
        const ownTeamScore=ref({"regional": 0, "global": 0});
        const opponentTeamScore=ref({"regional": 0, "global": 0});
        const tableDeck=ref([]);
        const currentPlayer=ref(0);
        const id=ref(0);
        const playedCards=ref([0,0]);
        const isHost=ref(false);
        const gameStarded=ref(false);
        const mainDeckSize=computed(()=>Math.max(deckSize.value-1,0)); 
        const endGame=ref(false); 
        const winners=ref([-1,-1]); 
        socket.on('inital-data', data => {
            console.log("conectado na sala", room.value);
            console.log("conectado com id =", data["id"]); 
            id.value=data["id"];
            isHost.value=data["is_host"];
            gameStarded.value=data["game_starded"];
        });

        socket.on('get-game-state', data=>{
            ownTeamScore.value["regional"]=data["team_score"][id.value%2];
            opponentTeamScore.value["regional"]=data["team_score"][(id.value+1)%2];
            ownTeamScore.value["global"]=data["global_score"][id.value%2];
            opponentTeamScore.value["global"]=data["global_score"][(id.value+1)%2];
            playerDeck.value=data["players"][id.value];
            for(let player=0; player<=3;player++)
                playersDeckSize.value[player]=data["players"][player].length;
            trunfoCard.value=data["trunfo_card"]["id"];
            currentPlayer.value=data["current_player"];
            deckSize.value=data["deck"].length;
            if (deckSize.value==0)
                trunfoCard.value=""; 
            gameStarded.value=true; 
            tableDeck.value=data["table_deck"];
            playedCards.value=data["gained_cards"]; 
        });

        socket.on('play-card', data=>{
            console.log(`carta ${data['card']} jogada`);
            tableDeck.value.push({"id": data['card'], "player": currentPlayer.value});
            playersDeckSize.value[currentPlayer.value]--;
            currentPlayer.value=data['next_player']; 
        });

        socket.on('player-play-card', card=>{
            for(let cardIdx=0; cardIdx<playerDeck.value.length; cardIdx++){
                if(playerDeck.value[cardIdx]['id']===card){
                    playerDeck.value.splice(cardIdx, 1);
                    break;
                }
            }
        });

        socket.on('trade', data=>{
            if (data["player_id"]===id.value){
                for(let cardIdx=0;cardIdx<playerDeck.value.length;cardIdx++){
                    if (playerDeck.value[cardIdx]['id']===data['new_trunfo_card']['id']){
                        playerDeck.value[cardIdx]=data['old_trunfo_card'];
                        break;
                    }
                }
            }
            trunfoCard.value=data['new_trunfo_card']['id'];
        });

        socket.on('end-hand', data=>{
            setTimeout(()=>{
            tableDeck.value=data["table_deck"];
            deckSize.value=data['deck'].length;
            if (deckSize.value==0)
                trunfoCard.value=""; 
            playedCards.value=data["gained_cards"];
            ownTeamScore.value["regional"]=data["team_score"][id.value%2];
            opponentTeamScore.value["regional"]=data["team_score"][(id.value+1)%2];
            for(let player=0;player<=3;player++)
                playersDeckSize.value[player]=data["players"][player].length;
            playerDeck.value=data['players'][id.value]=data['players'][id.value];

            },500)
        });

        socket.on("end-round", data=>{
            console.log("round finalizado!", data);
            setTimeout(()=>{
                socket.emit('end_round', room.value); 
            },1000);
        });

        socket.on('end-game', data=>{
            console.log("Fim de jogo!\nvencedores:", data);
            winners.value=data; 
            endGame.value=true;
            tableDeck.value=[]; 
            socket.emit('finish_game', room.value);
            gameStarded.value=false; 
        });

        const startGame=()=>{
            console.log("iniciando jogo..."); 
            endGame.value=false;
            socket.emit('start_game', room.value);
        }

        const playCard=(cardIdx)=>{
            if (currentPlayer.value!=id.value) return;
            const card=playerDeck.value[cardIdx];
            const data={
                "room": room.value,
                "player_id": id.value,
                "card": card
            };
            socket.emit('play_card', data); 
        }

        return {room, id, trunfoCard, deckSize, playerDeck, ownTeamScore, opponentTeamScore, tableDeck, currentPlayer,
               playersDeckSize, playedCards, isHost, gameStarded, mainDeckSize, endGame, winners, startGame,  playCard}
    }
});

app.component("deck",{
    props:{
        deckSize: {
            type: Number,
            required: true
        }
    },
    setup(props) {
        const visibleCards=computed(()=>Math.min(props.deckSize,8)); 
        const depthGrowthValue=computed(()=>{
          if(visibleCards.value==0) return 0;
          return props.deckSize/visibleCards.value;
        });
        const opacityGrowthValue = computed(()=> visibleCards.value==0 ? 0 : 0.4/visibleCards.value); 
        return {visibleCards, opacityGrowthValue, depthGrowthValue}
    },
    template: `
    <div class="relative w-[63px] h-[93px]">
     <img 
      v-for="card in visibleCards"
      :key="card"
      src="/static/assets/cards/CardBack_v12.png"
        class="absolute w-[63px] h-[93px] pixel-art"
        :style="{
        transform: 'translate('+ ((visibleCards-card)*0.25*depthGrowthValue) + 'px,' + ((visibleCards-card)*0.25*depthGrowthValue) + 'px)',
        zIndex: card,
        opacity: 0.6+card*opacityGrowthValue,
        }"
      />
      </div>
    `
});

app.component("main-deck", {
props: {
    deckSize: {
        type: Number, 
        required: true
    },
    trunfoCard: {
        type: String || undefined, 
        required: true
    }
},
template: `
<div class="absolute left-[30%] top-[23%]">
<div class="relative inline-block"> 
<deck :deck-size="deckSize"></deck>
<img 
v-if=" trunfoCard!=='' "
:src="'static/assets/cards/'+trunfoCard+'.png'"
class="absolute left-8 -bottom-2 rotate-[80deg] w-[63px] h-[93px] shadow-2xl rounded pixel-art"
</div>
</div>
`
});

app.component("discart-stack",{
props:{
deck: {
type: Array,
required: true
},
playerId: {
    type: Number,
    required: true
}
},
setup(props){
const difStyleArray=computed(()=>{
    let dif=[];
    const positionStyle=positionConfig["discard-stack-card"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(positionStyle[relativePosition]); 
}
    return dif; 
});
return {difStyleArray};
},
template: `
<div class="w-full h-full">
<img v-for="(card,index) in deck"
    :key="index"
    :src="'static/assets/cards/'+card['id']+'.png'"
    :class="'w-[84px] h-[124px] pixel-art shadow-2xl rounded ' + difStyleArray[card['player']]"
/>
</div>
`
});

app.component("players-deck",{
props: {
    playerId: {
        type: Number, 
        required: true
    }, 
    playersDeckSize: {
        type: Array,
        required: true
    },
    playerDeck: {
        type: Array, 
        required: true
    }
},
setup(props, {emit}){
const difCardStyle=computed(()=>{
    let dif=[];
    const cardStyle=positionConfig["card"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(cardStyle[relativePosition]); 
}
    return dif; 
});

const difContainerStyle=computed(()=>{
    let dif=[];
    const containerStyle=positionConfig["container"];
    for(let id=0;id<=3;id++){
        let relativePosition=getRelativePosition(props.playerId, id); 
        dif.push(containerStyle[relativePosition]); 
}
    return dif; 
});

const playersDeck=computed(()=>{
  const deck=[[],[],[],[]]; 
  for (let id=0; id<=3;id++){
    if(id===props.playerId){
    for (const card of props.playerDeck){
        deck[id].push("static/assets/cards/"+card["id"]+".png");
    }
    }else{
        for(let card=1;card<=props.playersDeckSize[id]; card++){
            deck[id].push("static/assets/cards/CardBack_v12.png");
        }
    }
  }
  return deck;
}); 
const playCard=(card)=>{
emit('playCard', card);
}
const ids=[0,1,2,3];
return {difCardStyle,difContainerStyle,playersDeck, ids, playCard}
},
template: `
<div class="w-full h-full">
<div
v-for="id in ids"
:key="id"
:class="difContainerStyle[id]"
>
<img 
v-for="(card,index) in playersDeck[id]"
:key="index"
:src="card"
:class="difCardStyle[id]"
@click="id===playerId ? playCard(index) : null"
/>
</div>
</div>
`
});

app.component("scoreboard",{
props: {
ownTeamScore: {
type: Number, 
required: true 
},
opponentTeamScore: {
type: Number, 
required: true 
}
},
template: `
<div class="h-full w-full"> 
    <div class="fixed top-8 left-36 border-4 border-double bg-stone-900 border-orange-500 bg-gr-500 rounded-lg p-3 shadow-lg  w-40 flex-col">
        <p class="text-emerald-400 font-bold">Seu time: ((ownTeamScore))</p>
        <hr class="border-t-2 border-yellow-700 my-2"/>
        <p class="text-red-400 font-bold">Adversários: ((opponentTeamScore))</p>
    </div>
</div>
`
});

app.component("players-stack", {
props: {
    playerId: {
        type: Number,
        required: true
    },
playedCards: {
    type: Array, 
    required: true
},
ownTeamScore: {
    type: Number,
    required: true 
},
opponentTeamScore: {
    type: Number,
    required: true 
}
}, 
setup(props){
    const playerTeam=props.playerId%2;
const difStyleArray=computed(()=>{
let dif=[];
    const stackStyle=positionConfig["player-stack"];
    for(let team=0; team<=1; team++){
        let relativePosition=team==playerTeam ? "bottom" : "right"; 
        dif.push(stackStyle[relativePosition]); 
}
    return dif; 
});
const score=computed(()=>{
return [
    playerTeam==0 ? props.ownTeamScore : props.opponentTeamScore,
    playerTeam==1 ? props.ownTeamScore : props.opponentTeamScore,
]
});
return {difStyleArray,score}
},
template: `
<div class="h-full w-full">
<div 
v-for="(deckSize,index) in playedCards"
:key="index"
:class="difStyleArray[index]"
>
<div class="relative inline-block">
<deck :deck-size="deckSize"></deck>
<p v-if="deckSize!==0" class="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-black/15  text-white tracking-tight text-[0.9rem] drop-shadow-[0_3px_0px_rgba(0,0,0,1)] font-bold">
((score[index]))
</p>
</div>
</div>
</div>
`
}); 

app.config.compilerOptions.delimiters = ['((', '))']
app.mount('#app');

