FROM node:16-alpine

WORKDIR /wichway_app

COPY package*.json ./

# Install
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npx", "serve", "-s", "dist"]