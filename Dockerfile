FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Create a persistent volume mount point for the database
RUN mkdir -p /data

ENV DB_PATH=/data/marchmadness.db
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
