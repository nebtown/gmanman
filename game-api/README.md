## Requirements

- 7z (p7zip) for backups

## Running

- `yarn start --game=minecraft --dir=/servers/minecraft` launches a Game API
- `yarn local` runs a test Game API

## Game Api HTTP Spec

### Required Endpoints
* `GET /control`
Returns current status of Game Server
    * `{"status": "running", "playerCount": 0}`
    * Statuses include "stopped", "starting", "running", "stopping", "updating"
* `PUT /control`
Starts Game Server
    * often via `docker-compose up`
* `DELETE /control`
Stops Game Server
    * often via `docker-compose down`

### Optional Endpoints

These optional endpoints can be advertised to the Gateway by mentioning them in `/register`'s `features` list

* `GET /logs?offset=400`
    * `{"logs": "Starting...\nArk's up!", "offset": 401}`
    * often via `docker logs`
    * 'offset' is optional but encouraged; if unsupported, `{"logs": "whole\nlog"}` is acceptable
* `POST /update`
* `POST /rcon`
    * `{"rcon": "say Hello there"}`
* `GET /mods`
Lists existing installed mods
    * `{"mods": [{"id": "honk", "enabled": true}]}`
* `PUT /mods`
Sets the new list of mods, will install/uninstall (or queue to be installed at next startup)
    * `{"mods": [{"id": "honk", "enabled": true}]}`
    * ID's will vary between games, but typically are Steam Workshop ID's
* `GET /mods/list`
Lists available mods to install
    * `{"mods": [{"id": "honk", "label": "Honk!"}]}`
* `GET /mods/search?q=honk`
Searches available mods to install
    * `{"mods": [{"id": "honk", "label": "Honk!"}]}`
    * The list endpoint is preferable if applicable, but Workshop usually has too many mods to list at once
* `GET /backup`
Lists backup archives
    * `{"backups": [{"name": "test-backup-2019-11-18T07:39:00.869Z.7z"}]}`
* `POST /backup`
Triggers a new backup + upload
* `POST /restore`
Triggers a download + extract
    * `{"mostRecent": true}`
    * `{"file": "test-backup-2019-11-18T07:39:00.869Z.7z"}`

### Registering with the Gateway

Game-Api's should register themselves to the Gateway on launch,
which'll allow it to be listed in the UI, and receive requests via the Gateway.

```
POST https://gmanman.nebtown.info/gateway/register/
{
    game: 'minecraft',
    id: 'minecraft-frostville',
    name: 'Minecraft Frosty',
    url: 'https://your-server-here.com/minecraft-frostville/', // base url, 'control/' etc will be appended to it
    connectUrl: 'steam://connect/gman.nebtown.info:27015', // optional
    features: [
        "logs",
        "update",
        "rcon",
        "mods",
        "modList",
        "modSearch",
        "backup",
    ]
}
```

For more see [Gateway Docs](../gateway/)
