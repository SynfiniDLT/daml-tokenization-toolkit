#!/usr/bin/env bash

set -eu

for project_dir in "$@"
do
  echo $project_dir/daml.yaml
  find $project_dir/src -type f -name '*.daml'
done
