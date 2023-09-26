#!/usr/bin/env bash

set -eu

for project_dir in "$@"
do
  echo $project_dir/pom.xml
  find $project_dir/src -type f
done