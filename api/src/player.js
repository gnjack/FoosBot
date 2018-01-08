import { Player as TSPlayer } from 'jstrueskill'
import antiXSS from './antiXSS'

export default class Player extends TSPlayer {
  constructor (name, rating) {
    super(name)
    this._rating = rating
    this._matches = 0
    this.won = 0
    this.lost = 0
    this.for = 0
    this.against = 0
    this.winDif = 0
    this.lostDif = 0
    this.streak = 0
    this.bestStreak = 0
    this.worstStreak = 0
    this.flawlessVictories = 0
    this.flawlessDefeats = 0
  }

  set matches (val) {
    this._matches = val
  }

  get matches () {
    return this._matches
  }

  get idString () {
    return antiXSS(this.getId())
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
    } else if (oppScore > myScore) {
      this.lost ++
      this.lostDif = (oppScore - myScore) + this.lostDif
      this.streak = Math.min(-1, this.streak - 1)
      this.worstStreak = Math.min(this.worstStreak, this.streak)
    }
  }

  getLeaderboardString () {
    var playerRow = []
    playerRow.push(
      `<tr>`,
      `<td>${this.rank}</td>`,
      `<td>${this.idString}</td>`,
      `<td>${this.getRatingString()}</td>`,
      `<td>${this.matches}</td>`,
      `<td>${this.won}</td>`,
      `<td>${this.lost}</td>`,
      `<td>${this.for}</td>`,
      `<td>${this.against}</td>`,
      `<td>${(this.winDif / this.matches).toFixed(1)}</td>`,
      `<td>${(this.lostDif / this.matches).toFixed(1)}</td>`,
      `<td>${this.flawlessVictories ? '🔥'.repeat(this.flawlessVictories) : ''}${this.flawlessDefeats ? ' ' + '💩'.repeat(this.flawlessDefeats) : ''}</td>`,
      `</tr>`
    )
    return playerRow.join('')
  }

  getPostMatchString () {
    return `${this.idString} - skill level ${this.getRatingString()} (${this.getRatingDeltaString()}) ranked ${this.getRankString()} (${this.getRankDeltaString()})`
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
