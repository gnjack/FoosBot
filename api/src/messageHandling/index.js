import MembershipHandler from './MembershipHandler'
import MatchHandler from './MatchHandler'
import HelpHandler from './HelpHandler'
import notification from '../notificationBuilder'

export default class MessageHandler {
  constructor (db, { random } = {}) {
    this._db = db
    this._random = random
  }

  async handle (installation, body) {
    const message = body.item.message
    const handler = this._getHandler(message.message)
    if (handler) {
      return handler.handle({installation, body, message})
    }
    return notification.red.text(`I'm sorry ${message.from.name.split(' ')[0]}, I'm afraid I can't do that`)
  }

  _getHandler (messageText) {
    const isMatch = (regex) => regex.test(messageText)
    if (isMatch(/^(help|hi|hey|hello)\b/i)) {
      return new HelpHandler(this._db)
    } else if (isMatch(/^(add|remove|list|leaderboard|league)\b/i)) {
      return new MembershipHandler(this._db)
    } else if (isMatch(/\b(cancel|versus|vs?\.?|red|blue|\d+\D+\b\d+)\b/i)) {
      return new MatchHandler(this._db)
    }
    return null
  }
}
