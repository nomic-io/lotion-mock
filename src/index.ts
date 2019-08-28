import StateMachine from 'lotion-state-machine'
import { stringify, parse } from 'deterministic-json'
import mockedConnect from './connect'
import get = require('lodash.get')
import { join } from 'path'
import * as fs from 'fs-extra'
import * as os from 'os'
let express = require('express')
let cors = require('cors')
let bodyParser = require('body-parser')

interface Checkpoint {
  state: any
  context: {
    validators: {
      [index: string]: number
    }
  }
  height: number
}

let MockedLotion: any = function(opts) {
  let app = StateMachine(opts)
  let stateMachine
  return {
    height: 1,

    close() {
      return new Promise((resolve, reject) => {
        this.httpServer.close(() => resolve())
      })
    },
    async start(port?: number) {
      stateMachine = app.compile(opts.initialState)
      stateMachine.initialize(opts.initialState, {
        validators: { 'bxrfV5GVu/GneAax2n7v45CJ+DPNh2VyZ1859Kw/eeU=': 10 }
      })
      if (port) {
        let expressApp = express()
        expressApp.use(cors())
        expressApp.use(bodyParser.json())

        expressApp.post('/txs', (req, res) => {
          let tx = parse(req.body.tx)
          res.json({ errors: this.run(tx), height: this.height })
        })

        expressApp.get('/state', (req, res) => {
          let statePart = req.query.path
            ? get(this.state, req.query.path)
            : this.state
          res.json({ state: stringify(statePart) })
        })

        this.httpServer = expressApp.listen(port)
      }

      let home = fs.mkdtempSync(os.tmpdir())
      fs.mkdirSync(join(home, 'config'))

      let genesisDestPath = join(home, 'config', 'genesis.json')
      let privkeyDestPath = join(home, 'config', 'priv_validator_key.json')

      fs.copyFileSync(
        join(__filename, '..', '..', 'data', 'mock-genesis.json'),
        genesisDestPath
      )

      fs.copyFileSync(
        join(__filename, '..', '..', 'data', 'mock-priv_validator_key.json'),
        privkeyDestPath
      )

      return { home, genesisPath: genesisDestPath }
    },

    run(blockOrTx) {
      let transactions = []
      let errors = []
      if (blockOrTx instanceof Array) {
        transactions = blockOrTx
      } else if (typeof blockOrTx === 'object') {
        transactions = [blockOrTx]
      }
      stateMachine.transition({ type: 'begin-block', data: [] })

      transactions.forEach(function(tx) {
        try {
          stateMachine.transition({ type: 'transaction', data: tx })
          errors.push(null)
        } catch (e) {
          errors.push(e.stack)
        }
      })
      stateMachine.transition({ type: 'block', data: [] })
      stateMachine.commit()
      this.height++
      return errors
    },
    save() {
      let state = parse(stringify(this.state))
      let context = parse(stringify(stateMachine.context()))

      let checkpoint: Checkpoint = { state, context, height: this.height }
      return checkpoint
    },
    load(checkpoint: Checkpoint) {
      stateMachine = app.compile({ initialState: checkpoint.state })
      this.height = checkpoint.height
      stateMachine.initialize(checkpoint.state, checkpoint.context, true)
    },
    get state() {
      return stateMachine.query()
    },
    ...app
  }
}
MockedLotion.connect = mockedConnect

export = MockedLotion
