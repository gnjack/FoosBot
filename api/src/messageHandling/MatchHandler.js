import notification from '../notificationBuilder'
import latinize from 'latinize'
import antiXSS from '../antiXSS'
import { and, or } from '../formatList'
import League from '../league'
import SaveMatchCommand from '../db/matchResults/SaveMatch'
import UpdateMatchCommand from '../db/matchResults/UpdateMatch'
import DeleteMatchCommand from '../db/matchResults/DeleteMatch'
import QueryMatchesCommand from '../db/matchResults/QueryMatches'

export default class MatchHandler {
  constructor (db) {
    this._db = db
  }

  async handle ({installation, body, message}) {
    const room = installation.rooms[body.item.room.id]
    const match = message.message.match(/\b(cancel|versus|vs?\.?)\b/i)

    if (message.message.match(/\bcancel\b/i)) {
      return this._cancel(room, body)
    }

    const vsMatch = message.message.match(/(.*) (?:versus|vs?\.?) (.*)/i)
    if (vsMatch) {
      return this._start(room, body, message, vsMatch[1], vsMatch[2])
    }

    switch (match && match[1].toLowerCase()) {
      case 'cancel':
        return this._cancel(room, body)
      case 'versus':
      case 'vs':
      case 'vs.':
      case 'v':
      case 'v.':
        return this._start(room, body)
      default:
        const resultMatch = message.message.match(/^(?:(?:red\D*)?(\d+)\D+)?(?:blue\D*)?(\d+)(?:\D+(?:red\D*)?(\d+))?$/i)
        if (!resultMatch) throw new Error(`MatchHandler received non-matching message '${message.message}'`)
        return this._result(room, body, parseInt(resultMatch[1]) || parseInt(resultMatch[3]) || 0, parseInt(resultMatch[2]))
    }
  }

  async _start (room, body, message, redTeamText, blueTeamText) {
    const members = (room && room.members) || {}
    const red = findKnownNames(redTeamText, members, message)
    const blue = findKnownNames(blueTeamText, members, message)

    const unknownNames = red.unknownNames.concat(blue.unknownNames)
    if (unknownNames.length > 0) {
      const verb = unknownNames.length === 1 ? 'is' : 'are'
      return notification.yellow.text(`Sorry, I don't know who ${or(unknownNames.map(s => `'${s}'`))} ${verb}. If you want to add them, say '@${process.env.addonName} add ${unknownNames.join(', ')}'.`)
    }

    const roomId = body.item.room.id
    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })
    if (matches.length > 0 && !matches[matches.length - 1].scores) {
      return notification.yellow.text(`Sorry, a match is already in progess. Either cancel it by saying '@${process.env.addonName} cancel' or report the results using '@${process.env.addonName} red 5 blue 10' or '@${process.env.addonName} 5 10'.`)
    }

    const league = new League(room.members)
    league.runLeague(matches)

    const match = {
      roomId,
      teams: [red.knownNames, blue.knownNames]
    }
    await new SaveMatchCommand(this._db).execute(match)

    const quality = league.calculateMatchQuality(match)
    const redTeamString = and(red.knownNames.map(s => `${members[s]} (${league.players[s].getRatingString()})`))
    const blueTeamString = and(blue.knownNames.map(s => `${members[s]} (${league.players[s].getRatingString()})`))
    return notification.green.text(`Match started! Red - ${redTeamString} VS Blue - ${blueTeamString}. Match Quality: ${(quality * 100).toFixed(0)}%`)
  }

  async _cancel (room, body) {
    const roomId = body.item.room.id
    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })
    if (matches.length > 0 && matches[matches.length - 1].scores) {
      return notification.yellow.text(`Sorry, no match is in progress to cancel. Start one by saying '@${process.env.addonName} @RedPlayer vs @BluePlayer'.`)
    }

    const lastMatch = matches[matches.length - 1]
    await new DeleteMatchCommand(this._db).execute(lastMatch)

    return notification.green.html(`Canceled current match`)
  }

  async _result (room, body, redScore, blueScore) {
    const roomId = body.item.room.id
    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })
    const lastMatch = matches[matches.length - 1]
    lastMatch.scores = [redScore, blueScore]

    await new UpdateMatchCommand(this._db).execute(lastMatch)

    const league = new League(room.members)
    league.runLeague(matches)

    const redTeam = lastMatch.teams[0].map(p => league.players[p])
    const blueTeam = lastMatch.teams[1].map(p => league.players[p])
    const lastPlayers = redTeam.concat(blueTeam)
    const listItems = lastPlayers.map(p => p.getPostMatchString()).join('</li><li>')
    const list = `<ul><li>${listItems}</li></ul>`
    const greeting = redScore === blueScore
      ? '(wow) A draw!?!?'
      : `Congratulations ${redScore > blueScore ? getTeamName('Red', redTeam) : getTeamName('Blue', blueTeam)}!`
    return notification.green.html(`${greeting} Let's see how that changes your stats: ${list}`)
  }
}

function getTeamName (color, team) {
  return team.length > 1 ? color + ' team' : antiXSS(team[0].getId().split(' ')[0])
}

function findKnownNames (namesList, members, message) {
  const memberNames = Object.keys(members)
  const names = replaceMentions(namesList, message.mentions).split(/(?:,| and )/gi).map(s => s.trim()).filter(s => s)
  const knownNames = []
  const unknownNames = []
  for (let name of names) {
    if (/(^(me|i)$)/i.test(name)) {
      name = message.from.name
    }
    const normalizedName = latinize(name).toLowerCase()
    if (memberNames.includes(normalizedName)) {
      knownNames.push(normalizedName)
    } else {
      const candidates = memberNames.filter(n => n.startsWith(normalizedName))
      if (candidates.length === 1) {
        knownNames.push(candidates[0])
      } else {
        unknownNames.push(name)
      }
    }
  }
  return { knownNames, unknownNames }
}

function replaceMentions (message, mentions) {
  for (const mention of mentions) {
    const regexp = new RegExp(`@${mention.mention_name}\\b`, 'gi')
    message = message.replace(regexp, ` ,${mention.name}, `)
  }
  return message
}
