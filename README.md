# satselixia-sms-bot
______
SMS two-way communication bot that sends information about SATS/Elixia centers (Norwegian fitness centers).

[**SATS/Elixia**](http://satselixia.no) is a norwegian fitness center group with over 60+ fitness centers in Norway. Many of the centers have different opening hours, and I've personally spent a lot of time looking up their opening hours on my mobile phone.

As a fun little project (and since I'm lazy) I decided to create a SMS bot that receives some simple commands and responds with various useful information.

So far I've only added opening hours. On the roadmap is the ability to receive information about upcoming / current group sessions. (E.g. ask the bot: "Are the treadmills currently in use?").

The bot is currently up and running, but there's no live demo since SMS is quite expensive and publishing it here could end up leaving me with a hefty bill.

*If you desperately want to try it live, drop me an e-mail and I'll send you the number*

## What it does
The bot queries SATS/ELIXIA's home page and fetches/parses all of their fitness centers. 

It then listens for incoming SMS (Using [Twilio](http://twilio.com)) and responds with opening hours for the specified store.

The bot compares the names of the centers with the search query based on the
[Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) and returns if similarity > 85% *(configurable)*

## Example usage
The bot is currently able to provide opening hours for all SATS/Elixia fitness centers.


**Input (SMS in)**

```
tider solli plass
```

or

```
åpningstider solli plass
```

**Output (SMS out)**

```
Åpningstidene på Solli plass:

Mandag - torsdag: 06:00 - 23:00
Fredag: 06:00 - 21:00
Lørdag: 09:00 - 19:00
Søndag: 10:00 - 20:00
```

### Screenshot
<img src="http://i.imgur.com/tkNrPUK.png" height="300px">

## Installation
Run `npm install` to install required dependencies.

This project requires a `config.json` file placed in root folder in order to work.

### Example config.json file

```
{
    "twilio": {
        "client": null,
        "from": "YOUR-TWILIO-NUMBER-HERE",
        "accountSid": "YOUR-TWILIO-ACCOUNT-SID-HERE",
        "authToken": "YOUR-TWILIO-AUTH-TOKEN-HERE"
    },
    "similarityTreshold": 0.85,
    "departments": []
}
```

That's it.


## Disclaimer
This project is in no way affiliated with, authorized, maintained, sponsored or endorsed by SATS/Elixia or any of its affiliates or subsidiaries. The project is purely educational and non-commercial. No private data is accessed.

## License
MIT

Copyright (c) 2017 Erlend Ellingsen

