import { Player as TSPlayer } from 'jstrueskill'
import antiXSS from './antiXSS'
import moment from 'moment'

export default class Player extends TSPlayer {
  constructor (name, rating) {
    super(name)
    this._rating = rating
    this.matches = 0
    this.won = 0
    this.lost = 0
    this.streak = 0
    this.streakToday = 0
    this.bestStreak = 0
    this.worstStreak = 0
    this.flawlessVictories = 0
    this.flawlessDefeats = 0
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
  }

  get rank () {
    return this._rank
  }

  set rank (val) {
    this._prevRank = this._rank
    this._rank = val
  }

  trackMatch (match, redTeam, blueTeam) {
    const red = redTeam.getPlayers().some(p => p === this)
    const myScore = red ? match.scores[0] : match.scores[1]
    const oppScore = red ? match.scores[1] : match.scores[0]

    this.matches ++
    if (oppScore === 0 && myScore >= 10) {
      this.flawlessVictories ++
    } else if (myScore === 0 && oppScore >= 10) {
      this.flawlessDefeats ++
    }
    if (myScore > oppScore) {
      this.won ++
      this.streak = Math.max(1, this.streak + 1)
      this.bestStreak = Math.max(this.bestStreak, this.streak)
      if (match.time.isSame(moment(), 'day')) {
        this.streakToday = Math.max(1, this.streakToday + 1)
      }
    } else if (oppScore > myScore) {
      this.lost ++
      this.streak = Math.min(-1, this.streak - 1)
      this.worstStreak = Math.min(this.worstStreak, this.streak)
      if (match.time.isSame(moment(), 'day')) {
        this.streakToday = Math.min(-1, this.streakToday - 1)
    }
  }
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
