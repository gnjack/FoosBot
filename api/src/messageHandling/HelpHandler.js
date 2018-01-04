import notification from '../notificationBuilder'

export default class MembershipHandler {
  constructor (db) {
    this._db = db
  }

  async handle ({installation, body, message}) {
    var response = `Hey ${message.from.name.split(' ')[0]}, here's what I understand: <ul>`
    response += `<li><b>help</b></li>`
    response += `<li><b>add <i>[competitor]</i></b></li>`
    response += `<li><b>list</b> - leaderboard of competitors and their current skill level</li>`
    response += `<li><b><i>[red team]</i> vs <i>[blue team]</i></b> - start a new match</li>`
    response += `<li><b>red <i>[score]</i> blue <i>[score]</i></b> - record the results of current match</li>`
    response += `<li><b>cancel</b> - cancel current match</li>`
    response += `</ul>`
    return notification.gray.html(response)
  }
}
