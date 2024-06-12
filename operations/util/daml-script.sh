#!/usr/bin/env bash

# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

daml script ${DOPS_CONNECTION_ARGS} $@
