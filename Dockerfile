FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --include=dev

COPY . .

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
