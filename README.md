# RSVP Bot Telegram Bot

## About

Telegram bot to coordinate the attendance to games that require a specific/maximum number of players, such as Five-a-side football.
## Tech stack

- NodeJs
- TypeScript
- telegraf
- MongoDB
- Prisma
- Jest

## Disclaimer

⚠ This is a early version of the code which means that this repo is **not stable** at the moment. For example, I might be making prisma schema breaking changes until this project matures. 

## Getting started
### Setup Bot in a group chat

⚠ Below steps assume you have already [created your own telegram bot](https://core.telegram.org/bots#3-how-do-i-create-a-bot) and you have either deployed this code somewhere (*or* you are running it **locally**). In the future, I might add docker support to simplify the rollout to a prod environment. ATM, instructions to deploy to a prod environment would be rather manual, so I'll skip them for now. As mentioned earlier, you can run it locally. See the [Development section](#Development) for details.

1. Add your bot as **Administrator** to a group chat.

2. Send `/init` command

![Screenshot of Sending /init command.](/assets/01-Init.png "Sending /init command")

3. Users need to `/enroll` to be included in the list of players. This needs to be done just **once** per user.

![Screenshot of Sending /enroll command.](/assets/02-Enroll.png "Sending /enroll command")

4. Configure bot commands

    4.1 Open chat with @BotFather

    4.2 Send the `setcommands` command

    4.3 Select your bot

    4.4 Send below message:
```
init - Initialize the robot.
enroll - Each player needs to send this command to let the bot know they want to interact with it. This needs to be done just once per user.
new - creates a new game. Usage: /new YYYY-MM-DD HH:MM MAX
yes - you are attending the upcoming game
no - you are NOT attending the upcoming game
maybe - you don't know yet if you can make it
status - get details about the attendance of players
guest_add - Add a guest player. Usage: /guest_add <name>
guest_remove - Removes a guest player. Usage: /guest_remove <number>
```

### Using the bot 

1. To create a new game, send the `/new` command using following format: 
    
    `/new YYYY-MM-DD HH:MM MAX`

    where:
    - `YYYY-MM-DD` is the date to schedule the new game for
    - `HH:MM` is the time to schedule the new game at
    - `MAX` is the maximum number of players
    
    For example, `/new 2022-04-19 20:00 10` will schedule a new game for **4/19/2022 at 08:00 PM** with a max number of players set at **10**.
    ![Screenshot of Sending /new command.](/assets/03-NewGame.png "Sending /new command")

2. Users can RSVP by sending `/yes` `/no` `/maybe` commands:

    ![Screenshot of Sending /yes command.](/assets/04-RSVP.png "Sending /yes command")

3. At all times, you can send the `/status` command to see if there are any upcoming games. If so, the bot will display attendance details:

    ![Screenshot of Sending /status command.](/assets/05-Status.png "Sending /status command")

4. To add guests, that is, users that are not part of the group chat, use `/guest_add GUEST-NAME`

 For example, `/guest_add Richard` will add Richard to the upcoming game

5. To remove guests, use `/guest_remove GUEST-NUMBER`

 For example, `/guest_remove 2` will remove the guest number 2.

## Roadmap

- [x] Ability to add and remove guests for a certain game.
- [ ] Docker Support.

## Development

⚠ Tested on Windows 10 PRO only.

### Requirements

- Node v16.x or later
- A MongoDb instance configured as replica set.
- A telegram bot token.

### Setup

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

