#!/bin/sh
. ./.env

rm -f ./*.nupkg
docker run --rm -v $PWD:$PWD -w $PWD linuturk/mono-choco pack moosync.nuspec
docker run --rm -v $PWD:$PWD -w $PWD linuturk/mono-choco push *.nupkg --api-key $API_KEY
