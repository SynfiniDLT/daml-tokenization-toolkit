#!/usr/bin/env bash

# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

for file in $(ls *.pgid)
do
  kill -SIGTERM -- -$(cat $file | tr -d '\n')
  rm $file
done
