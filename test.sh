# This script brings up the database container and sets environment variables
# such that when the server is run on the host system it can find it. This
# allows for live editing of the content rather than needing to restart the
# container.

DB_CONTAINER="chsheet_database_1"

if docker info | grep -q "ERROR: Cannot connect"; then
    sudo systemctl start docker
fi

if [ -z "$(docker ps | grep $DB_CONTAINER)" ]; then
    if [ -z "$(docker ps -a | grep $DB_CONTAINER)"]; then
        docker-compose up -d database
    else
        docker-compose start database
    fi
fi

# check if running in WSL source:
# https://stackoverflow.com/questions/38086185/
# Under WSL, need to use localhost rather than container IP
if grep -qEi "(Microsoft|WSL)" /proc/version; then
    export PGHOST="localhost"
else
    # docker inspect command source:
    # https://stackoverflow.com/questions/17157721/
    export PGHOST=$( \
        docker inspect -f \
        '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
        $DB_CONTAINER
    )
fi

export PGPORT="5432"
export PGDATABASE="chsheet_db"
export PGUSER="postgres"
export PGPASSWORD="password"

# convenience option to open db in shell
if [ "$1" == "db" ]; then
    psql "postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"
else
    node server/server.js
fi
