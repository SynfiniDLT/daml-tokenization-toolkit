#!/usr/bin/env bash

for file in $(ls *.pgid)
do
  kill -SIGTERM -- -$(cat $file | tr -d '\n')
  rm $file
done
