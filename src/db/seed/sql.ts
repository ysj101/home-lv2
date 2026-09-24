/** SQL 文字列リテラルとして安全に埋め込めるようクォートする。 */
export function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}
