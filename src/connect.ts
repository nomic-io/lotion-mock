import Proxmise = require('proxmise')
import get = require('lodash.get')
let axios = require('axios')

export default async function connect(app) {
  if (typeof app === 'object') {
    return {
      async send(tx) {
        let errors = app.run(tx)
        let ok = !errors[0]
        return { ok, log: errors[0] || '', height: '' + (ok ? app.height : 0) }
      },
      state: Proxmise((path, resolve, reject) => {
        if (path.join('.')) {
          resolve(get(app.state, path.join('.')))
        } else {
          resolve(app.state)
        }
      })
    }
  } else if (typeof app === 'number') {
    return {
      async send(tx) {
        let { data } = await axios.post('http://localhost:' + app + '/txs', tx)
        let { errors } = data
        let ok = !errors[0]

        return { ok, log: errors[0] || '', height: '' + (ok ? data.height : 0) }
      },
      state: Proxmise(async (path, resolve, reject) => {
        let statePart = (await axios.get(
          'http://localhost:' + app + '/state?path=' + path.join('.')
        )).data
        resolve(statePart)
      })
    }
  }
}
