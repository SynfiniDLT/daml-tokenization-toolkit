#!/usr/bin/env bash

set -euo pipefail

# Create .lib directory
if [[ -d .lib ]]; then
  rm -r .lib
fi
mkdir .lib

# Get the dependency list
echo "Downloading the list of dependencies"

# For each dependency, download and install
while IFS=" " read -r url out
do
  printf "Downloading: %s, to: %s\n" "$url" "$out"
  curl -Lf# "${url}" -o ${out}
done < dependencies.conf

echo "All dependencies successfully downloaded!"
