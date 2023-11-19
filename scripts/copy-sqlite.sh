#!/bin/bash

SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

rm -rf "${SCRIPTS_DIR}"/../public/sqlite3
mkdir -p "${SCRIPTS_DIR}"/../public/sqlite3
cp "${SCRIPTS_DIR}"/../node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/* "${SCRIPTS_DIR}"/../public/sqlite3