
export const or = (list) => formatList(list, 'or')
export const and = (list) => formatList(list, 'and')

function formatList (list, orOrAnd) {
  if (list.length === 1) {
    return list[0]
  }
  const last = list.pop()
  const others = list.join(', ')
  return `${others} ${orOrAnd} ${last}`
}
