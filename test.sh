#!/bin/bash

docker-compose down
docker-compose rm
docker volume prune --force
docker-compose up --build -d
docker-compose ps
