FROM node:16.13.2-slim
WORKDIR /app

ADD . /app
RUN npm config set registry https://registry.npm.taobao.org
RUN npm install -g pm2
RUN yarn config set registry https://registry.npm.taobao.org
RUN yarn install

EXPOSE 3003

# use 'pm2 status' command to launch pm2 daemon
# ENTRYPOINT pm2 status && pm2 start 
CMD ["pm2-runtime","start", "index.js"] 
