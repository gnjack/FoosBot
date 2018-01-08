import moment from 'moment'
import latinize from 'latinize'
import notification from '../notificationBuilder'
import CreateRoomCommand from '../db/rooms/CreateRoom'
import SaveMembersCommand from '../db/rooms/SaveMembers'
import QueryMatchesCommand from '../db/matchResults/QueryMatches'
import { and } from '../formatList'
import League from '../league'

export default class MembershipHandler {
  constructor (db) {
    this._db = db
  }

  async handle ({installation, body, message}) {
    const room = installation.rooms[body.item.room.id]
    const match = message.message.match(/^(add|remove|list|leaderboard|league)( members?)?\W? ?(.*)/i)
    switch (match && match[1].toLowerCase()) {
      case 'add':
        return this._add(room, body, createNamesMap(replaceMentions(match[3], message.mentions), message.from.name))
      case 'remove':
        return this._remove()
      case 'list':
      case 'leaderboard':
      case 'league':
        return this._list(room, body, match[3] ? match[3] : null)
      default:
        throw new Error(`MembershipHandler received non-matching message '${message.message}'`)
    }
  }

  async _add (room, body, namesMap) {
    const fullNames = Object.values(namesMap)
    if (fullNames.length === 0) {
      return notification.yellow.text(`Who do you want to add?`)
    }
    if (!room) {
      await this._createRoom(body)
    }
    const oauthId = body.oauth_client_id
    const roomId = body.item.room.id
    await new SaveMembersCommand(this._db).execute({ oauthId, roomId }, namesMap)
    return notification.green.text(`OK, I've added ${and(fullNames)} to the league.`)
  }

  async _remove () {
    return notification.yellow.text(`Sorry, I don't know how to remove competitors from the league yet. Why would anyone want to stop playing foosball anyway?`)
  }

  async _list (room, body, numberDays) {
    if (room && room.members && Object.keys(room.members).length > 0) {
      const league = new League(room.members)
      const roomId = body.item.room.id
      var leagueDays = ''
      var matches = await new QueryMatchesCommand(this._db).execute({ roomId })
      if (numberDays && parseInt(numberDays)) {
        leagueDays = ` for the last ${numberDays} days`
        matches = matches.filter(match => match.time > moment().subtract(numberDays, 'Days'))
      }
      league.runLeague(matches)
      const listItems = league.leaderboard.filter(p => p.matches > 0).map(p => p.getLeaderboardString())
      const tableHeaders = '<tr><td><em>|Rank</em></td><td><em>|Player</em></td><td><em>|Skill Level</em></td><td><em>|Played</em></td><td><em>|Won</em></td>' +
        '<td><em>|Lost</em></td><td><em>|Goals For</em></td><td><em>|Goals Against</em></td><td><em>|Avg. Win Dif</em></td><td><em>|Avg. Lost Dif</em></td>' +
        '<td><em>|Achievements</em></td></tr>'
      const list = `<table>${tableHeaders + listItems}</table>`
      return notification.gray.html(`Table football leaderboard, sorted by skill level${leagueDays}: ${list}`)
    } else {
      return notification.yellow.text(`There is no foosball league running in this room!`)
    }
  }

  async _createRoom (body) {
    const oauthId = body.oauth_client_id
    const roomId = body.item.room.id
    await new CreateRoomCommand(this._db).execute({ oauthId, roomId })
  }
}

function createNamesMap (namesString, myName) {
  const names = namesString.split(/(?:,| and )/gi).map(s => s.trim().replace(/^me$/i, myName)).filter(s => s)
  const namesMap = {}
  for (const name of names) {
    namesMap[latinize(name).toLowerCase()] = name
  }
  return namesMap
}

function replaceMentions (message, mentions) {
  for (const mention of mentions) {
    const regexp = new RegExp(`@${mention.mention_name}\\b`, 'gi')
    message = message.replace(regexp, `,${mention.name},`)
  }
  return message
}
