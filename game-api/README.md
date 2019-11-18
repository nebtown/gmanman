## Requirements

- 7z (p7zip) for backups

## Running

- `yarn start --game=minecraft --dir=/servers/minecraft` launches a Game API
- `yarn local` runs a test Game API

## Game Api HTTP Spec

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
* `GET /logs`
    * `{"logs": "Starting...\nArk's up!"}`
    * often via `docker logs`
* `POST /update`
* `GET /mods`
Lists existing mods
    * `{"mods": [{"id": "honk", "name": "Honk!", "enabled": true}]}`
* `PUT /mods`
Sets the new list of mods, will install/uninstall (or queue to be installed at next startup)
    * `{"mods": [{"id": "honk", "enabled": true}]}`
    * ID's will vary between games, but typically are Steam Workshop ID's
* `GET /backup`
Lists backup archives
    * `{"backups": [{"name": "test-backup-2019-11-18T07:39:00.869Z.7z"}]}`
* `POST /backup`
Triggers a new backup + upload
* `POST /restore`
Triggers a download + extract
    * `{"mostRecent": true}`
    * `{"file": "test-backup-2019-11-18T07:39:00.869Z.7z"}`
