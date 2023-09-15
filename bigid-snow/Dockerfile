FROM node:19-alpine as build
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY ["package.json", "package-lock.json*", "./"]

# Install dependencies and add custom user & group
RUN \
  set -ex \
  && npm ci --only=production \
  && deluser --remove-home node \
  && addgroup -S bigid -g 1111 \
  && adduser -S -G bigid -u 1111 bigid \
  && chmod -R 0755 /usr/src/app \
  && chown -R bigid:bigid /usr/src/app

# Bundle app source
COPY ./artifact ./artifact 
COPY ./bo ./bo
COPY ./public ./public
COPY ./services ./services
COPY ./utils ./utils
COPY *.js ./

FROM node:19-alpine

RUN \
  set -ex \
  && deluser --remove-home node \
  && addgroup -S bigid -g 1111 \
  && adduser -S -G bigid -u 1111 bigid

COPY --from=build --chown=bigid:bigid /usr/src/app /usr/src/app

# Run as non-root user
USER bigid
WORKDIR /usr/src/app

EXPOSE 8083

CMD [ "npm", "start" ]