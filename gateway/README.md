##Gateway

### Running
`yarn start --port=6725`

### API Spec

* `GET /register/` Lists all registered Game API's
    * ```
      {"games": [
        {
          game: "factorio",
          id: "factorio-angelbob",
          name: "Factorio Angelbob",
          connectUrl: "steam://connect/gman.nebtown.info:27015",
          features: [
              "logs",
              "mods",
              "update",
          ],
        },
      ]}
      ```
* `PUT /register/` Registers a Game API
* `{METHOD} /{gameId}/{endpoint}`
will be proxied to that Game API's endpoint
