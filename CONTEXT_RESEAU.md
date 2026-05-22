# Connexion Mobile — Réseau & Environnement

## Configuration Actuelle (22/05/2026)

| Élément | Valeur |
|---|---|
| IP PC (Wi-Fi) | `172.20.10.4` |
| Passerelle hotspot | `172.20.10.1` |
| Port API backend | `3000` |
| Port Expo Metro | `8081` |
| Port admin web | `3001` |
| DB Postgres | `127.0.0.1:5433` |

## Fichiers .env

### `apps/native/.env`
```
EXPO_PUBLIC_SERVER_URL=http://172.20.10.4:3000
```

### `apps/server/.env`
```
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5433/app
BETTER_AUTH_SECRET=dzHLWhUzJrtWDl4aw3OPP5eh3VGzumHB
BETTER_AUTH_URL=http://localhost:3000/api/auth
CORS_ORIGIN=http://localhost:8081,http://localhost:3001,http://127.0.0.1:3001,http://localhost:19006,http://192.168.100.79:8081,http://192.168.100.79:3001,http://172.20.10.4:8081,http://172.20.10.4:3001
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=dacxcqfu3
CLOUDINARY_API_KEY=898637388813894
CLOUDINARY_API_SECRET=P4I1n4Lazrj-MvU1TDZByNKBU2M
RESEND_API_KEY=re_Kxayq6zJ_9cvdmf6U9WhjmcXHN5x5J2gN
RESEND_FROM_EMAIL=nj_sid@esi.dz
SEED_OWNER_EMAIL=nj_sid@esi.dz
SEED_OWNER_PASSWORD=Jamyl23032006
SEED_OWNER_NAME=Joumla Owner
```

## Problème QR Code / 4G

Le QR Expo ne fonctionne pas quand le même téléphone partage sa 4G et scanne le QR. Solutions :

1. **Routeur Wi-Fi** (recommandé) : connecter PC et téléphone au même routeur, mettre à jour `EXPO_PUBLIC_SERVER_URL` avec l'IP locale
2. **Tunnel Expo** :
   ```bash
   cd app/apps/native
   bunx expo start --tunnel
   ```
3. **Deuxième téléphone** : connecter le second téléphone au hotspot du premier
4. **USB** : `adb reverse tcp:3000 tcp:3000` + `adb reverse tcp:8081 tcp:8081`

**Important** : si le réseau change, il faut :
- Mettre à jour `EXPO_PUBLIC_SERVER_URL` dans `apps/native/.env`
- Ajouter la nouvelle IP à `CORS_ORIGIN` dans `apps/server/.env`
- Redémarrer le serveur ET Expo (le .env natif est lu au démarrage de Metro)

## Vérification Rapide

Depuis le navigateur du téléphone :
```
http://172.20.10.4:3000    → doit répondre "OK"
http://172.20.10.4:8081    → doit répondre (status Expo)
```

## Pare-feu Windows

Règles nécessaires (déjà créées) :
- Port 3000 (API)
- Port 8081 (Expo Metro)
