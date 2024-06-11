# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

for project_dir in "$@"
do
  echo $project_dir/pom.xml
  find $project_dir/src -type f
done