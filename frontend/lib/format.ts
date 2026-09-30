const formatter = new Intl.NumberFormat("en-IN");

export function fmt(n: number): string {
  return formatter.format(Math.round(n));
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
