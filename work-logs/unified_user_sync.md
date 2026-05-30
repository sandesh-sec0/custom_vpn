# Implementation Plan - Custom SSL VPN Integration

This plan outlines the steps to achieve **Unified User Sync** and **VPN Push Notifications**, bridging the gap between the administration dashboard and the VPN core.

## Proposed Changes

### 1. Configuration & Constants

#### [MODIFY] [config.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_backend/app/config.py)
- Add `vpn_users_json_path` to [Settings](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_backend/app/config.py#11-57) class to point to the [server_users.json](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/server_users.json) file.
- Resolve the path relative to the project root.

### 2. Unified User Sync

#### [NEW] [vpn_user_sync_service.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_backend/app/services/vpn_user_sync_service.py)
- Implement `sync_user_to_vpn(username, password)`.
- Use `hashlib.pbkdf2_hmac` with parameters matching [AuthManager](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/auth.py#61-379) (SHA256, 100k iterations, 32-byte salt).
- Implement atomic JSON write to [server_users.json](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/server_users.json).

#### [MODIFY] [user_service.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_backend/app/services/user_service.py)
- Import `sync_user_to_vpn`.
- Call it inside [create_user](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_backend/app/services/user_service.py#16-78) and [change_password](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_backend/app/routes/auth.py#138-167).

### 3. VPN Push Notifications

#### [NEW] [vpn_events.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_backend/app/routes/vpn_events.py)
- Define FastAPI routes for `/vpn-events/session-start` and `/vpn-events/session-stop`.
- These endpoints will update the database state for sessions immediately.

#### [MODIFY] [main.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_backend/app/main.py)
- Include the `vpn_events` router.

#### [MODIFY] [session.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/session.py)
- Implement a `PushNotifier` class that sends HTTP POST requests to the backend.
- Call `notifier.notify_start(session)` in [authenticate_session](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/session.py#220-239).
- Call `notifier.notify_stop(session)` in [remove_session](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/session.py#252-264).

## Verification Plan

### Automated Tests
- Run existing VPN tests to ensure no regressions:
  ```bash
  python _custom_ssl_vpn/tests/run_all.py
  ```

### Manual Verification
1. **User Sync**:
   - Create a new user via the Dashboard UI.
   - Verify the user appears in [server_users.json](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/server_users.json) with a valid-looking hash/salt.
   - Attempt to connect using the VPN client with the new credentials.
2. **Password Change**:
   - Change the user's password in the Dashboard.
   - Verify the hash in [server_users.json](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/server_users.json) changes.
   - Verify the user can log in with the new password and NOT the old one.
3. **Session Real-time Sync**:
   - Connect a VPN client.
   - Check the Dashboard "Sessions" page. It should update instantly (or much faster than the 5s poll) if push is working.
   - Disconnect the client and verify the session status updates to "Closed" in the dashboard.
