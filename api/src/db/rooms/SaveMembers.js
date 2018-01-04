
export default class RemoveRoomMembers {
  constructor (db) {
    this._db = db
  }

  async execute ({ oauthId, roomId }, namesMap) {
    const updateParams = {
      TableName: process.env.installationsTableName,
      Key: { oauthId: oauthId },
      ExpressionAttributeNames: { '#id': roomId.toString() },
      ExpressionAttributeValues: { }
    }
    let updateExpressions = []
    Object.keys(namesMap).forEach((normalizedName, i) => {
      updateExpressions.push(`rooms.#id.members.#n${i} = :n${i}`)
      updateParams.ExpressionAttributeNames['#n' + i] = normalizedName
      updateParams.ExpressionAttributeValues[':n' + i] = namesMap[normalizedName]
    })
    updateParams.UpdateExpression = 'SET ' + updateExpressions.join(', ')
    await this._db.update(updateParams).promise()
  }
}
