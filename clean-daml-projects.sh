#!/usr/bin/env bash

set -eu

base_dir=$(pwd)
for daml_yaml_file in $(find . -name 'daml.yaml')
do
  cd $(dirname $daml_yaml_file)
  daml clean
  cd $base_dir
done
