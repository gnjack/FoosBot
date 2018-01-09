import { GameInfo, Team } from 'jstrueskill'
import SkillCalculator from 'jstrueskill/lib/trueskill/TwoTeamTrueSkillCalculator'
import Player from './player'

export default class League {
  constructor (members) {
    this._gameInfo = GameInfo.getDefaultGameInfo()
    this._calc = new SkillCalculator()
    this.players = this.createPlayers(members)
    this.stats = {
      matchesCompleted: 0,
      correctlyPredicted: 0,
      goals: 0
    }
  }

  get leaderboard () {
    return Object.values(this.players).sort((a, b) => b.rating.conservativeRating - a.rating.conservativeRating)
  }

  runLeague (matches) {
    for (var match of matches) {
      if (match.scores && match.scores.length) {
        this.runMatch(match)
      }
    }
    return this.players
  }

  createPlayers (members) {
    return Object.keys(members).reduce((p, key) => {
      p[key] = new Player(members[key], this._gameInfo.getDefaultRating())
      return p
    }, {})
  }

  calculateMatchQuality (match) {
    const red = this.newTeam('Red', match.teams[0].map(k => this.players[k]))
    const blue = this.newTeam('Blue', match.teams[1].map(k => this.players[k]))
    const teams = Team.concat(red, blue)
    return this._calc.calculateMatchQuality(this._gameInfo, teams)
  }

  runMatch (match) {
    const red = this.newTeam('Red', match.teams[0].map(k => this.players[k]))
    const blue = this.newTeam('Blue', match.teams[1].map(k => this.players[k]))
    const teams = Team.concat(red, blue)
    const ranks = match.scores.map(s => Math.max(...match.scores) + 1 - s)
    const newRatings = this._calc.calculateNewRatings(this._gameInfo, teams, ranks)
    const teamRatings = teams.map(t => t.players.reduce((r, p) => r + p.rating.conservativeRating, 0))
    if ((match.scores[0] >= match.scores[1]) === (teamRatings[0] >= teamRatings[1])) {
      this.stats.correctlyPredicted ++
    }
    this.stats.goals += match.scores.reduce((a, b) => a + b, 0)
    this.stats.matchesCompleted ++

    for (var team of teams) {
      for (var player of team.getPlayers()) {
        player.rating = newRatings[player]
        player.trackMatch(match, red, blue)
      }
    }
    const leaderboard = this.leaderboard
    for (var i = 0; i < leaderboard.length; i++) {
      leaderboard[i].rank = i + 1
    }
  }

  newTeam (name, players) {
    const team = new Team(name)
    for (var p of players) {
      team.addPlayer(p, p.rating)
    }
    return team
  }
}
