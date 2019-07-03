import StateMachine from 'lotion-state-machine'
import { stringify, parse } from 'deterministic-json'
import mockedConnect from './connect'
import get = require('lodash.get')
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
    start(port?: number) {
      stateMachine = app.compile(opts.initialState)
      stateMachine.initialize()
      if (port) {
        let expressApp = express()
        expressApp.use(cors())
        expressApp.use(bodyParser.json())

        expressApp.post('/txs', (req, res) => {
          let tx = req.body
          res.json({ errors: this.run(tx), height: this.height })
        })

        expressApp.get('/state', (req, res) => {
          let statePart = req.query.path
            ? get(this.state, req.query.path)
            : this.state
          res.json(statePart)
        })

        this.httpServer = expressApp.listen(port)
      }
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
          errors.push(e.message)
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
