FROM node:20-slim
WORKDIR /app
ADD . /app
CMD npm run start
