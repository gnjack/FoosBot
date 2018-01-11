import notification from '../notificationBuilder'

export default class MembershipHandler {
  constructor (db) {
    this._db = db
  }

  async handle ({installation, body, message}) {
    var response = `Hey ${message.from.name.split(' ')[0]}, here's what I understand: <ul>
<li><b>help</b></li>
<li><b>add <i>&lt;competitor&gt;</i></b></li>
<li><b>list <i>[&lt;days&gt;]</i></b> - leaderboard of competitors and their current skill level, optionally only covering the last <i>&lt;days&gt;</i> of matches</li>
<li><b>list-table</b> - leaderboard of competitors with all additional Stats</li>
<li><b><i>&lt;red team&gt;</i> vs <i>&lt;blue team&gt;</i> <i>[&lt;results&gt;]</i></b> - start a new match, optionally recording the results immediately</li>
<li><b>red <i>&lt;score&gt;</i> blue <i>&lt;score&gt;</i></b> or <b><i>&lt;red score&gt;</i> <i>&lt;blue score&gt;</i></b> - record the results of current match</li>
<li><b>cancel</b> - cancel current match</li>
<li><b><i>&lt;competitor&gt;</i> stats</b> - show detailed stats for a player</li>
<li><b>[global] stats</b> - show stats for the entire league</li>
</ul>`
    return notification.gray.html(response)
  }
}
