curl -s --compressed "https://moosync.app/ppa/KEY.gpg" | sudo apt-key add -
sudo curl -s --compressed -o /etc/apt/sources.list.d/moosync.list "https://moosync.app/ppa/moosync.list"
sudo apt update
sudo apt install moosync