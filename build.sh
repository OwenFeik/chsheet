sudo systemctl start docker
docker-compose up -d --build --force-recreate --no-deps server
