FROM node:15.13.0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 9000
ENTRYPOINT [ "npm", "run", "serve" ]