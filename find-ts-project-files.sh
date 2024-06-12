#!/usr/bin/env bash

# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

for project_dir in "$@"
do
  find $project_dir \
    -type f \
    ! -path "${project_dir}/node_modules/*" \
    ! -path "${project_dir}./build/*" \
    ! -path "${project_dir}./lib/*" \
    ! -path "${project_dir}/daml.js/*"  \
    ! -name package-lock.json
done
