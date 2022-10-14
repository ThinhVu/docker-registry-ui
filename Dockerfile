FROM node:14-alpine as runner

WORKDIR .

COPY . .

RUN yarn

ENV NODE_ENV=production

EXPOSE 8081

ENTRYPOINT ["node", "./index.js"]
