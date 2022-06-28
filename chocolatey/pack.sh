#!/bin/sh
docker run --rm -v $PWD:$PWD -w $PWD linuturk/mono-choco pack moosync.nuspec
