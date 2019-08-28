import Proxmise = require('proxmise')
import get = require('lodash.get')
let DJSON = require('deterministic-json')
let axios = require('axios')

export default async function connect(app) {
  if (typeof app === 'object') {
    return {
      async send(tx) {
        let errors = app.run(tx)
        let ok = !errors[0]
        let log = errors[0] || ''
        let code = ok ? 0 : 1
        return {
          ok,
          log,
          height: '' + (ok ? app.height : 0),
          deliver_tx: { code, log },
          check_tx: { code, log }
        }
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
        let serializedTx = DJSON.stringify(tx)
        let { data } = await axios.post('http://localhost:' + app + '/txs', {
          tx: serializedTx
        })
        let { errors } = data
        let ok = !errors[0]
        let log = errors[0] || ''
        let code = ok ? 0 : 1

        return {
          ok,
          log,
          height: '' + (ok ? data.height : 0),
          deliver_tx: { code, log },
          check_tx: { code, log }
        }
      },
      state: Proxmise(async (path, resolve, reject) => {
        let statePart = (await axios.get(
          'http://localhost:' + app + '/state?path=' + path.join('.')
        )).data
        try {
          resolve(DJSON.parse(statePart.state))
        } catch (e) {
          resolve(null)
        }
      }),

      validators: [
        {
          address: '491ACC745C55559607095B13097254042F50C649',
          pub_key: {
            type: 'tendermint/PubKeyEd25519',
            value: 'bxrfV5GVu/GneAax2n7v45CJ+DPNh2VyZ1859Kw/eeU='
          },
          power: 10,
          voting_power: 10,
          name: ''
        }
      ]
    }
  }
}
