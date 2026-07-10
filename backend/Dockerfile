FROM node:22-alpine
WORKDIR /app
# Install deps first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev
# App source (includes src/data/knowledgeBase.json)
COPY . .
ENV NODE_ENV=production
EXPOSE 5000
# Run as the built-in non-root user
USER node
CMD ["node", "src/index.js"]
