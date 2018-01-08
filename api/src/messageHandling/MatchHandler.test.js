import test from '../test'
import sinon from 'sinon'
import MessageHandler from '.'

const matchHistoryTableName = process.env.matchHistoryTableName = 'matchHistoryTableName'
const roomId = 12321
let db, messageHandler, installation, body

function setupHandler () {
  process.env.addonName = 'FoosBot'
  installation = {
    oauthId: 'oauthId',
    oauthSecret: 'oauthSecret',
    rooms: {}
  }
  body = {
    oauth_client_id: 'oauthId',
    item: {
      message: {
        mentions: [],
        from: { name: 'My Name' }
      },
      room: {
        id: roomId
      }
    }
  }
  db = {
    query: sinon.stub().returns({ promise: () => { return { Items: [] } } }),
    update: sinon.stub().returns({ promise: () => {} }),
    put: sinon.stub().returns({ promise: () => {} }),
    delete: sinon.stub().returns({ promise: () => {} })
  }
  messageHandler = new MessageHandler(db)
}

test('MatchHandler # unknown names ', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B' } }
  body.item.message.mentions = [{mention_name: 'amention', name: 'A'}, {mention_name: 'unknown', name: 'Unknown Mention'}]
  body.item.message.message = '@amention @unknown vs b and Unknown Player'

  const response = await messageHandler.handle(installation, body)

  t.notCalled(db.put)
  t.textResponse(response, `Sorry, I don't know who 'Unknown Mention' or 'Unknown Player' are. If you want to add them, say '@FoosBot add Unknown Mention, Unknown Player'.`)
  t.end()
})

test('MatchHandler # start 1 v 1 match ', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B' } }
  body.item.message.mentions = [{mention_name: 'amention', name: 'A'}]
  body.item.message.message = '@amention vs b'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['<xss>'], ['a']], scores: [10, 5] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.calledWithMatch(db.put, {
    TableName: matchHistoryTableName,
    Item: {
      roomId,
      teams: [['a'], ['b']]
    }
  })
  t.textResponse(response, `Match started! Red - A (-0.9) VS Blue - B (0.0). Match Quality: 44%`)
  t.end()
})

test('MatchHandler # start 3 v 2 match ', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B', c: 'C', d: 'D' } }
  body.item.message.mentions = [{ mention_name: 'amention', name: 'A' }, { mention_name: 'xss', name: '<XSS>' }]
  body.item.message.message = '@xss @amention B vs C and D'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['<xss>'], ['a']], scores: [10, 5] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.calledWithMatch(db.put, {
    TableName: matchHistoryTableName,
    Item: {
      roomId,
      teams: [['<xss>', 'a', 'b'], ['c', 'd']]
    }
  })
  t.textResponse(response, `Match started! Red - <XSS> (7.9), A (-0.9) and B (0.0) VS Blue - C (0.0) and D (0.0). Match Quality: 21%`)
  t.end()
})

test('MatchHandler # start fails with matches already progress', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B' } }
  body.item.message.message = 'a vs b'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['a'], ['b']] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.notCalled(db.update)
  t.textResponse(response, `Sorry, a match is already in progess. Either cancel it by saying '@FoosBot cancel' or report the results using '@FoosBot red 5 blue 10' or '@FoosBot 5 10'.`)
  t.end()
})

for (const command of ['5 10', '5 - 10', 'red 5 blue 10', 'blue 10 red 5']) {
  test('MatchHandler # add results ' + command, async t => {
    setupHandler()
    installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A Name', b: 'B Name' } }
    body.item.message.message = command
    const dbMatches = {
      Items: [
        { id: 'match#1', teams: [['<xss>'], ['a']], scores: [10, 5] },
        { id: 'match#2', teams: [['a'], ['b']] }
      ]
    }
    db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

    const response = await messageHandler.handle(installation, body)

    t.calledWithExactly(db.update, {
      TableName: matchHistoryTableName,
      Key: { id: 'match#2' },
      UpdateExpression: 'SET teams = :t, scores = :s',
      ExpressionAttributeValues: {
        ':t': [['a'], ['b']],
        ':s': [5, 10]
      }
    })
    t.htmlResponse(response, `Congratulations B! Let's see how that changes your stats: <ul><li>A Name - skill level -1.3 (-0.4) ranked 3rd (+0)</li><li>B Name - skill level 6.9 (+6.9) ranked 2nd (+0)</li></ul>`)
    t.end()
  })
}

test('MatchHandler # add results - zero red team score', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B' } }
  body.item.message.message = '0 10'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['a'], ['<xss>']], scores: [10, 5] },
      { id: 'match#2', teams: [['b'], ['<xss>']] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.calledWithExactly(db.update, {
    TableName: matchHistoryTableName,
    Key: { id: 'match#2' },
    UpdateExpression: 'SET teams = :t, scores = :s',
    ExpressionAttributeValues: {
      ':t': [['b'], ['<xss>']],
      ':s': [0, 10]
    }
  })
  t.htmlResponse(response, `Congratulations &lt;XSS&gt;! Let's see how that changes your stats: <ul><li>B - skill level -1.6 (-1.6) ranked 3rd (-1)</li><li>&lt;XSS&gt; - skill level 6.3 (+7.2) ranked 2nd (+1)</li></ul>`)
  t.end()
})

test('MatchHandler # add results - first match', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B' } }
  body.item.message.message = '10 9'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['a'], ['b']] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.calledWithExactly(db.update, {
    TableName: matchHistoryTableName,
    Key: { id: 'match#1' },
    UpdateExpression: 'SET teams = :t, scores = :s',
    ExpressionAttributeValues: {
      ':t': [['a'], ['b']],
      ':s': [10, 9]
    }
  })
  t.htmlResponse(response, `Congratulations A! Let's see how that changes your stats: <ul><li>A - skill level 7.9 (+7.9) ranked 1st (+0)</li><li>B - skill level -0.9 (-0.9) ranked 3rd (+0)</li></ul>`)
  t.end()
})

test('MatchHandler # adding results when no match in progress updates previous match', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B' } }
  body.item.message.message = '10 9'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['a'], ['b']], scores: [5, 10] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.calledWithExactly(db.update, {
    TableName: matchHistoryTableName,
    Key: { id: 'match#1' },
    UpdateExpression: 'SET teams = :t, scores = :s',
    ExpressionAttributeValues: {
      ':t': [['a'], ['b']],
      ':s': [10, 9]
    }
  })
  t.htmlResponse(response, `Congratulations A! Let's see how that changes your stats: <ul><li>A - skill level 7.9 (+7.9) ranked 1st (+0)</li><li>B - skill level -0.9 (-0.9) ranked 3rd (+0)</li></ul>`)
  t.end()
})

test('MatchHandler # add results - 3 v 2', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B', c: 'C', d: 'D' } }
  body.item.message.message = '10 9'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['<xss>', 'a', 'b'], ['c', 'd']] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.calledWithExactly(db.update, {
    TableName: matchHistoryTableName,
    Key: { id: 'match#1' },
    UpdateExpression: 'SET teams = :t, scores = :s',
    ExpressionAttributeValues: {
      ':t': [['<xss>', 'a', 'b'], ['c', 'd']],
      ':s': [10, 9]
    }
  })
  t.htmlResponse(response, `Congratulations Red team! Let's see how that changes your stats: <ul><li>&lt;XSS&gt; - skill level 1.4 (+1.4) ranked 1st (+0)</li><li>A - skill level 1.4 (+1.4) ranked 2nd (+0)</li><li>B - skill level 1.4 (+1.4) ranked 3rd (+0)</li><li>C - skill level -0.1 (-0.1) ranked 4th (+0)</li><li>D - skill level -0.1 (-0.1) ranked 5th (+0)</li></ul>`)
  t.end()
})

for (const command of ['@red vs @blue 5 10', 'Red Player v Blue Player blue 10 red 5']) {
  test('MatchHandler # add match with results ' + command, async t => {
    setupHandler()
    installation.rooms[roomId] = { members: { '<xss>': '<XSS>', 'red player': 'Red Player', 'blue player': 'Blue Player' } }
    body.item.message.mentions = [{ mention_name: 'red', name: 'Red Player' }, { mention_name: 'blue', name: 'Blue Player' }]
    body.item.message.message = command
    const dbMatches = {
      Items: [
        { id: 'match#1', teams: [['<xss>'], ['red player']], scores: [10, 5] }
      ]
    }
    db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

    const response = await messageHandler.handle(installation, body)

    t.calledWithMatch(db.put, {
      TableName: matchHistoryTableName,
      Item: {
        roomId,
        teams: [['red player'], ['blue player']],
        scores: [5, 10]
      }
    })
    t.notCalled(db.update)
    // t.textResponse(response, `Match started! Red - Red Player (-0.9) VS Blue - Blue Player (0.0). Match Quality: 44%`)
    t.htmlResponse(response, `Congratulations Blue! Let's see how that changes your stats: <ul><li>Red Player - skill level -1.3 (-0.4) ranked 3rd (+0)</li><li>Blue Player - skill level 6.9 (+6.9) ranked 2nd (+0)</li></ul>`)
    t.end()
  })
}

test('MatchHandler # cancel match in progress', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B' } }
  body.item.message.message = 'cancel'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['a'], ['b']] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.calledWithExactly(db.delete, {
    TableName: matchHistoryTableName,
    Key: { id: 'match#1' }
  })
  t.htmlResponse(response, `Canceled current match`)
  t.end()
})

test('MatchHandler # cancel fails with no matches in progress', async t => {
  setupHandler()
  installation.rooms[roomId] = { members: { '<xss>': '<XSS>', a: 'A', b: 'B' } }
  body.item.message.message = 'cancel'
  const dbMatches = {
    Items: [
      { id: 'match#1', teams: [['a'], ['b']], scores: [10, 5] }
    ]
  }
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => dbMatches })

  const response = await messageHandler.handle(installation, body)

  t.notCalled(db.delete)
  t.textResponse(response, `Sorry, no match is in progress to cancel. Start one by saying '@FoosBot @RedPlayer vs @BluePlayer'.`)
  t.end()
})
