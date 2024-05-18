import { SafeUser, UserId } from "../../../users/core/domain/User";
import { Card, generatePlayersCards, getCardValue, getEnvidoCardsValue, getRoundWinner } from "./Cards";

const MAX_POINTS = 5;

export type GameId = number;

export enum EnvidoCall {
    ENVIDO = 'ENVIDO',
    REAL_ENVIDO = 'REAL_ENVIDO',
    FALTA_ENVIDO = 'FALTA_ENVIDO',
}

export type Envido = {
    calls: EnvidoCall[];
    firstCaller: SafeUser['id'] | undefined;
    lastCaller: SafeUser['id'] | undefined;
    acceptedBy: SafeUser['id'] | undefined;
    accepted: boolean | undefined;
    waitingResponse: boolean;
    winner: SafeUser['id'] | undefined;
    playersPoints: Record<SafeUser['id'], number> | undefined;
}

export enum TrucoCall {
    TRUCO = 'TRUCO',
    RETRUCO = 'RETRUCO',
    VALE_CUATRO = 'VALE_CUATRO',
}

export type Truco = {
    call: TrucoCall;
    caller: SafeUser['id'];
}

export type GameState = {
    started: boolean;
    firstPlayer: SafeUser['id'];
    playerTurn: SafeUser['id'];
    winner: SafeUser['id'] | undefined;
    round: number;
    cards: Record<SafeUser['id'], Card[]>;
    thrownCards: Record<SafeUser['id'], Card[]>;
    trucoPoints: number;
    points: UsersPoints;
    envido: Envido;
};

export enum GameEventType {
    START = 'START',
    ENVIDO_CALL = 'ENVIDO_CALL',
    ENVIDO_ACCEPTED = 'ENVIDO_ACCEPTED',
    ENVIDO_DECLINED = 'ENVIDO_DECLINED',
    TRUCO_CALL = 'TRUCO_CALL',
    TRUCO_ACCEPT = 'TRUCO_ACCEPT',
    TRUCO_DECLINE = 'TRUCO_DECLINE',
    THROW_CARD = 'THROW_CARD',
    TO_DECK = 'TO_DECK',
    ROUND_RESULT = 'ROUND_RESULT',
    NEXT_ROUND = 'NEXT_ROUND',
    RESULT = 'RESULT',
}

export type GameEventStart = {
    type: GameEventType.START;
};

export type GameEventEnvidoCall = {
    type: GameEventType.ENVIDO_CALL;
    call: EnvidoCall;
    caller: SafeUser['id'];
};

export type GameEventEnvidoAccepted = {
    type: GameEventType.ENVIDO_ACCEPTED;
    acceptedBy: SafeUser['id'];
    points: Record<SafeUser['id'], number>;
};

export type GameEventEnvidoDeclined = {
    type: GameEventType.ENVIDO_DECLINED;
    declinedBy: SafeUser['id'];
    points: Record<SafeUser['id'], number>;
};

export type GameEventTrucoCall = {
    type: GameEventType.TRUCO_CALL;
    call: TrucoCall;
    caller: SafeUser['id'];
};

export type GameEventTrucoAccept = {
    type: GameEventType.TRUCO_ACCEPT;
    acceptedBy: SafeUser['id'];
    call: TrucoCall;
};

export type GameEventTrucoDecline = {
    type: GameEventType.TRUCO_DECLINE;
    declinedBy: SafeUser['id'];
    call: TrucoCall;
};

export type GameEventThrowCard = {
    type: GameEventType.THROW_CARD;
    playerId: SafeUser['id'];
    card: Card;
    nextPlayerId: SafeUser['id'];
};

export type GameEventToDeck = {
    type: GameEventType.TO_DECK;
    playerId: SafeUser['id'];
};

export type UsersPoints = Record<SafeUser['id'], number>;

export type GameEventRoundResult = {
    type: GameEventType.ROUND_RESULT;
    winner: SafeUser['id'];
    points: UsersPoints;
};

export type GameEventNextRound = {
    type: GameEventType.NEXT_ROUND;
    cards: Record<SafeUser['id'], Card[]>;
    round: number;
    nextPlayerId: SafeUser['id'];
};

export type GameEventResult = {
    type: GameEventType.RESULT;
    winner: SafeUser['id'];
    points: UsersPoints;
};

export type GameEvent = GameEventStart
    | GameEventEnvidoCall
    | GameEventEnvidoAccepted
    | GameEventEnvidoDeclined
    | GameEventTrucoCall
    | GameEventTrucoAccept
    | GameEventTrucoDecline
    | GameEventThrowCard
    | GameEventToDeck
    | GameEventRoundResult
    | GameEventNextRound
    | GameEventResult;

export type GameProps = {
    id: GameId;
    name: string;
    players: SafeUser[];
    state: GameState;
    events: GameEvent[];
};

export class Game {
    readonly id: GameId;
    readonly name: string;
    readonly players: SafeUser[];
    readonly state: GameState;
    readonly events: GameEvent[] = [];

    constructor(props: GameProps) {
        this.id = props.id;
        this.name = props.name;
        this.players = props.players;
        this.state = props.state;
        this.events = props.events;
    }

    static NEW_GAME_ID = 0;

    static new(user: SafeUser): Game {
        return new Game({
            id: this.NEW_GAME_ID,
            name: user.username,
            players: [user],
            events: [],
            state: {
                started: false,
                firstPlayer: user.id,
                playerTurn: user.id,
                winner: undefined,
                round: 1,
                cards: {},
                thrownCards: {},
                trucoPoints: 1,
                points: {},
                envido: {
                    calls: [],
                    firstCaller: undefined,
                    lastCaller: undefined,
                    acceptedBy: undefined,
                    accepted: undefined,
                    winner: undefined,
                    playersPoints: undefined,
                    waitingResponse: false,
                },
            }
        });
    }

    copy(props: Partial<GameProps>): Game {
        return new Game({
            ...this,
            ...props,
        });
    }

    canJoin(userId: UserId): boolean {
        return !this.state.started && this.players.length === 1 && this.players[0].id !== userId;
    }

    hasUser(userId: UserId): boolean {
        return this.players.some(player => player.id === userId);
    }

    join(user: SafeUser): Game {
        return this.copy({
            players: [...this.players, user],
        });
    }

    start(): Game {
        const [player1Cards, player2Cards] = generatePlayersCards();
        const points = {
            [this.players[0].id]: 0,
            [this.players[1].id]: 0,
        }
        const cards = {
            [this.players[0].id]: player1Cards,
            [this.players[1].id]: player2Cards,
        }
        const events = [...this.events, this.buildStartEvent(), this.buildNextRoundEvent(this.state.round, cards, this.state.firstPlayer)];

        return this.copy({
            events,
            state: {
                ...this.state,
                started: true,
                cards,
                points,
            },
        });
    }

    throwCard(userId: UserId, card: Card): Game {
        // it should be player turn
        if (this.state.playerTurn !== userId) {
            throw new Error('Not your turn');
        }

        if (this.isWaitingResponse()) {
            throw new Error('Waiting response');
        }

        // it should be a valid card
        if (!this.state.cards[userId].includes(card)) {
            throw new Error('Invalid card');
        }

        const updatedGame = this.copy({
            state: {
                ...this.state,
                cards: {
                    ...this.state.cards,
                    [userId]: this.state.cards[userId].filter(c => c !== card),
                },
                thrownCards: {
                    ...this.state.thrownCards,
                    [userId]: [...(this.state.thrownCards[userId] || []), card],
                },
            },
        }).setNextTurnPlayer();

        const throwCardEvent = this.buildThrowCardEvent(userId, card, updatedGame.state.playerTurn);


        return updatedGame.copy({
            events: [...this.events, throwCardEvent],
        }).withRoundWinnerValidation();
    }

    envido(userId: UserId, call: EnvidoCall): Game {
        if (this.state.playerTurn !== userId) {
            throw new Error('Not your turn');
        }

        if (this.step() !== 1) {
            throw new Error('Invalid step');
        }

        const envido = this.state.envido;

        if (!this.isValidEnvidoCall(call)) {
            throw new Error('Invalid envido call');
        }

        const newEnvido: Envido = {
            calls: [...envido.calls, call],
            firstCaller: envido.firstCaller || userId,
            lastCaller: userId,
            acceptedBy: undefined,
            accepted: undefined,
            winner: undefined,
            playersPoints: undefined,
            waitingResponse: true,
        };

        const envidoCallEvent: GameEventEnvidoCall = {
            type: GameEventType.ENVIDO_CALL,
            call,
            caller: userId,
        };

        return this.copy({
            events: [...this.events, envidoCallEvent],
            state: {
                ...this.state,
                envido: newEnvido,
                playerTurn: this.players.find(player => player.id !== userId)!.id,

            },
        });
    }

    answerEnvido(userId: UserId, accepted: boolean): Game {
        if (this.state.playerTurn !== userId) {
            throw new Error('Not your turn');
        }

        if (this.step() !== 1) {
            throw new Error('Invalid step');
        }

        const envido = this.state.envido;

        if (!envido.waitingResponse) {
            throw new Error('Not waiting response');
        }

        const { winner, playersPoints } = this.analyzeEnvido(userId, accepted);

        const newEnvido: Envido = {
            calls: envido.calls,
            firstCaller: envido.firstCaller,
            lastCaller: envido.lastCaller,
            acceptedBy: userId,
            accepted,
            winner,
            playersPoints,
            waitingResponse: false,
        };

        const points = {
            [this.players[0].id]: this.state.points[this.players[0].id] + playersPoints[this.players[0].id],
            [this.players[1].id]: this.state.points[this.players[1].id] + playersPoints[this.players[1].id],
        }

        const envidoEvent: GameEventEnvidoAccepted | GameEventEnvidoDeclined = accepted
            ? {
                type: GameEventType.ENVIDO_ACCEPTED,
                acceptedBy: userId,
                points,
            }
            : {
                type: GameEventType.ENVIDO_DECLINED,
                declinedBy: userId,
                points,
            };

        const game = this.copy({
            events: [...this.events, envidoEvent],
            state: {
                ...this.state,
                envido: newEnvido,
                playerTurn: newEnvido.firstCaller!!,
                points,
            },
        });

        const gameWithWinnerAnalysis = game.withWinnerResult();

        return gameWithWinnerAnalysis || game;
    }

    analyzeEnvido(userId: UserId, accepted: boolean): { winner: SafeUser['id'], playersPoints: Record<SafeUser['id'], number> } {
        const envido = this.state.envido;

        if (!accepted) {
            return {
                winner: envido.lastCaller!,
                playersPoints: {
                    [envido.lastCaller!]: envido.calls.length,
                    [userId]: 0,
                },
            };
        }

        const player1EnvidoPoints = getEnvidoCardsValue([...this.state.cards[this.players[0].id], ...this.state.thrownCards[this.players[0].id] || []]);
        const player2EnvidoPoints = getEnvidoCardsValue([...this.state.cards[this.players[1].id], ...this.state.thrownCards[this.players[1].id] || []]);

        const winner = player1EnvidoPoints === player2EnvidoPoints
            ? this.state.firstPlayer
            : player1EnvidoPoints > player2EnvidoPoints
                ? this.players[0].id
                : this.players[1].id;

        return {
            winner,
            playersPoints: {
                [winner]: this.getEnvidoPoints(winner),
                [this.players.find(player => player.id !== winner)!.id]: 0,
            },
        };
    }

    getEnvidoPoints(winner: UserId): number {
        let points = 0;

        for (const call of this.state.envido.calls) {
            switch (call) {
                case EnvidoCall.ENVIDO:
                    points += 2;
                    break;
                case EnvidoCall.REAL_ENVIDO:
                    points += 3;
                    break;
                case EnvidoCall.FALTA_ENVIDO:
                    const otherPoints = this.state.points[this.players.find(player => player.id !== winner)!.id];
                    if (otherPoints < 15) {
                        points += MAX_POINTS;
                    } else {
                        points += 30 - otherPoints;
                    }
                    break;
            }
        }

        return points;
    }

    isValidEnvidoCall(call: EnvidoCall): boolean {
        const calls = this.state.envido.calls;

        if (calls.length === 0) {
            return true;
        }

        const lastCall = calls[calls.length - 1];

        switch (lastCall) {
            case EnvidoCall.ENVIDO:
                return call === EnvidoCall.ENVIDO && calls.length === 1
                    || call === EnvidoCall.REAL_ENVIDO
                    || call === EnvidoCall.FALTA_ENVIDO;
            case EnvidoCall.REAL_ENVIDO:
                return call === EnvidoCall.FALTA_ENVIDO;
            case EnvidoCall.FALTA_ENVIDO:
                return false;
        }
    }

    goToDeck(userId: UserId): Game {
        if (this.state.playerTurn !== userId) {
            throw new Error('Not your turn');
        }

        if (this.isWaitingResponse()) {
            throw new Error('Waiting response');
        }

        const winner = this.players.find(player => player.id !== userId)!.id;

        const toDeckEvent = this.buildToDeckEvent(userId);

        return this.copy({
            events: [...this.events, toDeckEvent],
        }).setRoundWinner(winner);
    }

    withRoundWinnerValidation(): Game {
        const winner = getRoundWinner(this.getPlayersIds(), this.state.thrownCards);
        if (winner === undefined) return this;
        return this.setRoundWinner(winner);
    }

    isWaitingResponse(): boolean {
        return this.state.envido.waitingResponse;
    }

    setRoundWinner(winner: SafeUser['id']): Game {
        const extraPoints = this.state.trucoPoints;

        const points = {
            ...this.state.points,
            [winner]: this.state.points[winner] + extraPoints,
        };

        const roundResultEvent = this.buildRoundResultEvent(winner, points);

        const game = this.copy({
            events: [...this.events, roundResultEvent],
            state: {
                ...this.state,
                points,
            },
        });

        return game.withNextRoundOrWin();
    }

    withNextRoundOrWin(): Game {
        const game = this.withWinnerResult();
        if (game) return game;

        const [player1Cards, player2Cards] = generatePlayersCards();
        const cards = {
            [this.players[0].id]: player1Cards,
            [this.players[1].id]: player2Cards,
        }
        const round = this.state.round + 1;

        const firstPlayer = this.state.firstPlayer === this.players[0].id ? this.players[1].id : this.players[0].id;

        const nextRoundEvent = this.buildNextRoundEvent(round, cards, firstPlayer);

        return this.copy({
            events: [...this.events, nextRoundEvent],
            state: {
                started: true,
                winner: undefined,
                round,
                cards,
                firstPlayer,
                thrownCards: {},
                playerTurn: firstPlayer,
                trucoPoints: 1,
                points: this.state.points,
                envido: {
                    calls: [],
                    firstCaller: undefined,
                    lastCaller: undefined,
                    acceptedBy: undefined,
                    accepted: undefined,
                    winner: undefined,
                    playersPoints: undefined,
                    waitingResponse: false,
                },
            },
        });
    }

    withWinnerResult(): Game | undefined {
        if (this.state.points[this.players[0].id] >= MAX_POINTS || this.state.points[this.players[1].id] >= MAX_POINTS) {
            const winner = this.state.points[this.players[0].id] >= this.state.points[this.players[0].id] ? this.players[0].id : this.players[1].id;

            const gameResultEvent = this.buildResultEvent(winner, this.state.points);

            return this.copy({
                events: [...this.events, gameResultEvent],
                state: {
                    ...this.state,
                    winner,
                },
            });
        }

        return undefined;
    }

    getNewEvents(oldGame: Game): GameEvent[] {
        return this.events.slice(oldGame.events.length);
    }

    buildStartEvent(): GameEventStart {
        return {
            type: GameEventType.START,
        };
    }

    buildNextRoundEvent(round: number, cards: Record<SafeUser['id'], Card[]>, nextPlayerId: SafeUser['id']): GameEventNextRound {
        return {
            type: GameEventType.NEXT_ROUND,
            round,
            cards,
            nextPlayerId,
        };
    }

    buildThrowCardEvent(playerId: SafeUser['id'], card: Card, nextPlayerId: SafeUser['id']): GameEventThrowCard {
        return {
            type: GameEventType.THROW_CARD,
            playerId,
            card,
            nextPlayerId,
        };
    }

    buildRoundResultEvent(winner: SafeUser['id'], points: UsersPoints): GameEventRoundResult {
        return {
            type: GameEventType.ROUND_RESULT,
            winner,
            points,
        };
    }

    buildResultEvent(winner: SafeUser['id'], points: UsersPoints): GameEventResult {
        return {
            type: GameEventType.RESULT,
            winner,
            points,
        };
    }

    buildToDeckEvent(playerId: SafeUser['id']): GameEventToDeck {
        return {
            type: GameEventType.TO_DECK,
            playerId,
        };
    }

    getPlayersIds(): UserId[] {
        return this.players.map(player => player.id);
    }

    step(): 1 | 2 | 3 {
        const player1ThrownCards = this.state.thrownCards[this.players[0].id] || [];
        const player2ThrownCards = this.state.thrownCards[this.players[1].id] || [];

        const thrownCards = player1ThrownCards.length < player2ThrownCards.length ? player1ThrownCards : player2ThrownCards;

        return thrownCards.length + 1 as 1 | 2 | 3;
    }

    setNextTurnPlayer(): Game {
        const player1ThrownCards = this.state.thrownCards[this.players[0].id] || [];
        const player2ThrownCards = this.state.thrownCards[this.players[1].id] || [];

        if (player1ThrownCards.length === player2ThrownCards.length) {
            const player1LastCardValue = getCardValue(player1ThrownCards[player1ThrownCards.length - 1]);
            const player2LastCardValue = getCardValue(player2ThrownCards[player2ThrownCards.length - 1]);

            return this.copy({
                state: {
                    ...this.state,
                    playerTurn: player1LastCardValue === player2LastCardValue
                        ? this.state.playerTurn === this.players[0].id ? this.players[1].id : this.players[0].id
                        : player1LastCardValue > player2LastCardValue ? this.players[0].id : this.players[1].id,
                },
            });
        }

        return this.copy({
            state: {
                ...this.state,
                playerTurn: player1ThrownCards.length < player2ThrownCards.length ? this.players[0].id : this.players[1].id,
            },
        });
    }
}
