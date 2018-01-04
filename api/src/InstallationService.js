import CreateInstallationCommand from './db/installations/CreateInstallation'
import DeleteInstallationCommand from './db/installations/DeleteInstallation'

export default class InstallationService {
  constructor (db) {
    this._db = db
  }

  async install ({oauthId, oauthSecret, capabilitiesUrl, roomId, groupId}) {
    if (capabilitiesUrl !== 'https://api.hipchat.com/v2/capabilities') {
      throw new Error(`Unexpected capabilities URL: '${capabilitiesUrl}'`)
    }
    const oauthTokenUrl = 'https://api.hipchat.com/v2/oauth/token'
    const hipchatApiUrl = 'https://api.hipchat.com/v2/'
    const installation = { oauthId, oauthSecret, groupId, oauthTokenUrl, hipchatApiUrl, roomId }
    await new CreateInstallationCommand(this._db).execute(installation)
  }

  async uninstall (oauthId) {
    await new DeleteInstallationCommand(this._db).execute(oauthId)
  }
}
