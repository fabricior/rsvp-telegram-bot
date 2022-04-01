# RSVP Bot Telegram Bot

## About

Telegram bot to coordinate the attendance of players to games that require a specific number of players, such as Five-a-side footbal.

## Getting started
### Setup Bot in a group chat

1. Add your bot as **Administrator** to a group chat.

2. Send `/init` command

![Screenshot of Sending /init command.](/assets/01-Init.png "Sending /init command").

3. Users need to `/enroll` in order to be able to included the list of players. This needs to be done just **once** per user, per group.

![Screenshot of Sending /enroll command.](/assets/02-Enroll.png "Sending /enroll command").

### Using the bot 

1. To create a new game, send the `/new` command which accepts 3 arguments: 
    `/new YYYY-MM-DD HH:MM MAX`
    where:
    `YYYY-MM-DD` is the date to schedule the new game for
    `HH:MM` is the time to schedule the new game at
    `MAX` is the maximun number of players
    
For example, `/new 2022-04-19 20:00 10` will schedule a new game for 4/19/2022 at 08:00 PM with a max number of players set at 10.
    ![Screenshot of Sending /status and /new commands.](/assets/03-NewGame.png "Sending /status and /new commands").

2. Users can RSVP by sending `/yes` `/no` `/maybe` commands

3. At all times, you can send the `/status` command to see if there are any upcoming games.

## Development

### Requeriments

- Node v16.x or later
- A MongoDb instance configured as replica set.
- A telegram bot token.

### Installation

1. Run `npm install`
2. Create a `.env` and place it in the root folder. File context needs to be as follows and you will need to change the values accordingly.
3. Run `npx prisma db push`
4. (Optionally) Run `npx prisma db seed`
```
DATABASE_URL="your mongoDb instance"
TELEGRAM_BOT_TOKEN="your bot token"             
ROBOT_NAME = "pick a name"
ENVIRONMENT="test, prod, etc"
```
### Run locally

`npm run dev`

### Run tests

`npm  test`

### Recreate DB from scratch

1. MongoShell: `db.dropDatabase()`
2. Terminal:
    `npx prisma db push`
    `npx prisma db seed`

