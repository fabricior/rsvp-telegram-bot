# RSVP Bot Telegram Bot

## About

Telegram bot to coordinate the attendance of players to games that require a specific number of players, such as Five-a-side footbal.

## How to use the Bot

TODO
## Development Setup

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

