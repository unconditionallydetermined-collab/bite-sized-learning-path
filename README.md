# BiteLearn Path

Build a Progressive Web App (PWA) for a micro-learning platform using React, Vite, and Tailwind CSS. The app should have a Duolingo-style UI and strictly follow these requirements:

1. Core Architecture & Auth

Implement user authentication (email/password). Users must log in to access or save content.

Make it a fully installable PWA. Include a manifest.json and a service worker. Prompt mobile users to "Install App" when they visit the site.

2. Content Parser & Database

Create an initial input area where users can paste raw text containing course data upon account creation.

Hidden Content Management: Bury an "Add More Quests" input area deep within a Settings or Profile menu. It should take 3-4 clicks to reach. This area must allow users to paste new text blocks to append new Quests and Units to their existing database without overwriting their current progress.

Write a parser that takes text formatted exactly like this: Quest 1: How to get clients Modules / Units: How to get clients (1) -> [YouTube URL] Quest 2: Subtitles Modules / Units: Subtitles (1) -> [YouTube URL]

The parser must convert this text into a structured JSON state: "Quests" contain "Units" (the URLs).

The system should automatically generate "Modules" that mix and match Units from different Quests (e.g., a module containing editing basics and subtitles).

3. Video Playback & Micro-Learning Mechanics

Use the YouTube Iframe API. Hide the native YouTube controls entirely (controls=0).

Build a custom playback bar overlay that sits on top of the video. This bar should only represent the duration of the current "bit", not the whole video.

Dynamic Bit Sizing: Break each YouTube unit into 60 to 90-second actionable bits.

Time-Condition Logic: Check the user's local system time. If they are watching between 11:50 PM and 12:00 AM, automatically reduce the bit size to exactly 30 seconds.

4. Gamification & UX

UI: Display modules in a vertical, path-like UI (similar to Duolingo). Show the title, and when clicked, drop down the bits for that unit.

Streaks: Implement a daily streak counter saved to the user's profile.

High-Friction Skipping: Users can search for or skip modules, but add high UI friction. To skip, force the user through a 3-step modal confirmation (e.g., clicking "Skip", typing "I want to skip", and confirming again).

Animations: For this base version, include simple CSS transitions on buttons and module completion. Structure the components so we can add heavier motivational animations later

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bite-sized-learning-path.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/88d620be-45ab-470b-91c8-66776207a750).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
