export const toPascalCase = (value: string) =>
  value
    .replace(/[-_ ]+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

export const generateInitials = (name = ''): string => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export const abbreviatedNumber = (val: number) => {
  const s = ['', 'k', 'm', 'b', 't']
  if (val === 0) return '0'
  if (val < 1000) return String(val)
  const sNum = Math.floor(Math.log10(val) / 3)
  let sVal = parseFloat((val / Math.pow(1000, sNum)).toPrecision(2))
  if (sVal % 1 !== 0) {
    sVal = Math.round(sVal)
  }
  return String(sVal) + s[sNum]
}
