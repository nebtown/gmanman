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
- Add SpawningPool support to existing games

# Dev Guide

## Adding support for a new Game

1. Create a GameTypeManager in `./game-api/src/games/` (usually one that extends `GenericDockerManager`), setting up at minimum `getPlayers()`, ideally using Gamedig.
2. Create a `./game-setups/gametype/docker-compose.yml`, which uses Env vars specified in `GameTypeManager.setupInstanceFiles()`, including `API_ID`, `API_NAME`, `GAMEPASSWORD`, `SAVENAME`, `GAMEPORT`, `RCONPORT`. Valheim is a good example of this.
