FROM node:16 AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:16-alpine

RUN npm install -g http-server

WORKDIR /app

COPY --from=build /app/dist /app/dist

EXPOSE 8080

CMD ["http-server", "dist", "-p", "8080"]

