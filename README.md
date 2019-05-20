# Lotion Mock

A simple utility to make it easier to write unit tests for Lotion applications.

## Usage

```
$ npm install lotion-mock
```

```js
let lotion = require('lotion-mock')

let app = lotion({
  initialState: {
    count: 0
  }
})

app.use(function(state, transaction) {
  if (transaction.nonce === state.count) {
    state.count++
  }
})

app.start()

let checkpoint = app.save()
// A block of transactions:
app.run([{ nonce: 0 }, { nonce: 1 }])
console.log(app.state.count) // 2

// Roll back to checkpoint:
app.load(checkpoint)

// Run a single transaction:
app.run({ nonce: 0 })
console.log(app.state.count) // 1

// Also features a mocked light client:
async function main() {
  let { state, send } = await lotion.connect(app)
  console.log(await state.count) // 1
  console.log(await send({ nonce: 1 })) // { ok: true, log: '', height: '2'}
  console.log(await state.count) // 2
}

main()
```

Check out a longer usage example [here.](https://github.com/nomic-io/lotion-mock/blob/master/test/counter.js)
