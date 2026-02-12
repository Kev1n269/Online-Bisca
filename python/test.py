from bisca_logic import game
from bots import easy_bot, medium_bot, hard_bot
print("Iniciando jogo...")
bisca=game()

def print_hand(player):
    for card in bisca.players[player]:
        print(f"{card["number"]}{card["naipe"]}", end=", ")
    print()

def transform(naipe):
    if naipe=='c':
        return '♥'
    if naipe=='p':
        return '♣'
    if naipe=='o':
        return '♦'
    if naipe=='e':
        return '♠'
    return naipe

for i in range(1,5):
    print(f"Mão do jogador {i}", end=": ")
    print_hand(i-1)

players_type=["player","easy-bot","easy-bot","easy-bot"]

while True: 
    print(f"Jogador {bisca.current_player_number+1} joga")
    print("mão do jogador atual", end=": ")
    print_hand(bisca.current_player_number)
    print("Mesa",end=": ")
    for card in bisca.table_deck:
        print(f"{card["number"]}{card["naipe"]}", end=", ")
    print()
    print("trunfo:",bisca.trunfo)
    this_type=players_type[bisca.current_player_number]
    if this_type=="easy-bot":
        card=easy_bot(bisca.players[bisca.current_player_number])
        number,naipe=card["number"], card["naipe"]
    elif this_type=="medium-bot":
        card=medium_bot(bisca.players[bisca.current_player_number], bisca.table_deck, bisca.trunfo)
        number,naipe=card["number"], card["naipe"]
    elif this_type=="hard-bot":
        card=hard_bot()
        bisca.players[bisca.current_player_number]
        number,naipe=card["number"], card["naipe"]
    elif this_type=="player":
        try: 
            card_number=int(input("Escolha sua carta: "))-1
            player=bisca.players[bisca.current_player_number][card_number]
            number,naipe=player["number"],transform(player["naipe"])
        except KeyboardInterrupt:
            quit()
        except:
            print("erro: número inválido")
            continue 

    try:
        output=bisca.play_card({"number": number, "naipe": naipe})
        if output:
            output_type, players=output
            if output_type=="fim de jogo":
                print(f"Fim de jogo!\n jogadores {players[0]} e {players[1]} ganharam!")
                print("placar final: ")
                print("time 1:",bisca.global_score[0])
                print("time 2:",bisca.global_score[1])
                break
            elif output_type=="fim da rodada":
                print("Fim da rodada!")
                print("placar atual:")
                print("time 1:",players[0])
                print("time 2:",players[1])
            elif output_type=="fim da mao": 
                print("Pontuação dos times nessa rodada:")
                print("time 1:",players[0])
                print("time 2:",players[1])
            elif output_type=="troca com 2":
                print(f"2{bisca.trunfo} foi trocado por {bisca.trunfo_card["number"]}{bisca.trunfo_card["naipe"]}")
    except ValueError as e:
        print("erro:", e)