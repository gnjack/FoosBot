import notification from '../notificationBuilder'

export default class MembershipHandler {
  constructor (db) {
    this._db = db
  }

  async handle ({installation, body, message}) {
    var response = `Hey ${message.from.name.split(' ')[0]}, here's what I understand: <ul>
<li><b>help</b></li>
<li><b>add <i>[competitor]</i></b></li>
<li><b>list</b> - leaderboard of competitors and their current skill level</li>
<li><b><i>[red team]</i> vs <i>[blue team]</i></b> - start a new match</li>
<li><b>red <i>[score]</i> blue <i>[score]</i></b> - record the results of current match</li>
<li><b>cancel</b> - cancel current match</li>
<li><b><i>[competitor]</i> stats</b> - show detailed stats for a player</li>
</ul>`
    return notification.gray.html(response)
  }
}
