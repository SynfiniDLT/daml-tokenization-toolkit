# Copyright (c) 2024 ASX Operations Pty Ltd. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

set -eu

output_file=$(mktemp)

$DOPS_UTIL/add-json.sh $DOPS_PARTIES_FILE $1 | $DOPS_UTIL/daml-script.sh \
  --input-file /dev/stdin \
  --output-file ${output_file} \
  --dar ${DOPS_DAR} \
  --script-name Synfini.Operations.Factory.Account:createAccountFactories \
  "${@:2}"

new_afs_file=$(mktemp)
jq -n '{ accountFactories: [ inputs.accountFactories ] | add }' $DOPS_ACCOUNT_FACTORIES_FILE $output_file > $new_afs_file
mv $new_afs_file $DOPS_ACCOUNT_FACTORIES_FILE

rm $output_file
