
const builder = {}
export default builder

for (let c of ['yellow', 'green', 'red', 'purple', 'gray', 'random']) {
  builder[c] = makeColoredBuilder(c)
}

function makeColoredBuilder (color) {
  return {
    text: (message) => ({
      message,
      message_format: 'text',
      color
    }),
    html: (message) => ({
      message,
      message_format: 'html',
      color
    })
  }
}
