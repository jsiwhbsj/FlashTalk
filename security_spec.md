# FlashTalk Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: Unmatched paths (`/{document=**}`) deny all reads and writes unconditionally.
2. **PII Isolation**: Sensitive user fields (`email`, `recoveryAnswer`, `passcode`) are isolated under `/users/{userId}/private/{docId}` and strictly accessible only when `request.auth.uid == userId`.
3. **Identity Integrity**: Every created document (`UserPublicProfile`, `ChatMessage`, `FriendRequest`, `AbuseReport`) must bind its author/owner field (`id`, `ownerId`, `sender`, `fromUserId`, `reporterId`) strictly to `request.auth.uid`.
4. **Path Variable Hardening**: Every single-document ID variable (`userId`, `docId`, `roomId`, `messageId`, `requestId`, `reportId`) is validated with `isValidId(id)` (`<= 128` chars, regex `^[a-zA-Z0-9_\-]+$`).
5. **Strict Key & Size Enforcement**: Every string is bounded by explicit `.size()` limits, and `data.keys().hasAll(...)` + `data.keys().hasOnly(...)` prevent shadow/ghost fields.
6. **Terminal State Locking**: Once a `FriendRequest` reaches `'accepted'` or `'declined'`, no further updates are permitted.

## 2. The "Dirty Dozen" Payloads
1. **Shadow Field Injection on User Profile**: `{ id: "u1", uid: "12345678", name: "Alice", username: "alice", avatar: "AL", online: true, lastSeenTime: 100, isAdmin: true }` -> Rejected by `hasOnly`.
2. **Identity Spoofing on Message Creation**: `{ id: "m1", roomId: "r1", sender: "victim_uid", senderName: "Spoofer", text: "Hello", timestamp: 100, seen: false }` -> Rejected because `sender != request.auth.uid`.
3. **Cross-User Private Info Read**: User `attacker_uid` attempts `get(/users/victim_uid/private/info)` -> Rejected by `isOwner(userId)`.
4. **Oversized String DoS**: `text` with `10000` characters on `ChatMessage` -> Rejected by `data.text.size() <= 5000`.
5. **ID Poisoning Attack**: Document ID containing spaces or special characters (`user$123!`) -> Rejected by `isValidId()`.
6. **Unverified Email Write**: Authenticated user with `email_verified == false` attempting profile write -> Rejected by `isVerifiedUser()`.
7. **Terminal State Re-opening on FriendRequest**: Attempting to change `status` from `'accepted'` back to `'pending'` -> Rejected by terminal state lock `existing().status == 'pending'`.
8. **Unauthorized FriendRequest Acceptance**: Sender (`fromUserId`) attempting to accept their own friend request -> Rejected because only recipient (`toUserId == request.auth.uid`) can update status.
9. **Immutable Field Mutation on Message Update**: Attempting to mutate `sender` or `roomId` during message edit -> Rejected by immutability check.
10. **Blanket List Scraping on FriendRequests**: Listing `/friendRequests` without filtering by `fromUserId == request.auth.uid || toUserId == request.auth.uid` -> Rejected by query enforcer.
11. **Report Deletion Attempt**: Attempting to delete an abuse report after submission -> Rejected (`allow delete: if false`).
12. **Value Poisoning on Update**: Updating `online` field with a string `"yes"` instead of `bool` -> Rejected by `isValidUserPublicProfile(incoming())` wrapper in `allow update`.
