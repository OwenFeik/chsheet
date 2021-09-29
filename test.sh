# This script brings up the database container and sets environment variables
# such that when the server is run on the host system it can find it. This
# allows for live editing of the content rather than needing to restart the
# container.

DB_CONTAINER="chsheet_database_1"

if [ -z "$(docker ps | grep $DB_CONTAINER)" ]; then
    docker-compose start database
fi

# docker inspect command source:
# https://stackoverflow.com/questions/17157721/
export PGHOST=$( \
docker inspect -f \
    '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
    $DB_CONTAINER
)
export PGPORT="5432"
export PGDATABASE="chsheet_db"
export PGUSER="postgres"
export PGPASSWORD="password"

node server/server.js
