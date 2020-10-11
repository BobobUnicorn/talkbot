#!/bin/bash

set -e
apt-get -y update
apk add --no-cache -y curl python2 ffmpeg
curl -O https://nodejs.org/download/release/v10.15.2/node-v10.15.2-linux-x64.tar.gz
tar xzf node-v10.15.2-linux-x64.tar.gz