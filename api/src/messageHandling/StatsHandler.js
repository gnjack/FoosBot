import notification from '../notificationBuilder'
import latinize from 'latinize'
import antiXSS from '../antiXSS'
import League from '../league'
import QueryMatchesCommand from '../db/matchResults/QueryMatches'

export default class MatchHandler {
  constructor (db) {
    this._db = db
  }

  async handle ({installation, body, message}) {
    const room = installation.rooms[body.item.room.id]

    const name = message.message.split('stats').map(s => s.trim()).filter(s => s).join('')
    return this._playerStats(room, body, normalizeName(name, message))
  }

  async _playerStats (room, body, playerName) {
    const members = (room && room.members) || {}
    if (!nameKnown(playerName, members)) {
      return notification.yellow.text(`Sorry, I don't know who ${playerName} is.`)
    }

    const roomId = body.item.room.id
    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })

    const league = new League(room.members)
    league.runLeague(matches)

    const player = league.players[playerName]
    const list = `<ul>
<li>Skill level ${player.getRatingString(3)}, ranked ${player.getRankString()}. ${player.getNormalDistributionString()}</li>
<li>Played ${player.matches} matches. Won ${player.won}. Lost ${player.lost}.</li>
<li>Longest win streak: ${player.bestStreak}</li>
<li>Longest lose streak: ${-player.worstStreak}</li>
<li>Flawless victories: ${player.flawlessVictories}</li>
<li>Laps of shame: ${player.flawlessDefeats}</li>
</ul>`
    return notification.gray.html(`Player stats for ${antiXSS(player.getId())}: ${list}`)
  }
}

function normalizeName (text, message) {
  let name = message.mentions.length ? message.mentions[0].name : text.trim()
  if (/(^(me|my|i)$)/i.test(name)) {
    name = message.from.name
  }
  return latinize(name).toLowerCase()
}

function nameKnown (normalizedName, members) {
  return Object.keys(members).includes(normalizedName)
}
