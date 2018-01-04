import moment from 'moment'

export default class QueryMatches {
  constructor (db) {
    this._db = db
  }

  async execute ({ roomId }) {
    const queryParams = {
      TableName: process.env.matchHistoryTableName,
      IndexName: 'roomId',
      KeyConditionExpression: 'roomId = :roomId',
      ExpressionAttributeValues: {
        ':roomId': roomId
      }
    }
    const result = await this._db.query(queryParams).promise()
    return result.Items.map(e => ({
      id: e.id,
      roomId: e.roomId,
      teams: e.teams,
      scores: e.scores,
      time: moment.unix(e.time)
    }))
  }
}
