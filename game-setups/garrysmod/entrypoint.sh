#!/bin/bash
PORT=27015
MAXPLAYERS=24
INITIAL_HOSTNAME="Unnamed Nebtownish Server" # overriden by configs
MAP=gm_excess_construct_13
SRCDS_ARGS="-nocrashdialog -disableluarefresh -tickrate 33 +host_workshop_collection ${WORKSHOP_COLLECTION}"
SRCDS_ARGS="+maxplayers ${MAXPLAYERS} +hostname '${INITIAL_HOSTNAME}' +gamemode sandbox +map ${MAP} ${SRCDS_ARGS}"

unionfs-fuse -o cow -o allow_other /gmod-volume=RW:/gmod-base=RO /gmod-union
echo Starting: sudo -u steam /gmod-union/srcds_run -game garrysmod -norestart -port ${PORT} "${SRCDS_ARGS}"
sudo -u steam /gmod-union/srcds_run -game garrysmod -norestart -port ${PORT} "${SRCDS_ARGS}"
