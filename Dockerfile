# ---------- Install Stage ----------
FROM node:20-alpine

WORKDIR /usr/pro/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000
CMD ["node", "src/server.js"]
