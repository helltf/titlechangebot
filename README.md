# Host titlechangebot for your own channel :robot:

## TABLE OF CONTENTS

- [Installation](#Install)
- [Commands](#Commands)

## Install

### Get the latest node version from [official nodejs website](https://nodejs.org/en/download/)

#### Now clone the files via cmd

```
git clone https://github.com/helltf/titlechangebot
```

>After successfully cloning rename the __.envexample__ to __.env__ and __exampleconfig.json__ to __config.json__

#### Fill the .env with your preferences like':'

```
BROADCASTER=testuser123
LIVE_EMOTE=PagChomp
TITLE_EMOTE=AlienPls
GAME_EMOTE=AlienPls
OFFLINE_EMOTE=FeelsBadMan
```

If you don't  have your ClientID and ClientSecret go to [dev.twitch.tv](https.dev.twitch.tv) and register an application

#### Now fill in your ClientID and ClientSecret

```
CLIENT_ID=1svndl1n4343n4n1n423nm4
CLIENT_SECRET=sdadnmk2344nm,yxcak42apd2
```

#### After that go into your config.json and add your credentials

If you don't have a oauth Token get one from [here](https://twitchapps.com/tmi/)

```{"username":"testuser123","password":"ouath:san34msalmND"}```

You don't have to add a channel in that file the bot will automatically join the broadcasters channel

#### No go into a node cmd and type

```
npm i
node botstartup.js
```

If there are some modules missing install them via npm install e.g.

```
npm install dotenv
```

## Commands

Command|Description
--------------|-----------------------
!ping|Bot will return Pong! if it's running
!notifyme '<'event'>'| Adds the user to an event change
!removeme '<'event'>'| Removes the user from an event change

## If everything went well you should now be able to start the bot and get notified on events in you channel.
