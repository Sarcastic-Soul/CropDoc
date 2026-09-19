#!/usr/bin/env bash
set -euo pipefail

# Runs a local Android build without freezing the laptop.
#
# A React Native build compiles many C++ modules (reanimated, worklets, mmkv,
# whisper.cpp, ...). Ninja starts one compiler per CPU thread
# plus two (14 here), each using several hundred MB, on top of the ~2.5 GB
# Gradle daemon. On 8 GB of RAM that pushes the desktop into swap or the OOM
# killer.
#
# This wraps the build in a systemd scope that:
#   - pins it to BUILD_CPUS (Ninja and the JVM size their parallelism from
#     this, so 6 CPUs means 8 compile jobs instead of 14),
#   - makes the kernel reclaim the build's memory first once it passes
#     BUILD_MEMORY_HIGH, so the build slows down instead of the desktop,
#   - runs at low CPU priority so the desktop stays responsive.
#
# Usage:
#   scripts/android-lite.sh                   npx expo run:android
#   scripts/android-lite.sh --no-bundler      npx expo run:android --no-bundler
#   scripts/android-lite.sh <command...>      any other command, e.g.
#                                             ./android/gradlew -p android assembleRelease
#   BUILD_CPUS=0-7 scripts/android-lite.sh    give the build more CPUs

BUILD_CPUS="${BUILD_CPUS:-0-5}"
BUILD_MEMORY_HIGH="${BUILD_MEMORY_HIGH:-4500M}"

if [ "$#" -eq 0 ] || [[ "$1" == -* ]]; then
  set -- npx expo run:android "$@"
fi

exec systemd-run --user --scope --quiet --collect \
  --unit="android-build-$$" \
  -p MemoryHigh="$BUILD_MEMORY_HIGH" \
  -p CPUWeight=20 \
  --nice=10 \
  taskset -c "$BUILD_CPUS" "$@"
