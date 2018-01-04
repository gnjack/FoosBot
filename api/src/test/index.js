import tape from 'tape-async'
import addAssertions from 'extend-tape'
import sinon from 'sinon'

const sinonAssertions = {}
Object.keys(sinon.assert).forEach((method) => {
  if (/(call|threw)/i.test(method)) {
    sinonAssertions[method] = function (...args) {
      sinon.assert.pass = this.pass.bind(this)
      sinon.assert[method].apply(this, args)
    }
  }
})

sinon.spy(console, 'error')
tape.onFinish(() => console.error.restore())

export default addAssertions(tape, {
  textResponse (response, message) {
    this.equal(response.message_format, 'text')
    this.equal(response.message, message)
  },
  htmlResponse (response, message) {
    this.equal(response.message_format, 'html')
    this.equal(response.message, message)
  },
  end (...args) {
    this.notCalled(console.error)
    console.error.reset()
    Object.getPrototypeOf(this).end.apply(this, args)
  },
  ...sinonAssertions
})
