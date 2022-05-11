FROM node:16.15-alpine3.15 as builder

RUN npm install -g typescript@4.6.3

WORKDIR /telegram_bot

COPY package*.json .

RUN npm install

COPY ./src ./src

COPY ./prisma/schema.prisma .

RUN npx prisma generate

COPY tsconfig.json .

RUN tsc --build tsconfig.json

CMD [ "node", "dist/index.js" ]
