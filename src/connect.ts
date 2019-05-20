import Proxmise = require('proxmise')
import get = require('lodash.get')

export default async function connect(app) {
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
}
