# Forecasting Notes

The first version uses a pragmatic hybrid approach:

- Preferred: `@tensorflow/tfjs` dense sequence model with configurable lookback windows.
- Fallback: moving slope projection when historical snapshots are too few or TensorFlow is unavailable.

Current defaults:

- lookback: `3`
- forecast periods: `3`

Confidence guidance:

- fewer than 4 snapshots: `Low historical depth`
- otherwise: `Forecast generated from readiness snapshots`
