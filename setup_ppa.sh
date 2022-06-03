wget -qO- "https://moosync.app/ppa/ubuntu/KEY.gpg"|sudo apt-key add -
sudo wget -O /etc/apt/sources.list.d/moosync.list "https://moosync.app/ppa/ubuntu/moosync.list"
sudo apt update
sudo apt install moosync