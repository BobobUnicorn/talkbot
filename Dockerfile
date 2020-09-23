FROM ubuntu:latest
LABEL Name="Talkboata"

FROM python:2.7

# Replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# make sure apt is up to date
RUN apt-get update --fix-missing
RUN apt-get install -y curl
RUN apt-get install -y build-essential libssl-dev libprotobuf-dev protobuf-compiler cmake

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 8.11.0

RUN apt-get install -y ffmpeg

RUN mkdir -p $NVM_DIR
# Install nvm with node and npm
RUN curl https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash \
    && source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH


WORKDIR /usr/src/app

COPY google-auth.json /root/.google/

COPY . .
COPY package.json ./

RUN npm install
RUN npm install pm2 -g

EXPOSE 80
EXPOSE 443

CMD ["pm2-runtime", "start", "ecosystem.config.js", "--only", "docker"]
