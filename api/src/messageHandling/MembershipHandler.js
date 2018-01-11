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
    const match = message.message.match(/^(add|remove|list-table|list|leaderboard|league)( members?)?\W? ?(.*)/i)
    switch (match && match[1].toLowerCase()) {
      case 'add':
        return this._add(room, body, createNamesMap(replaceMentions(match[3], message.mentions), message.from.name))
      case 'remove':
        return this._remove()
      case 'list':
      case 'leaderboard':
      case 'league':
        return this._list(room, body, match[3] ? match[3] : null)
      case 'list-table':
        return this._listTable(room, body)
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

  async _list (room, body, param) {
    if (room && room.members && Object.keys(room.members).length > 0) {
      const league = new League(room.members)
      const roomId = body.item.room.id
      var leagueDays = ''
      var matches = await new QueryMatchesCommand(this._db).execute({ roomId })
      if (param && parseInt(param)) {
        leagueDays = ` for the last ${param} days`
        matches = matches.filter(match => match.time > moment().subtract(param, 'Days'))
      }
      league.runLeague(matches)
      const listItems = league.leaderboard.filter(p => p.played > 0).map(p => p.getLeaderboardString()).join('</li><li>')
      const list = `<ol><li>${listItems}</li></ol>`
      const notPlayed = league.leaderboard.filter(p => p.played === 0).map(p => p.getLeaderboardString(false)).join('</li><li>')
      const notPlayedList = notPlayed ? `</br>The following players have not played a game: <ol><li>${notPlayed}</li></ol>` : ''
      return notification.gray.html(`Table football leaderboard, sorted by skill level${leagueDays}: ${list}${notPlayedList}`)
    } else {
      return notification.yellow.text(`There is no foosball league running in this room!`)
    }
  }

  async _listTable (room, body) {
    if (room && room.members && Object.keys(room.members).length > 0) {
      const league = new League(room.members)
      const roomId = body.item.room.id
      var matches = await new QueryMatchesCommand(this._db).execute({ roomId })
      league.runLeague(matches)
      const listItems = league.leaderboard.filter(p => p.played > 0).map(p => p.getVerboseLeaderboard())
      const tableHeaders = '<tr><td><em>|Rank</em></td><td><em>|Player</em></td><td><em>|Skill Level</em></td><td><em>|Played</em></td><td><em>|Won</em></td>' +
      '<td><em>|Lost</em></td><td><em>|Goals Scored</em></td><td><em>|Goals Conceded</em></td><td><em>|Avg. Win Dif</em></td><td><em>|Avg. Lost Dif</em></td>' +
      '<td><em>|Achievements</em></td></tr>'
      const list = `<table>${tableHeaders + listItems}</table>`
      return notification.gray.html(`Table football leaderboard, sorted by skill level: ${list}`)
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
