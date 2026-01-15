## SpawningPool

SpawningPool auto-launches configured GameApis (if not yet running) when Gateway boots.

While Gmanman originally was designed as a decoupled set of game apis that would communicate with a Gateway server that solely orchestrated message passing, it is often more convenient to delegate GameApi launching to the Gateway server, when one is running both on the same box anyway.

### Adding a new Game type to SpawningPool

1. Create a GameTypeManager in `./game-api/src/games/` (usually one that extends `GenericDockerManager`), setting up at minimum `getPlayers()`, ideally using Gamedig.
2. Create a `./game-setups/gametype/docker-compose.yml`, which uses Env vars specified in `GameTypeManager.setupInstanceFiles()`, including `API_ID`, `API_NAME`, `GAMEPASSWORD`, `SAVENAME`, `GAMEPORT`, `RCONPORT`. Valheim is a good example of this.
