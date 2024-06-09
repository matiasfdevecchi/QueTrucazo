import { UserId } from "../../../users/core/domain/User";
import { Game } from "../domain/Game";
import { GameNotifier, gameNotifier } from "../domain/GameNotifier";
import { GameService, gameService } from "../domain/GameService";

export class NoPlayAgain {
    constructor(private gameService: GameService, private gameNotifier: GameNotifier) { }

    public async invoke(id: Game['id'], userId: UserId): Promise<void> {
        const game = await this.gameService.getUserGame(id, userId);
        const updatedGame = game.noPlayAgain(userId);
        const savedGame = await this.gameService.update(updatedGame);
        const newEvents = savedGame.getNewEvents(game);
        this.gameNotifier.notifyNewEvents(savedGame.getPlayersIds(), newEvents);
    }
}

export const noPlayAgain = new NoPlayAgain(gameService, gameNotifier);