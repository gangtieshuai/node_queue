git pull origin master
sudo docker container stop $(sudo docker ps -f name=nodequeue -q)
sudo docker build . --file Dockerfile --tag nodequeue:latest

set -e

sudo docker run --name nodequeue --rm -d -p 3000:3000 nodequeue:latest
sudo docker system prune -af
