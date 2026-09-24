# Kingdom of Hell — Cerberus Pact Bot

Bot Discord.js v14 for the Kingdom of Hell.

The bot turns verification into an in-universe ceremony:

THRESHOLD → PACTE → NAME DECLARATION → THE PACT → SEALING → OATHBOUND

## Included

- `.env` with placeholders
- `MEMBER_ROLE_ID=1493114249180872705` for the **Oathbound** role
- Discord username verification
- Cerberus / THE PACT ceremony
- Automatic `Oathbound` role assignment
- Pact persistence in `data/pacts.json`
- Pact reset when a member leaves the guild
- Pact reset if the Oathbound role is manually removed
- `/pacte-setup`
- `START.bat`

## Requirements

- Node.js 20 or newer
- A Discord application/bot
- The bot invited to the Kingdom of Hell server
- The bot must have **Manage Roles**
- The bot's highest role must be **above Oathbound**
- The `GUILD_MEMBERS` privileged intent must be enabled in the Discord Developer Portal

## 1. Create the Discord bot

Open the Discord Developer Portal:

https://discord.com/developers/applications

Create or open the application, then open **Bot**.

Create/reset the bot token and put it in `.env`:

```env
DISCORD_TOKEN=YOUR_REAL_BOT_TOKEN
MEMBER_ROLE_ID=1493114249180872705
```

Never publish the token or commit `.env`.

## 2. Enable the required Gateway Intent

In the Developer Portal:

**Your Application → Bot → Privileged Gateway Intents**

Enable:

- **Server Members Intent**

The bot uses this intent because Discord requires `GUILD_MEMBERS` for member join/update/remove events.

No `MESSAGE_CONTENT` intent is required by this project.

## 3. Invite the bot

Use the OAuth2 installation page and authorize the bot in Kingdom of Hell.

Required bot permission:

- Manage Roles

The application command scope is included when using the bot installation flow.

## 4. Put the bot role above Oathbound

Discord role hierarchy matters.

Go to:

**Server Settings → Roles**

Move the bot's role above:

**Oathbound**

If the bot is below Oathbound, Discord will reject the role assignment.

## 5. Install

Open a terminal in this folder:

```bash
npm install
```

Then:

```bash
npm start
```

Or double-click:

```text
START.bat
```

## 6. Prepare the ceremony

In the Discord channel where the ceremony should live, run:

```text
/pacte-setup
```

The command requires **Manage Server**.

It posts the Threshold ceremony into the current channel.

## Ceremony

The member sees:

1. THE THRESHOLD
2. `DECLARE YOUR NAME`
3. Cerberus asks for the Discord username
4. The bot compares it with the actual Discord username
5. THE PACT appears
6. `SEAL THE PACT`
7. The bot runs the sealing sequence
8. `Oathbound` is assigned
9. The pact is written to `data/pacts.json`

## Reset behavior

When a member leaves the server, the stored pact is deleted.

If the Oathbound role is manually removed while the member remains in the server, the stored pact is also deleted.

This means the member can perform the ceremony again after returning / having the role removed.

## Data

`data/pacts.json` stores:

- Discord user ID
- Discord username
- declared name
- guild ID
- Oathbound role ID
- sealing timestamp

The file is intentionally local and simple for a first version.

## Important security note

Treat `.env` as secret.

Do not send your bot token in Discord, GitHub, screenshots, or chat.

If the token is ever exposed, regenerate it immediately in the Discord Developer Portal.

## Technical notes

The bot does not read ordinary Discord messages.

The username is collected through a Discord Modal interaction, then compared against the account's current `username`.

The slash command is registered globally. Discord's global application commands can take time to propagate. For rapid development/testing, a guild-scoped command registration can be added later.

## Official documentation

Discord Developer Documentation:
https://docs.discord.com/developers/docs/interactions/slash-commands

Discord Gateway Intents:
https://docs.discord.com/developers/events/gateway

Discord Gateway Events:
https://docs.discord.com/developers/events/gateway-events

discord.js documentation:
https://discordjs.dev/docs/packages/discord.js/main/
