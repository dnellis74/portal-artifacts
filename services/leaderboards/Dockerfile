FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY schema.sql ./schema.sql
USER node
ENV NODE_ENV=production
CMD ["npm", "start"]
