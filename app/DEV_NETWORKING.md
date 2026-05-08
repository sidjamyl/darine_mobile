# Local Mobile Networking

When running Expo Go on a physical phone while the API runs inside WSL, the phone cannot call `localhost:3000`. Use the Windows Wi-Fi IP and forward it to the WSL IP.

1. In WSL, get the WSL IP:

```bash
hostname -I
```

2. In Windows PowerShell opened as Administrator, configure the proxy:

```powershell
netsh interface portproxy add v4tov4 listenaddress=WINDOWS_WIFI_IP listenport=3000 connectaddress=WSL_IP connectport=3000
New-NetFirewallRule -DisplayName "Joumla API 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

3. Set the mobile API URL in `apps/native/.env`:

```env
EXPO_PUBLIC_SERVER_URL=http://WINDOWS_WIFI_IP:3000
```

4. Start the apps:

```bash
cd apps/server && bun run dev
cd apps/admin-web && bun run dev
cd apps/native && ./node_modules/.bin/expo start --clear
```

If the WSL IP changes after a reboot, delete and recreate the `portproxy` rule with the new WSL IP.
