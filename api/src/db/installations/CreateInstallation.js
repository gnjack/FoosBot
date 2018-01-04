
export default class CreateInstallation {
  constructor (db) {
    this._db = db
  }

  async execute ({ oauthId, oauthSecret, groupId, oauthTokenUrl, hipchatApiUrl, roomId }) {
    const installation = { oauthId, oauthSecret, groupId, oauthTokenUrl, hipchatApiUrl, rooms: {} }
    if (roomId) {
      installation.roomId = roomId
    }
    await this._db.put({
      TableName: process.env.installationsTableName,
      Item: installation
    }).promise()
  }
}
