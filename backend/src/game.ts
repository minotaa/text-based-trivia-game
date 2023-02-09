import { Player } from "src"

// im gonna prototype this while ur working on frontend stuff

// im gonna use oop for now

interface GameObject {
    character: string,
    isSolid: boolean,
    onTick(): void,
    onCollide(other: GameObject): void,         // Collisions with solid objects, called during position updates
    onTrigger(other: GameObject): void,         // Intersects with non solid objects, called during tick updates
    onTriggerEnter(other: GameObject): void,    // Called during position updates
    onTriggerExit(other: GameObject): void      // Called during position updates

}

interface GameTile extends GameObject {
}

interface GameEntity extends GameObject {
    position: {x: number, y: number}
}

interface PlayerEntity extends GameEntity {
    player: Player
    items: any[] // Later
}

function replaceAt(orginal: string, index: number, char: string) {
    return orginal.substring(0, index) + char + orginal.substring(index + char.length);
}

export class Dungeon {
    tiles: GameTile[][] = []
    entities: GameEntity[] = []
    width: number
    height: number

    constructor (width: number, height: number) {
        this.width = width
        this.height = height
        this.generate(width, height)
        // I don't know a better way to implement this lol
        setInterval(() => this.tick(), 34)
    }

    tick() {
        this.tiles.forEach((column) => column.forEach((tile) => {
            tile.onTick()
        }))

        this.entities.forEach((entity) => {
            entity.onTick()
            entity.onTrigger(this.tiles[entity.position.x][entity.position.y])
            this.tiles[entity.position.x][entity.position.y].onTrigger(entity)
            // Declining sanity of Valve developers
            // I'm starting to realize how inefficient this is... too bad!
            this.entities.forEach((o) => {
                if (o.position.x === entity.position.x && o.position.y === entity.position.y) {
                    entity.onTrigger(o)
                }
            })
        })
    }

    generate(width: number, height: number) {
        for (let w = 0; w < width; w++) {
            const column: GameTile[] = []
            for (let h = 0; h < height; h++) {
                column.push({character: " ", isSolid: false, onTick: () => {}, onCollide: () => {}, onTrigger: () => {}, onTriggerEnter: () => {}, onTriggerExit: () => {}})
            }
            this.tiles.push(column)
        }
    }

    getText() {
        let output = ""
        for (let h = 0; h < this.height; h++) {
            for (let w = 0; w < this.width; w++) {
                output += this.tiles[w][h]
            }
            output += "\n"
        }
        this.entities.forEach((obj) => output = replaceAt(output, obj.position.y * (this.height + 1) + obj.position.x, obj.character))
        return output
    }

    updateEntityPosition(obj: GameEntity, x: number, y: number) {
        if (obj.position.x === x && obj.position.y === y) return false

        if (this.tiles[x][y].isSolid) {
            obj.onCollide(this.tiles[x][y])
            this.tiles[x][y].onCollide(obj)
            return false
        }
        this.entities.forEach((o) => {
            if (o.isSolid && o.position.x === x && o.position.y === y) {
                obj.onCollide(this.tiles[x][y])
                o.onCollide(obj)
                return false
            }
        })

        obj.onTriggerExit(this.tiles[obj.position.x][obj.position.y])
        this.tiles[obj.position.x][obj.position.y].onTriggerExit(obj)
        this.entities.forEach((o) => {
            if (o.position.x === obj.position.x && o.position.y === obj.position.y) {
                obj.onTriggerExit(obj)
                o.onTriggerExit(obj)
            }
        })

        obj.position = {x, y}

        obj.onTriggerEnter(this.tiles[x][y])
        this.tiles[x][y].onTriggerEnter(obj)
        this.entities.forEach((o) => {
            if (o.position.x === x && o.position.y === y) {
                obj.onTriggerEnter(obj)
                o.onTriggerEnter(obj)
            }
        })

        return true
    }
}