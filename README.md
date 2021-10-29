# Moosync

Moosync is an [Electron](https://www.electronjs.org/) based simple music player with a primary goal to provide a clean and easy interface. Through Moosync you can easily listen songs from your desktop or through Youtube and Spotify.

## Table of contents

- [Moosync](#moosync)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
  - [Download latest release](#download-latest-release)
  - [Enabling Spotify integration](#enabling-spotify-integration)
    - [Creating an app on Spotify developer portal](#creating-an-app-on-spotify-developer-portal)
  - [Building from source](#building-from-source)
    - [Requirements](#requirements)
    - [Setting up the project](#setting-up-the-project)
    - [Downloading dependencies](#downloading-dependencies)
    - [Setting up environment variables](#setting-up-environment-variables)
    - [Post installation](#post-installation)
    - [Running in development environment](#running-in-development-environment)
    - [Building a production build](#building-a-production-build)
    - [Developing extensions](#developing-extensions)

## Features

- Play audio files on your desktop.
- Seamlessly integrate your Spotify and Youtube playlists.
- Add Spotify and Youtube tracks and playlists by URLs.
- Play songs directly from youtube using youtube embed
- Scrobble your tracks on LastFM.
- Get music recommendations directly from Spotify, Youtube and LastFM
- Mix and match songs from different providers in a single playlist
- Easy to use interface
- Customizable theme engine
- Develop own apps on top of Moosync Extension API
- Available on Windows and Linux

## Download latest release

**The latest release can be found under [Releases](https://github.com/Moosync/Moosync/releases) section**

## Enabling Spotify integration

Due to restrictions from Spotify, a public api key could not be integrated into the app.
Due to this, each user will be required to generate an API key for themselves

### Creating an app on Spotify developer portal

Head over to the [Spotify developer dashboard](https://developer.spotify.com/dashboard/applications) and create a new application

After creating a new app, click on the newly created app and you will be taken to a new page listing your **Client ID** and **Client Secret**. Note these down as they will be used later.

Click on **Edit Settings** button on top-right and add the following URLs into **Redirect URI** field:

- <http://localhost:8080>
- <http://localhost>
- <https://moosync.cf/spotify>

These URLs are required to allow fetching a token from the Spotify OAuth2 code.

If you feel moosync.cf is suspicious, don't worry you can check out its code [here](https://github.com/Moosync/Moosync.github.io)

Now you can head over to Moosync app and click on Settings. Under Settings > System you will find text fields for **Spotify Client ID** and **Spotify Client Secret**.

Paste the string you copied earlier into these fields. Now you should be able to log in to your Spotify account.

You can add your alternate accounts under **Users and Access** and use the same Client ID and Client Secret for multiple users.

## Building from source

### Requirements

- [NodeJS](https://nodejs.org/en/)
- Package manager like [Yarn](https://yarnpkg.com/getting-started/install) or [NPM](https://www.npmjs.com/)

### Setting up the project

Clone the project from github

``` bash
git clone https://github.com/Moosync/moosync-app
```

### Downloading dependencies

Use yarn or npm to install dependencies inside the project root

``` bash
yarn install
```

### Setting up environment variables

- Add appropriate values inside sample.config.env
- Rename sample.config.env to config.env

### Post installation

Native dependencies need to be compiled for electron separately.

Incase this does not work, you can run

``` bash
yarn native
```

To compile native dependencies.

### Running in development environment

To serve the app, run

```bash
yarn electron:serve
```

### Building a production build

Before generating a production build, take a look at [vue.config.js](https://github.com/Moosync/moosync-app/blob/main/vue.config.js) and change the builder options as required.

To generate a production optimized version run

``` bash
yarn electron:build
```

### Developing extensions

It is recommended to write your extensions using [Typescript](https://www.typescriptlang.org/).

Typescript is Javascript but with strict typechecking which helps in preventing some (but not all) runtime errors.

Types for Extension API can be found [here](https://github.com/Moosync/extension-api-types)

A sample extension can be found [here](https://github.com/Moosync/extension-typescript-template)

More details about extension lifecycle can be found in the sample template
