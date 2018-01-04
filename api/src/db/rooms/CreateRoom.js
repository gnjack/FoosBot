
export default class CreateRoom {
  constructor (db) {
    this._db = db
  }

  async execute ({ oauthId, roomId }) {
    const defaultRoom = {
      members: {}
    }
    await this._db.update({
      TableName: process.env.installationsTableName,
      Key: { oauthId },
      UpdateExpression: 'SET rooms.#id = :r',
      ConditionExpression: 'attribute_not_exists(rooms.#id)',
      ExpressionAttributeNames: { '#id': roomId.toString() },
      ExpressionAttributeValues: { ':r': defaultRoom }
    }).promise()
  }
}
