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
    const roomId = body.item.room.id
    const room = installation.rooms[body.item.room.id]
    const members = (room && room.members) || {}
    const vsRegex = /^(.*) (?:versus|vs?\.?) (.*)/i

    const resultMatch = message.message.match(/(?:^| )(?:(?:red\s*)?(\d+)[\s-]+)?(?:blue\s*)?(\d+)(?:[\s-]+(?:red\s*)?(\d+))?$/i)
    if (resultMatch) {
      const scores = [parseInt(resultMatch[1]) || parseInt(resultMatch[3]) || 0, parseInt(resultMatch[2])]
      const vsMatch = message.message.replace(resultMatch[0], '').match(vsRegex)
      if (vsMatch) {
        return this._start(roomId, members, message, vsMatch[1], vsMatch[2], scores)
      } else {
        return this._result(roomId, members, scores)
      }
    }

    const vsMatch = message.message.match(vsRegex)
    if (vsMatch) {
      return this._start(roomId, members, message, vsMatch[1], vsMatch[2])
    }

    if (message.message.match(/\b(cancel)\b/i)) {
      return this._cancel(roomId)
    }

    throw new Error(`MatchHandler received non-matching message '${message.message}'`)
  }

  async _start (roomId, members, message, redTeamText, blueTeamText, scores) {
    const red = findKnownNames(redTeamText, members, message)
    const blue = findKnownNames(blueTeamText, members, message)

    const unknownNames = red.unknownNames.concat(blue.unknownNames)
    if (unknownNames.length > 0) {
      const verb = unknownNames.length === 1 ? 'is' : 'are'
      return notification.yellow.text(`Sorry, I don't know who ${or(unknownNames.map(s => `'${s}'`))} ${verb}. If you want to add them, say '@${process.env.addonName} add ${unknownNames.join(', ')}'.`)
    }

    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })
    if (matches.length > 0 && !matches[matches.length - 1].scores) {
      return notification.yellow.text(`Sorry, a match is already in progess. Either cancel it by saying '@${process.env.addonName} cancel' or report the results using '@${process.env.addonName} red 5 blue 10' or '@${process.env.addonName} 5 10'.`)
    }

    const match = {
      roomId,
      teams: [red.knownNames, blue.knownNames],
      scores: scores
    }
    matches.push(match)
    await new SaveMatchCommand(this._db).execute(match)

    const league = new League(members)
    league.runLeague(matches)

    if (scores) {
      return this._resultNotification(league, match)
    }

    const quality = league.calculateMatchQuality(match)
    const redTeamString = and(red.knownNames.map(s => `${members[s]} (${league.players[s].getRatingString()})`))
    const blueTeamString = and(blue.knownNames.map(s => `${members[s]} (${league.players[s].getRatingString()})`))
    return notification.green.text(`Match started! Red - ${redTeamString} VS Blue - ${blueTeamString}. Match Quality: ${(quality * 100).toFixed(0)}%`)
  }

  async _cancel (roomId) {
    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })
    if (matches.length > 0 && matches[matches.length - 1].scores) {
      return notification.yellow.text(`Sorry, no match is in progress to cancel. Start one by saying '@${process.env.addonName} @RedPlayer vs @BluePlayer'.`)
    }

    const lastMatch = matches[matches.length - 1]
    await new DeleteMatchCommand(this._db).execute(lastMatch)

    return notification.green.html(`Canceled current match`)
  }

  async _result (roomId, members, scores) {
    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })
    const lastMatch = matches[matches.length - 1]
    lastMatch.scores = scores

    await new UpdateMatchCommand(this._db).execute(lastMatch)

    const league = new League(members)
    league.runLeague(matches)

    return this._resultNotification(league, lastMatch)
  }

  _resultNotification (league, lastMatch) {
    const redTeam = lastMatch.teams[0].map(p => league.players[p])
    const blueTeam = lastMatch.teams[1].map(p => league.players[p])
    const lastPlayers = redTeam.concat(blueTeam)
    const listItems = lastPlayers.map(p => p.getPostMatchString()).join('</li><li>')
    const list = `<ul><li>${listItems}</li></ul>`
    const greeting = lastMatch.scores[0] === lastMatch.scores[1]
      ? '(wow) A draw!?!?'
      : `Congratulations ${lastMatch.scores[0] > lastMatch.scores[1] ? getTeamName('Red', redTeam) : getTeamName('Blue', blueTeam)}!`
    const notableEvents = [].concat(...lastPlayers.map(p => p.getNotableEvents(league))).join('<br>')
    return notification.green.html(`${greeting} Let's see how that changes your stats: ${list}${notableEvents}`)
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
