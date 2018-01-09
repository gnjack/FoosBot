# FoosBot
[![Build Status](https://travis-ci.org/gnjack/FoosBot.svg?branch=master)](https://travis-ci.org/gnjack/FoosBot)

FoosBot is a HipChat bot that tracks Table Football (foosball) match results and player stats, ranking players by TrueSkill

# Getting Setup

Here are some basic notes to get this bot built, deployed and integrated into your HipChat room.  
It will create a full API pipeline in AWS, with seperate test and stable endpoints, each with their own datastore in DynamoDB.

## Prerequisites

* AWS account with access to IAM, API Gateway, Lambda and DynamoDB
* Node.js 6.10
* NPM
* Yarn
* Caludia JS - https://claudiajs.com/tutorials/installing.html  
  Ensure you setup an AWS key and secret for Claudia to use

## Build

* Navigate to the `/api` folder
* Run `yarn --ignore-engines install`  
  *`--ignore-engines` is required as `jstrueskill` is incorrectly pinning to only support a specific node and npm version*
* Now you can `yarn build` which will lint, test and compile your code

## AWS Setup
* In `/database` run `yarn install` followed by `yarn start:test` and `start`.  
  This will use the javascript AWS api to create the following tables in DynamoDB:
  * `foosbot-test-installations`
  * `foosbot-test-match-history`
  * `foosbot-installations`
  * `foosbot-match-history`
* In `/api` run `yarn createaws`.  
  This will use Caludia JS to create a new AWS API Gateway pointing to a new Lambda function called `foosbot-interactive`.

## AWS Deploy
* Use `yarn deploy` to package the NodeJS project and deploy it to your Lambda with the `test-env.json` environment parameters. This will be available at the `/latest` endpoint on your API Gateway, the full URL for which will be included in the log output from Claudia JS.
* Use `yarn promote` to take the latest version deployed to Lambda, apply the `stable-env.json` environment parameters and tag this deployment as stable, making it available via the `/stable` endpoint on your API Gateway.

## Adding integration to a Room

When you `yarn deploy` or `yarn promote` Claudia JS will return the URL to access the latest or stable version of your FoosBot API. Copy this url and add `/descriptor` to the end. Now navigate to the HipChat room, select 'Integrations' on the menu option and follow steps below:

* Click 'Install new integration' (must be room admin)
* 'Build your own Integration'
* 'Install an integration from a descriptor URL'
* Paste in the URL for either the latest or stable endpoint with `/descriptor` on the end.

Happy Foosballing.
