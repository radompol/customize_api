# Readiness Formula

Requirement scoring combines:

- Document completion: 30%
- Compliance status: 25%
- Quality burden from revisions/comments: 20%
- Aging burden: 15%
- Timeline performance: 10%

If deadline data is absent, timeline weight is redistributed proportionally across the other components.

Current implementation details:

- `has_file` strongly affects completion.
- Approved/completed statuses map to high status scores.
- Pending statuses map to mid-range status scores.
- Revise/rejected statuses map to low status scores.
- More revisions, comments, aging days, and overdue days reduce the score.

Aggregations average requirement scores and derive readiness label, risk level, priority level, and warning flags.
