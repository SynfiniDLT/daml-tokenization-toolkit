#!/usr/bin/env bash

set -eu

jq --slurp 'add' $@
