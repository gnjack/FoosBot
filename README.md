# FoosBot
[![Build Status](https://travis-ci.org/gnjack/FoosBot.svg?branch=master)](https://travis-ci.org/gnjack/FoosBot)

FoosBot is a HipChat bot that tracks Table Football (foosball) match results and player stats, ranking players by TrueSkill

# Getting Setup

Here are some basic notes to get this bot built, deployed and integrated into you HipChat room:

## Prerequisites

* AWS account with access to IAM and Lambda
* Node.js 6.10
* NPM
* Yarn
* Caludia JS (Install https://claudiajs.com/tutorials/installing.html)
** Ensure you setup AWS key and secret

## Build Steps

* Once cloned locally navigate to the API folder
* Run `npm install` <- not sure why Yarn install fails
* Now run `yarn createaws`. This will setup everything is 
* Now you can `yarn build` which will lint and test your code
* To deploy the bot you will need to `yarn deplo`y to package evrything up and `yarn promote` to push it to aws

## Adding integration to a Room

When you `yarn promote` you will be returned a url. Copy this url and as /descriptor to the end. Now navigate to the hip chat room and select 'Integrations' on the menu option and folow steps below:

* Click 'Install new integartion' (must be room admin)
* 'Build your own Integration'
* 'Install an integration from a descriptor URL'
* Paste in teh URL output from teh promote with /descriptor on the end.

Happy Foosballing.

