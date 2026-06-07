# Invite Flow Design

## Scope

Implement a real invite flow for the Telegram Mini App using the existing Prisma models:

- users can create an invite link for their household;
- a second Telegram user can open the app through the invite link;
- the invited user joins the inviter's household only if they are not already in any household;
- users who already belong to a household cannot join another household through an invite.

This spec does not move recipes, meal planning, or shopping list state to full backend persistence. It only establishes authenticated users, households, and household membership.

## Product Behavior

On authenticated Mini App launch:

- the server upserts the Telegram user;
- if the user already belongs to a household, that household is returned;
- if the user has no household and launched with an invite token, the server accepts the invite and creates a `HouseholdMember` with role `member`;
- if the user has no household and no invite token, the server creates a new household named `Наша кухня` and creates a `HouseholdMember` with role `owner`;
- if the user already belongs to a household and launched with someone else's invite token, the server does not accept the invite and returns the existing household plus a clear warning.

Invites are one-time use and expire after 7 days. An accepted, revoked, expired, or missing invite cannot be accepted.

## API Design

### `POST /api/auth/telegram`

Authenticates Telegram init data from the `Authorization: tma <initData>` header.

Request body:

```json
{
  "inviteToken": "optional-token"
}
```

Response:

```json
{
  "user": {
    "id": "user-id",
    "telegramId": "123"
  },
  "household": {
    "id": "household-id",
    "name": "Наша кухня",
    "role": "owner"
  },
  "inviteStatus": "accepted | ignored_existing_household | invalid | expired | none"
}
```

### `POST /api/invites`

Authenticates the current Telegram user and requires an existing household membership.

Creates a new active invite for the current household with a 7-day expiry. The route returns a share URL and the raw token.

Response:

```json
{
  "invite": {
    "token": "invite-token",
    "expiresAt": "2026-06-14T00:00:00.000Z",
    "url": "https://t.me/<bot>/<app>?startapp=<invite-token>"
  }
}
```

`NEXT_PUBLIC_APP_URL` remains the fallback base URL if Telegram deep-link settings are incomplete.

## UI Design

Add a compact invite section to the app header:

- show current household name when authenticated;
- show an invite button;
- on button press, call `POST /api/invites`;
- copy the returned link to clipboard when possible;
- display a short success or error message.

On startup, the app reads invite token from Telegram `start_param` when available and from `?invite=` as fallback. It posts the token to `/api/auth/telegram`.

If the app is opened outside Telegram or Telegram auth fails, keep demo mode usable and show a small "demo mode" status instead of blocking the app.

## Data Rules

- `User.telegramId` remains unique.
- A user can only join the first household found through `HouseholdMember`.
- Accepting an invite and creating the member happen in one Prisma transaction.
- The invite is marked `accepted` with `acceptedByUserId` and `acceptedAt` after successful membership creation.
- Expired active invites are treated as invalid for acceptance and may be marked `expired` during acceptance.

## Error Handling

- Missing Telegram auth: return `401` from protected API routes.
- User already in household: do not mutate invite, return current household and `ignored_existing_household`.
- Invalid token: return `inviteStatus: "invalid"` for auth launch, or `404`/`400` for invite-specific acceptance errors.
- Expired token: mark expired when encountered and return `inviteStatus: "expired"`.

## Tests

Add focused tests for invite service logic:

- creates household for first user without invite;
- creates invite for existing household member;
- accepts active invite for a user without household;
- rejects invite for a user already in a household;
- rejects expired invite.

Add a light UI test for the invite button rendering and copied-link status if practical without over-mocking Telegram SDK.
