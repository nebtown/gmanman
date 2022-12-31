# Gmanman: Game Server Manager

## Features:

- Game Server Support:
  - Minecraft
  - Space Engineers
  - Ark
  - Factorio
  - Garry's Mod
  - Barotrauma
  - Project Zomboid
  - Kerbal Space Program
  - Valheim
- Start server button (launches a Docker container)
  - stop server, disabled if numPlayers > 0, unless admin override
- Show status + player count
- Show logs
- Add/Disable Mods
  - with search
- Modpack Generation (a 7z you can hand to clients)
- create/load saves/backups
- Google Auth

## Todo:

- auto save/backup
- chat
- EditCard.js can probably derive the list of games that support SpawningPool from Gateway, who can learn it based on gameApis reporting the feature
- Add SpawningPool support to existing games

# Dev Guide

## Adding support for a new Game

1. Create a new `./game-api/src/games/` manager, extending either `GenericDockerManager` or `BaseGameManager`
2. Add to `./ui/src/components/EditCard.js`'s `gameApiOptions`
