FROM node:14-alpine
WORKDIR /app
COPY ./server ./
COPY ./dist ./public
EXPOSE 8080
ENTRYPOINT ["node", "./app/index.js"]


