#!/bin/bash
cd "$(dirname "$0")"
sudo apt-get update
sudo apt install docker.io
sudo groupadd docker
sudo usermod -aG docker $USER
sudo docker build -t "chsheet_server" .
sudo docker run -d --name "chsheet_server" -p 80:8080 "chsheet_server"
