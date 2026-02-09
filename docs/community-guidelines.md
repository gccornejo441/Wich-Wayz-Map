# Community Guidelines

Last updated: February 9, 2026

## Policy Scope

These guidelines define moderation policy for user-generated listing content in Wich Wayz Map.

In scope:

- Shop submissions and edits
- Location updates (address, coordinates, open/closed status)
- Duplicate and spam reports
- Public listing metadata and discoverability state

## Report Reasons (Exact)

Reports must use one of these reason keys:

- `spam`
- `wrong_location`
- `closed`
- `duplicate`

## Moderator Outcomes

Standard moderator outcomes:

- `action_taken`: report confirmed and mapped moderation action applied.
- `no_action_needed`: report reviewed but not supported by available evidence.
- `needs_more_information`: report lacks detail and needs additional evidence.

For the four reasons above, the default confirmed outcome is `action_taken`.

## Reason-to-Action Mapping

| Report reason    | Moderator action(s)                |
| ---------------- | ---------------------------------- |
| `spam`           | `hide_shop`, `unlist_shop`         |
| `wrong_location` | `update_location_data`             |
| `closed`         | `update_location_status`           |
| `duplicate`      | `mark_canonical`, `hide_duplicate` |

## Enforcement Notes

- `hide_shop` and `unlist_shop` should remove spam from public discovery while preserving auditability.
- `update_location_data` should apply corrected address/coordinates based on verifiable evidence.
- `update_location_status` should update location state (for example, permanently closed).
- `mark_canonical` + `hide_duplicate` should preserve one authoritative listing and suppress duplicates.

## Implementation Scope (0.5-1 day)

- Publish this policy as internal documentation.
- Expose the same policy on a public app page.
- Reuse typed constants for report reasons, outcomes, and reason-to-action mappings so client and moderation tooling stay aligned.
