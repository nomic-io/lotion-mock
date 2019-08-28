module.exports = function(wallaby) {
  return {
    env: {
      type: 'node',
      runner: 'node'
    },
    files: ['src/*', 'data/*'],
    tests: ['test/*.ts'],
    testFramework: 'ava',
    workers: {
      restart: true
    }
  }
}
