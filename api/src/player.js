import { Player as TSPlayer } from 'jstrueskill'
import antiXSS from './antiXSS'
import moment from 'moment'

export default class Player extends TSPlayer {
  constructor (name, rating) {
    super(name)
    this._rating = rating
    this._matches = 0
    this._won = 0
    this.lost = 0
    this.for = 0
    this.against = 0
    this.winDif = 0
    this.lostDif = 0
    this._streak = 0
    this._streakToday = 0
    this.bestStreak = 0
    this.worstStreak = 0
    this._flawlessVictories = 0
    this.flawlessDefeats = 0
    this._goalsScored = 0
    this._goalsConceded = 0
    this._matchesToday = 0
    this.achievements = new Set()
  }

  get won () {
    return this._won
  }

  set won (val) {
    this._won = val
    if (val > 1000) {
      this.achievements.add(`🎂 - 1K Victories (1000 games won))`)
    }
    if (val > 100) {
      this.achievements.add(`🍩 - Victory March (100 games won))`)
    }
  }

  get streakToday () {
    return this._streakToday
  }

  set streakToday (val) {
    this._streakToday = val
  }

  get goalsScored () {
    return this._goalsScored
  }

  set goalsScored (val) {
    this._goalsScored = val
    if (val >= 5000) {
      this.achievements.add(`💖 - Absent From Work (5000 goals scored)`)
    }
    if (val >= 1000) {
      this.achievements.add(`💗 - 1K goals (1000 goals scored)`)
    }
    if (val >= 500) {
      this.achievements.add(`💓 - Monkey (500 goals scored)`)
    }
    if (val >= 100) {
      this.achievements.add(`❤ - Century (100 goals scored)`)
    }
  }

  get goalsConceded () {
    return this._goalsConceded
  }

  set goalsConceded (val) {
    this._goalsConceded = val
  }

  get matches () {
    return this._matches
  }

  set matches (val) {
    this._matches = val
    if (val >= 500) {
      this.achievements.add(`🙉 - P45 Imminent (500 games played)`)
    }
    if (val >= 100) {
      this.achievements.add(`🙈 - NVM's Lost Millions (100 games played)`)
    }
    if (val >= 50) {
      this.achievements.add(`😫 - Slacker (50 games played)`)
    }
    if (val >= 1) {
      this.achievements.add(`🚼 - Newbie! (First game played)`)
    }
  }

  get flawlessVictories () {
    return this._flawlessVictories
  }

  set flawlessVictories (val) {
    this._flawlessVictories = val
    if (val >= 5) {
      this.achievements.add(`😈 - Bully (Ten - nilled 5 opponents)`)
    }
  }

  get streak () {
    return this._streak
  }

  set streak (val) {
    if (val >= 20) {
      this.achievements.add(`┌∩┐(◕◡◉)┌∩┐ Unstoppable - (Won 20 games in a row)`)
    }
    if (val >= 10) {
      this.achievements.add(`🐘 - Juggernaut (Won 10 games in a row)`)
    }
    if (val >= 5) {
      this.achievements.add(`🎢 - On A Roll (Won 5 games in a row)`)
    }
    this._streak = val
  }

  get played () {
    return this.won + this.lost
  }

  get rating () {
    return this._rating
  }

  set rating (val) {
    this._prevRating = this._rating
    this._rating = val
    if (this._rating >= 40) {
      this.achievements.add(`💰 - Legend (Achieved a rating of 40)`)
    }
    if (this._rating >= 30) {
      this.achievements.add(`🍺 - Pro (Achieved a rating of 30)`)
    }
    if (this._rating >= 20) {
      this.achievements.add(`👌 - Expert (Achieved a rating of 20)`)
    }
  }

  get rank () {
    return this._rank
  }

  set rank (val) {
    this._prevRank = this._rank
    this._rank = val

    if (this._rank === 1) {
      this.achievements.add(`👑 - King of the League (Reached 1st Place in the league)`)
    }
    if (this._rank <= 3) {
      this.achievements.add(`💮 - On the Podium (Reached top 3 in the league)`)
    }
  }

  trackMatch (match, redTeam, blueTeam) {
    const red = redTeam.getPlayers().some(p => p === this)
    const myScore = red ? match.scores[0] : match.scores[1]
    const oppScore = red ? match.scores[1] : match.scores[0]
    this.for = myScore + this.for
    this.against = oppScore + this.against

    this.matches ++
    if (oppScore === 0 && myScore >= 10) {
      this.flawlessVictories ++
    } else if (myScore === 0 && oppScore >= 10) {
      this.flawlessDefeats ++
    }
    if (myScore > oppScore) {
      this.won ++
      this.winDif = (myScore - oppScore) + this.winDif
      this.streak = Math.max(1, this.streak + 1)
      this.bestStreak = Math.max(this.bestStreak, this.streak)
      if (match.time.isSame(moment(), 'day')) {
        this.streakToday = Math.max(1, this.streakToday + 1)
      }
    } else if (oppScore > myScore) {
      this.lost ++
      this.lostDif = (oppScore - myScore) + this.lostDif
      this.streak = Math.min(-1, this.streak - 1)
      this.worstStreak = Math.min(this.worstStreak, this.streak)
      if (match.time.isSame(moment(), 'day')) {
        this.streakToday = Math.min(-1, this.streakToday - 1)
      }
    }

    if (myScore === (oppScore + 1)) {
      this.achievements.add(`😌 - Close Shave (Won by a single goal)`)
    }

    this.goalsScored += myScore
    this.goalsConceded += oppScore
  }

  getNotableEvents (league) {
    const events = []
    if (this.streak > 2 && this.streak >= this.bestStreak) {
      events.push(`${antiXSS(this.getId())} is on a personal best win streak of ${this.streak} matches in a row!`)
    }
    if (this.streak < -2 && this.streak <= this.worstStreak) {
      events.push(`${antiXSS(this.getId())} is on a personal low, losing ${-this.streak} matches in a row`)
    }
    if (this._rank < this._prevRank) {
      events.push(`${antiXSS(this.getId())} rises to ${getOrdinal(this._rank)} place, stealing the spot from ${antiXSS(league.leaderboard[this._prevRank - 1].getId())}`)
    }
    if (this._prevRank && this._prevRank <= 3 && this._rank > this._prevRank) {
      events.push(`${antiXSS(this.getId())} falls from ${getOrdinal(this._prevRank)} place on the podium to ${getOrdinal(this._rank)}, allowing ${antiXSS(league.leaderboard[this._prevRank - 1].getId())} to climb to ${getOrdinal(this._prevRank)}`)
    }
    if (this.streakToday > 1) {
      events.push(`${antiXSS(this.getId())} - ${dotaMultiKill(this.streakToday)}! (${this.streakToday} match win streak today)`)
    }
    if (this.streak > 2) {
      events.push(`${antiXSS(this.getId())} - ${dotaKillStreak(this.streak)}! (${this.streak} match win streak)`)
    }
    return events
  }

  getLeaderboardString (includeRating = true) {
    if (includeRating) {
      return `${antiXSS(this.getId())} (${this.getRatingString()})${this.flawlessVictories ? ' ' + '🔥'.repeat(this.flawlessVictories) : ''}${this.flawlessDefeats ? ' ' + '💩'.repeat(this.flawlessDefeats) : ''}`
    }
    return `${antiXSS(this.getId())}`
  }

  getVerboseLeaderboard () {
    var playerRow = []
    playerRow.push(
      `<tr>`,
      `<td>${this.rank}.</td>`,
      `<td>${antiXSS(this.getId())}</td>`,
      `<td>${this.getRatingString()}</td>`,
      `<td>${this.matches}</td>`,
      `<td>${this.won}</td>`,
      `<td>${this.lost}</td>`,
      `<td>${this.for}</td>`,
      `<td>${this.against}</td>`,
      `<td>${(this.winDif / this.matches).toFixed(1)}</td>`,
      `<td>${(this.lostDif / this.matches).toFixed(1)}</td>`,
      `<td>${this.flawlessVictories ? ' ' + '🔥'.repeat(this.flawlessVictories) : ''}${this.flawlessDefeats ? ' ' + '💩'.repeat(this.flawlessDefeats) : ''}</td>`,
      `</tr>`
    )
    return playerRow.join('')
  }

  getPostMatchString () {
    return `${antiXSS(this.getId())} - skill level ${this.getRatingString()} (${this.getRatingDeltaString()}) ranked ${this.getRankString()} (${this.getRankDeltaString()})`
  }

  getRatingString (precision = 1) {
    return this._rating.conservativeRating.toFixed(precision)
  }

  getRatingDeltaString () {
    const delta = this._prevRating ? this._rating.conservativeRating - this._prevRating.conservativeRating : 0
    return (delta < 0 ? '' : '+') + delta.toFixed(1)
  }

  getRankString () {
    return getOrdinal(this._rank)
  }

  getRankDeltaString () {
    const delta = this._prevRank ? this._prevRank - this._rank : 0
    return (delta < 0 ? '' : '+') + delta
  }

  getNormalDistributionString () {
    return `(μ ${this._rating.getMean().toFixed(1)}, σ ${this._rating.getStandardDeviation().toFixed(1)})`
  }
}

function getOrdinal (n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function dotaMultiKill (n) {
  switch (n) {
    case 2:
      return 'Double kill'
    case 3:
      return 'Triple kill'
    case 4:
      return 'Ultra kill'
    case (n >= 5):
      return 'Rampage'
    default:
      return null
  }
}

function dotaKillStreak (n) {
  switch (n) {
    case 3:
      return 'Killing Spree'
    case 4:
      return 'Dominating'
    case 5:
      return 'Mega Kill'
    case 6:
      return 'Unstoppable'
    case 7:
      return 'Wicked Sick'
    case 8:
      return 'M-M-M-Monster Kill'
    case 9:
      return 'Godlike'
    case (n >= 10):
      return 'Beyond Godlike'
    default:
      return null
  }
}
