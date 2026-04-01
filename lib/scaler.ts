export function minMaxScale(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) {
    return {
      scaled: values.map(() => 0.5),
      invert: (_value: number) => min
    };
  }

  return {
    scaled: values.map((value) => (value - min) / (max - min)),
    invert: (value: number) => min + value * (max - min)
  };
}
