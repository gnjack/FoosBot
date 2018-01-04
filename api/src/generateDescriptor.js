export default (root) => ({
  'name': process.env.addonName,
  'key': process.env.addonKey,
  'links': {
    'self': `${root}/descriptor`
  },
  'description': 'FoosBot tracks foosball match results and player stats, ranking all players by skill',
  'capabilities': {
    'installable': {
      'allowGlobal': true,
      'allowRoom': true,
      'callbackUrl': `${root}/installed`,
      'updateCallbackUrl': `${root}/updated`
    },
    'webhook': [
      {
        'event': 'room_message',
        'pattern': `@${createCaseInsensitiveRegExp(process.env.addonName)}\\b`,
        'url': `${root}/message`,
        'name': 'foosbot message webhook',
        'authentication': 'jwt'
      }
    ],
    'hipchatApiConsumer': {
      'scopes': [
        'send_notification'
      ]
    }
  }
})

function createCaseInsensitiveRegExp (text) {
  return text.replace(/[a-zA-Z]/g, (x) => `[${x.toUpperCase()}${x.toLowerCase()}]`)
}
