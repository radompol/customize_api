export function buildLookbackWindows(series: number[], lookback: number) {
  const inputs: number[][] = [];
  const outputs: number[] = [];

  for (let index = lookback; index < series.length; index += 1) {
    inputs.push(series.slice(index - lookback, index));
    outputs.push(series[index]);
  }

  return { inputs, outputs };
}
