FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Instalar depedencias
RUN apk add --no-cache python3 make g++

# Instalar node modules con architectura-specifica
RUN npm install --build-from-source

COPY . .

RUN npx prisma generate

CMD ["npm", "start"]