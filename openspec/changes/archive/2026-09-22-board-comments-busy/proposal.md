## Why

Task comments already show busy state on every mutation, but board comments — built earlier under the same UX contract — still leave the user guessing while a request is in flight, inviting duplicate submits on slow networks. This change brings the board thread to parity.

## What Changes

- Board comment entry disables while the create request is in flight and shows an inline spinner; repeated Enter/click sends no duplicate request; failure restores the entry with its text plus the existing error message.
- Board comment rows track a busy comment id: a spinner renders on the row with its actions disabled while an edit or remove request is in flight; the shared `InlineEdit` is untouched.
- The remove dialog's YES disables with a spinner while the delete request is in flight; failure keeps the dialog open with the existing error message.
- No backend, API, or error-code changes.

## Capabilities

### New Capabilities

None. All behavior refines an existing capability.

### Modified Capabilities

- `frontend/boards`: board comments section gains busy state on create, edit, and remove.

## Impact

- Frontend only: `BoardDetailPage.tsx` (busy states) plus `BoardDetailPage.test.tsx` coverage.
