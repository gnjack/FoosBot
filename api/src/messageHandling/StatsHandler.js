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
    const roomId = body.item.room.id
    const room = installation.rooms[roomId]
    const members = (room && room.members) || {}

    const name = normalizeName(message.message.split('stats').map(s => s.trim()).filter(s => s).join(''), message)
    return !name || name === 'global'
      ? this._globalStats(roomId, members)
      : this._playerStats(roomId, members, name)
  }

  async _playerStats (roomId, members, playerName) {
    if (!nameKnown(playerName, members)) {
      return notification.yellow.text(`Sorry, I don't know who ${playerName} is.`)
    }

    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })

    const league = new League(members)
    league.runLeague(matches)

    const player = league.players[playerName]
    let achievements = `<ul>`
    if (player.achievements.size > 0) {
      for (let achievement of player.achievements) {
        achievements += `<li>${achievement}</li>`
      }
      achievements += `</ul>`
    } else {
      achievements = `Keep playing to unlock acheivements!`
    }
    const list = `<ul>
<li>Skill level ${player.getRatingString(3)}, ranked ${player.getRankString()}. ${player.getNormalDistributionString()}</li>
<li>Played ${player.matches} matches. Won ${player.won}. Lost ${player.lost}.</li>
<li>Longest win streak: ${player.bestStreak}</li>
<li>Longest lose streak: ${-player.worstStreak}</li>
<li>Flawless victories: ${player.flawlessVictories}</li>
<li>Laps of shame: ${player.flawlessDefeats}</li>
</ul><br />
Achievements: ${achievements}`

    return notification.gray.html(`Player stats for ${antiXSS(player.getId())}: ${list}`)
  }

  async _globalStats (roomId, members) {
    const matches = await new QueryMatchesCommand(this._db).execute({ roomId })

    const league = new League(members)
    league.runLeague(matches)

    return notification.gray.html(`Global stats: <ul>
<li>${Object.keys(members).length} competitors</li>
<li>${league.stats.matchesCompleted} matches played</li>
<li>${league.stats.goals} goals scored</li>
<li>${process.env.addonName} has predicted ${(100 * league.stats.correctlyPredicted / league.stats.matchesCompleted).toFixed(1)}% of matches correctly</li>
</ul>`)
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
