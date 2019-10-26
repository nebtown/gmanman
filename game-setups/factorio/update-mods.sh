#!/bin/bash
docker pull factoriotools/factorio
docker run -v $PWD/volume:/factorio --name factorio-updating --rm --entrypoint=./docker-update-mods.sh factoriotools/factorio
