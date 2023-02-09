import express from 'express'
import 'dotenv/config'
import WebSocket, { WebSocketServer } from 'ws'
import { v4 } from 'uuid'
import { Dungeon } from './game'

interface Game {
  id: string,
  invite: string,
  players: Player[],
  created: number,
  owner: Player,
  dungeon: Dungeon | undefined
}

export interface Player {
  id: string,
  name: string
}

const port = process.env.SERVER_PORT as any || 8080
const wss = new WebSocketServer({ port: port })
const clients: Map<WebSocket.WebSocket, Player> = new Map()
var games: Game[] = []

function generateInvite() {
  var result = ''
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  var charactersLength = characters.length
  for (var i = 0; i < 4; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function removeFromArray<T>(array: Array<T>, item: T) {
  const arr = array
  const index = arr.indexOf(item)
  if (index > -1) {
    arr.splice(index, 1)
  }
  return arr
}

function getClientFromId(map: Map<any,any>, searchValue: any) {
  for (let [key, value] of map.entries()) {
    if (value === searchValue)
      return key;
  }
}

wss.on('connection', (ws) => {
  const id = v4()
  const player = {
    id: id,
    name: "Player"
  }
  clients.set(ws, player)

  ws.send(JSON.stringify({
    id: id,
    action: "REGISTER_GAME"
  }))
  console.log(`Player with id ${id} registered.`)

  ws.on('message', (msg) => {
    try {
      // Set players name when they create/join a game.
      const data = JSON.parse(msg as any)
      const id = (clients.get(ws) as Player).id
      if (data.action == "CREATE") {
        for (const game of games) {
          if (game.players.includes(clients.get(ws) as Player)) {
            return ws.send(JSON.stringify({
              error: `You're already in a game.`,
              game: game
            }))
          }
        }
        const game = {
          id: v4(),
          invite: generateInvite(),
          players: [clients.get(ws) as Player],
          created: Date.now(),
          owner: clients.get(ws) as Player,
          dungeon: undefined
        }
        games.push(game)
        const message = {
          action: "CREATION",
          game: game
        }
        ws.send(JSON.stringify(message))
        console.log(`Creating game with invite ${game.invite} by ${game.owner.id}.`)
      } else if (data.action == "START_GAME") {
        let g
        for (const game of games) {
          if (game.owner === clients.get(ws) as Player) {
            g = game
          }
        }
        if (g == null) {
          return ws.send(JSON.stringify({
            error: 'You are not the owner of this game or you are not in a game'
          }))
        }
        //g.dungeon!!.getText()
      } else if (data.action == "JOIN") {
        if (data.invite == null) {
          return ws.send(JSON.stringify({
            error: 'Invalid invite'
          }))
        }
        console.log(`Receiving invite ${data.invite} from ${(clients.get(ws) as Player).id}`)
        if ((data.invite as string).length != 4) {
          return ws.send(JSON.stringify({
            error: 'Invalid amount of characters.'
          }))
        }
        for (const game of games) {
          if (game.players.includes(clients.get(ws) as Player)) {
            return ws.send(JSON.stringify({
              error: `You're already in a game.`,
              game: game
            }))
          }
        }
        let invitedGame: Game
        for (const game of games) {
          if (game.invite == data.invite) {
            invitedGame = game
            game.players.push(clients.get(ws) as Player)
            const message = {
              action: "PLAYER_JOIN",
              game: game,
              new_player: clients.get(ws)
            }
            game.players.forEach((player: any) => {
              (getClientFromId(clients, player) as WebSocket.WebSocket).send(JSON.stringify(message));
            })
            console.log(`Player with ID ${(clients.get(ws) as Player).id} joined ${game.invite}.`)
            return
          }
        }
        ws.send(JSON.stringify({
          error: 'Invalid invite.'
        }))
      } else if (data.action == "CHANGE_NAME") {
        console.log('Received a name change request'); // TODO: Make name change
        (clients.get(ws) as Player).name = data.name
        ws.send(JSON.stringify({
          action: 'NAME_CHANGED',
          new_name: data.name
        }))
      }
    } catch (e) {
      ws.send(JSON.stringify({
        error: 'Failed to receive mesage, try again.'
      }))
      console.log(e)
    }
  })

  ws.on('close', () => {
    for (const game of games) {
      if (game.players.includes(clients.get(ws) as Player) && game.players.length == 1) {
        console.log(`Removing ${game.id} from games list due to empty.`)
        games = removeFromArray(games, game)
      }
      if (game.players.includes(clients.get(ws) as Player)) {
        game.players = removeFromArray(game.players, (clients.get(ws) as Player))
        const message = { 
          action: "PLAYER_LEAVE",
          game: game,
          player: clients.get(ws)
        }
        game.players.forEach((player: any) => {
          (getClientFromId(clients, player) as WebSocket.WebSocket).send(JSON.stringify(message))
        })
        console.log(`Removed ${(clients.get(ws) as Player).id} from ${game.invite}.`)
      }
      if (game.owner == (clients.get(ws)) && game.players.length > 0) {
        game.owner = game.players[0]

        const message = {
          action: 'OWNER_CHANGE',
          game: game,
          new_owner: game.owner,
          reason: "Previous owner left the game." // Leaving in the reason so later on we can add the ability for the owner to manually transfer ownership and have the reason
                                                  // be something like "Previous owner gave you ownership."
        }
        game.players.forEach((player: any) => {
          (getClientFromId(clients, player) as WebSocket.WebSocket).send(JSON.stringify(message))
        })
      }
    }
    console.log(`Unregistering ${(clients.get(ws) as Player).id} due to them disconnecting.`)
    clients.delete(ws)
  })
})

/*

const message = {
  action: 'KICKED',
  reason: 'Owner leaving'
}

I'm leaving this here because this is a good format for when we inevitably add a kick feature
*/