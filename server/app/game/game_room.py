class GameRoom:

    def __init__(self, room_id: str):
        self.room_id = room_id

        self.players = []

        self.current_problem = None
        self.current_round = 0
        self.score = {}

        self.started = False

    def add_player(self, player):
        self.players.append(player)

    def remove_player(self, player):
        if player in self.players:
            self.players.remove(player)