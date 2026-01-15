# Galosity

Lite hypertext galgame script editor & engine.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/HZZcode/Galosity)

## Installation

Galosity can be run either as an Electron app, or as a web server. Jump to [Deployment](#deployment) if you need the web server mode.

1. Open [Github Actions](https://github.com/HZZcode/Galosity/actions) and find the latest successful action from the **main** branch.
2. Open that action, scroll to the bottom of the page, and find an artifact named **galosity-build-[YOUR SYSTEM]-latest**.
3. Download the artifact (a zip file) and unzip it.

## Deployment

1. A **node.js** environment is required. It is also recommended to have **npm** and **python (~3.12)** installed since Galosity uses them for managing dependencies and running scripts.
2. Clone the github repository. Commands below should be run under the project directory.
3. Install node.js dependencies:
   `npm install`
4. Install frontend dependencies:
   `python scripts/get-dependencies.py`
5. Generate `exports.txt`:
   `python scripts/get-exports.py`
6. *(If you need to run as web server)* Change mode:
   Open `ts/mode.ts`, and modify `mode` from `'electron'` to `'web'`.
7. *(Optional)* Run ESLint:
   `npx eslint --fix`
8. Start the app:
   `npm run start`

## Plugin Development
1. [Install](#installation) or [Deploy](#deployment) Galosity. It is recommended to use the deployed version so that you can check the source code offline.
2. Run Galosity and read the plugin development tutorial. It contains most information you need to start up.