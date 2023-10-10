#!/usr/bin/env bash

for file in sandbox.pgid json-api.pgid spring.pgid
do
  if [ -f $file ]; then
    kill -SIGTERM -- -$(cat $file | tr -d '\n')
    rm $file
  fi
done
