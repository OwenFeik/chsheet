FROM postgres

ENV POSTGRES_DB chsheet
ENV POSTGRES_PASSWORD password

COPY schema.sql /docker-entrypoint-initdb.d/
