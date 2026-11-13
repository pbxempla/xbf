FROM node:26.13.1-slim

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

EXPOSE 6051

CMD ["npm", "start"]